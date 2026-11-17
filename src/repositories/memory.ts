import {
  emptyData,
  type Item,
  type ItemDraft,
  type MemoryData,
  type Place,
  type Settings,
  type QuickAccessRef,
  type LocationSnapshot,
} from '../types/models';
import type { StorageAdapter } from '../database/storage.types';
import { withDemo, organizeDemo } from '../database/demo';
import { newId, validateParent } from '../utils/memory';
import {
  cleanPosition,
  locationSnapshot,
  locationKey,
  locationDraft,
} from '../utils/locations';
import { validateBackupData, photoReferences } from '../utils/backup';
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
      const previousPhotos = new Set(photoReferences(this.data));
      const nextPhotos = new Set(photoReferences(draft));
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
  private saveDraft(data: MemoryData, draft: ItemDraft, id: string) {
    draft = { ...draft, exactSpot: cleanPosition(draft.exactSpot) };
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
    if (previous?.deletedAt)
      throw new Error('Restore this item from Trash before editing it.');
    const now = new Date().toISOString();
    const moved =
      !previous ||
      locationKey(locationSnapshot(previous, data.places)) !==
        locationKey(locationSnapshot(draft, data.places));
    const historyId = moved ? newId() : undefined;
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
        id: historyId!,
        previousLocation: previous
          ? locationSnapshot(previous, data.places)
          : undefined,
        newLocation: locationSnapshot(item, data.places),
        previousLocationUpdatedAt: previous?.locationUpdatedAt,
        itemId: id,
        previousPlaceId: previous?.placeId,
        previousSpot: previous?.exactSpot,
        newPlaceId: item.placeId,
        newSpot: item.exactSpot,
        changedAt: now,
      });
    return historyId;
  }
  async saveItem(draft: ItemDraft, id = newId()): Promise<string> {
    await this.mutate((data) => {
      this.saveDraft(data, draft, id);
    });
    return id;
  }
  async moveItem(
    id: string,
    destination: LocationSnapshot,
    expected: { updatedAt: string; key: string },
  ) {
    let historyId: string | undefined;
    await this.mutate((data) => {
      const item = data.items.find((item) => item.id === id);
      if (!item || item.deletedAt) throw new Error('This item is unavailable.');
      if (
        item.locationUpdatedAt !== expected.updatedAt ||
        locationKey(locationSnapshot(item, data.places)) !== expected.key
      )
        throw new Error(
          'The location changed while this screen was open. Reopen Move to use its latest location.',
        );
      historyId = this.saveDraft(
        data,
        { ...item, ...locationDraft(destination) },
        id,
      );
    });
    return { historyId, changed: !!historyId };
  }
  undoMove(itemId: string, historyId: string) {
    return this.mutate((data) => {
      const item = data.items.find((item) => item.id === itemId);
      const entry = data.history.find((entry) => entry.itemId === itemId);
      if (
        !item ||
        item.deletedAt ||
        !entry ||
        entry.id !== historyId ||
        !entry.previousLocation ||
        !entry.newLocation ||
        !entry.previousLocationUpdatedAt ||
        item.locationUpdatedAt !== entry.changedAt ||
        locationKey(locationSnapshot(item, data.places)) !==
          locationKey(entry.newLocation)
      )
        throw new Error(
          'Undo is no longer available because the location or history changed.',
        );
      if (
        entry.previousLocation.placeId &&
        !data.places.some(
          (place) => place.id === entry.previousLocation!.placeId,
        )
      )
        throw new Error('The previous place is unavailable.');
      Object.assign(item, locationDraft(entry.previousLocation), {
        locationUpdatedAt: entry.previousLocationUpdatedAt,
      });
      data.history = data.history.filter((history) => history.id !== historyId);
    });
  }
  deleteHistoryEntry(itemId: string, historyId: string) {
    return this.mutate((data) => {
      if (!data.items.some((item) => item.id === itemId))
        throw new Error('This item is unavailable.');
      data.history = data.history.filter(
        (entry) => !(entry.itemId === itemId && entry.id === historyId),
      );
    });
  }
  clearHistory(itemId: string) {
    return this.mutate((data) => {
      if (!data.items.some((item) => item.id === itemId))
        throw new Error('This item is unavailable.');
      data.history = data.history.filter((entry) => entry.itemId !== itemId);
    });
  }

  updateItem(
    id: string,
    patch: Partial<Pick<Item, 'isFavorite' | 'isArchived'>>,
  ) {
    return this.mutate((data) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) throw new Error('This item no longer exists.');
      if (item.deletedAt)
        throw new Error('Restore this item from Trash first.');
      Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    });
  }
  trashItem(id: string) {
    return this.mutate((data) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) throw new Error('This item no longer exists.');
      item.deletedAt ??= new Date().toISOString();
    });
  }
  restoreItem(id: string) {
    return this.mutate((data) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) throw new Error('This item no longer exists.');
      delete item.deletedAt;
    });
  }
  emptyTrash() {
    return this.mutate((data) => {
      const ids = new Set(
        data.items.filter((i) => i.deletedAt).map((i) => i.id),
      );
      data.items = data.items.filter((i) => !ids.has(i.id));
      data.history = data.history.filter((h) => !ids.has(h.itemId));
    });
  }
  deleteItem(id: string) {
    return this.mutate((data) => {
      data.items = data.items.filter((i) => i.id !== id);
      data.history = data.history.filter((h) => h.itemId !== id);
    });
  }
  async savePlace(
    name: string,
    parentId?: string,
    id = newId(),
    icon?: string,
  ) {
    await this.mutate((data) => {
      if (!name.trim()) throw new Error('Give your place a name.');
      validateParent(id, parentId, data.places);
      const old = data.places.find((p) => p.id === id);
      const now = new Date().toISOString();
      const place: Place = {
        ...old,
        id,
        name: name.trim(),
        icon: icon === undefined ? old?.icon : icon || undefined,
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
      if (item.deletedAt)
        throw new Error('Restore this item from Trash before duplicating it.');
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
        newLocation: locationSnapshot(item, data.places),
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
  async saveFolder(
    name: string,
    parentId?: string,
    id = newId(),
    icon?: string,
  ) {
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
          icon: icon === undefined ? old?.icon : icon || undefined,
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
  organizeSamples() {
    return this.mutate((data) => {
      Object.assign(data, organizeDemo(data));
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
