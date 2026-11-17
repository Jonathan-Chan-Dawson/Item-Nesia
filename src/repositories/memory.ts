import {
  emptyData,
  type Item,
  type ItemDraft,
  type MemoryData,
  type Place,
  type Settings,
  type QuickAccessRef,
} from '../types/models';
import type { StorageAdapter } from '../database/storage.types';
import { withDemo } from '../database/demo';
import { newId, validateParent } from '../utils/memory';
import { validateBackupData } from '../utils/backup';
import { normalizeSettings } from '../utils/preferences';

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
    this.data.folders ??= [];
    this.data.settings = normalizeSettings(this.data.settings, this.data);
    this.publish(this.data);
  }
  private mutate(change: (draft: MemoryData) => void) {
    const pending = this.queue.then(async () => {
      const draft: MemoryData = JSON.parse(JSON.stringify(this.data));
      change(draft);
      draft.settings = normalizeSettings(draft.settings, draft);
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
      if (
        draft.folderId &&
        !data.folders.some((folder) => folder.id === draft.folderId)
      )
        throw new Error('That folder no longer exists.');
      const pin = [draft.locationPinX, draft.locationPinY];
      if (
        pin.some((v) => v !== undefined) &&
        (!draft.locationPhotoUri ||
          pin.some(
            (v) => v === undefined || !Number.isFinite(v) || v < 0 || v > 1,
          ))
      )
        throw new Error('Choose a valid spot on the location photo.');
      const previous = data.items.find((item) => item.id === id);
      const now = new Date().toISOString();
      const moved =
        !previous ||
        previous.placeId !== draft.placeId ||
        previous.exactSpot !== draft.exactSpot ||
        previous.locationPhotoUri !== draft.locationPhotoUri ||
        previous.locationPinX !== draft.locationPinX ||
        previous.locationPinY !== draft.locationPinY;
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
  toggleShortcut(ref: QuickAccessRef) {
    return this.mutate((data) => {
      const current = data.settings.quickAccess;
      if (current.some((item) => item.kind === ref.kind && item.id === ref.id))
        data.settings.quickAccess = current.filter(
          (item) => item.kind !== ref.kind || item.id !== ref.id,
        );
      else {
        if (current.length >= 4)
          throw new Error(
            'Quick Access has four shortcuts. Remove one in Settings first.',
          );
        data.settings.quickAccess.push(ref);
      }
    });
  }
  duplicateItem(id: string) {
    let duplicateId = '';
    return this.mutate((data) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) throw new Error('This item no longer exists.');
      duplicateId = newId();
      const now = new Date().toISOString();
      data.items.push({
        ...item,
        id: duplicateId,
        name: `${item.name} (copy)`,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        locationUpdatedAt: now,
      });
      data.history.unshift({
        id: newId(),
        itemId: duplicateId,
        newPlaceId: item.placeId,
        newSpot: item.exactSpot,
        changedAt: now,
      });
    }).then(() => duplicateId);
  }
  async snapshot(): Promise<MemoryData> {
    await this.queue;
    return JSON.parse(JSON.stringify(this.data));
  }
  replace(data: MemoryData) {
    const checked = validateBackupData(data);
    return this.mutate((draft) => {
      Object.assign(draft, JSON.parse(JSON.stringify(checked)));
    });
  }
  async saveFolder(name: string, parentId?: string, id = newId()) {
    await this.mutate((data) => {
      if (!name.trim()) throw new Error('Give your folder a name.');
      const seen = new Set([id]);
      let parent = parentId;
      while (parent) {
        if (seen.has(parent))
          throw new Error('A folder cannot be inside itself.');
        seen.add(parent);
        const folder = data.folders.find((f) => f.id === parent);
        if (!folder) throw new Error('The parent folder no longer exists.');
        parent = folder.parentId;
      }
      const old = data.folders.find((f) => f.id === id);
      const now = new Date().toISOString();
      data.folders = [
        ...data.folders.filter((f) => f.id !== id),
        {
          id,
          name: name.trim(),
          parentId,
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
        },
      ];
    });
    return id;
  }
  deleteFolder(id: string) {
    return this.mutate((data) => {
      const folder = data.folders.find((f) => f.id === id);
      if (!folder) throw new Error('This folder no longer exists.');
      for (const item of data.items)
        if (item.folderId === id) item.folderId = folder.parentId;
      for (const child of data.folders)
        if (child.parentId === id) child.parentId = folder.parentId;
      data.folders = data.folders.filter((f) => f.id !== id);
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
