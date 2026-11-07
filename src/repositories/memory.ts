import {
  emptyData,
  type Item,
  type ItemDraft,
  type MemoryData,
  type Place,
  type Settings,
} from '../types/models';
import type { StorageAdapter } from '../database/storage.types';
import { withDemo } from '../database/demo';
import { newId, validateParent } from '../utils/memory';

/** Serializes all mutations and publishes only after durable storage succeeds. */
export class MemoryRepository {
  private data = emptyData();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private adapter: StorageAdapter,
    private publish: (data: MemoryData) => void,
    private removePhoto?: (uri: string) => Promise<void>,
  ) {}
  async initialize() {
    this.data = await this.adapter.load();
    this.publish(this.data);
  }
  private mutate(change: (draft: MemoryData) => void) {
    const pending = this.queue.then(async () => {
      const draft: MemoryData = JSON.parse(JSON.stringify(this.data));
      change(draft);
      await this.adapter.save(draft);
      const photos = (value: MemoryData) =>
        new Set(
          [
            ...value.items.flatMap((i) => [i.photoUri, i.locationPhotoUri]),
            ...value.places.map((p) => p.coverPhotoUri),
          ].filter((uri): uri is string => !!uri),
        );
      const previousPhotos = photos(this.data);
      const nextPhotos = photos(draft);
      this.data = draft;
      this.publish(draft);
      // Shared references remain intact. A cleanup failure must not undo a durable save.
      if (this.removePhoto)
        await Promise.allSettled(
          [...previousPhotos]
            .filter((uri) => !nextPhotos.has(uri))
            .map((uri) => this.removePhoto!(uri)),
        );
    });
    this.queue = pending.catch(() => {});
    return pending;
  }
  async saveItem(draft: ItemDraft, id = newId()): Promise<string> {
    await this.mutate((data) => {
      if (!draft.name.trim()) throw new Error('Give your item a name.');
      if (!draft.placeId && !draft.exactSpot?.trim())
        throw new Error('Choose a place or describe the exact spot.');
      if (draft.placeId && !data.places.some((p) => p.id === draft.placeId))
        throw new Error('That place no longer exists. Choose another.');
      const previous = data.items.find((item) => item.id === id);
      const now = new Date().toISOString();
      const moved =
        !previous ||
        previous.placeId !== draft.placeId ||
        previous.exactSpot !== draft.exactSpot ||
        previous.locationPhotoUri !== draft.locationPhotoUri;
      const item: Item = {
        ...previous,
        ...draft,
        id,
        name: draft.name.trim(),
        isFavorite: previous?.isFavorite ?? false,
        isArchived: previous?.isArchived ?? false,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        locationUpdatedAt: moved ? now : previous.locationUpdatedAt,
      };
      data.items = [...data.items.filter((i) => i.id !== id), item];
      if (moved)
        data.history.unshift({
          id: newId(),
          itemId: id,
          previousPlaceId: previous?.placeId,
          previousSpot: previous?.exactSpot,
          newPlaceId: item.placeId,
          newSpot: item.exactSpot,
          changedAt: now,
        });
    });
    return id;
  }
  updateItem(
    id: string,
    patch: Partial<Pick<Item, 'isFavorite' | 'isArchived'>>,
  ) {
    return this.mutate((data) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) throw new Error('This item no longer exists.');
      Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    });
  }
  deleteItem(id: string) {
    return this.mutate((data) => {
      data.items = data.items.filter((i) => i.id !== id);
      data.history = data.history.filter((h) => h.itemId !== id);
    });
  }
  async savePlace(name: string, parentId?: string, id = newId()) {
    await this.mutate((data) => {
      if (!name.trim()) throw new Error('Give your place a name.');
      validateParent(id, parentId, data.places);
      const old = data.places.find((p) => p.id === id);
      const now = new Date().toISOString();
      const place: Place = {
        ...old,
        id,
        name: name.trim(),
        parentId,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      data.places = [...data.places.filter((p) => p.id !== id), place];
    });
    return id;
  }
  settings(patch: Partial<Settings>) {
    return this.mutate((data) => {
      Object.assign(data.settings, patch);
    });
  }
  seedDemo() {
    return this.mutate((data) => {
      Object.assign(data, withDemo(data));
    });
  }
  clear() {
    return this.mutate((data) => {
      Object.assign(data, emptyData(), {
        settings: { ...data.settings, demoInitialized: false },
      });
    });
  }
}
