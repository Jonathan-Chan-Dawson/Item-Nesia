import type { Category, Item, MemoryData } from '../types/models';
import { containsPlace, searchItems, placePath } from './memory';
import { folderPath, inFolder } from './folders';
export interface InventoryQuery {
  text: string;
  view: 'all' | 'favorites' | 'archived' | 'trash';
  category?: Category | 'uncategorized';
  placeId?: string;
  folderId?: string | 'unfiled';
  includeDescendants: boolean;
  includeSubplaces?: boolean;
  includeSubfolders?: boolean;
  sort: 'relevance' | 'recent' | 'moved' | 'name' | 'oldest';
  layout: 'grid' | 'list';
}
export const recordedAt = (item: Item) =>
  item.locationUpdatedAt > item.createdAt
    ? item.locationUpdatedAt
    : item.createdAt;
export function homeSections(items: Item[], columns: number) {
  const active = items
    .filter((item) => !item.isArchived && !item.deletedAt)
    .sort(
      (a, b) =>
        recordedAt(b).localeCompare(recordedAt(a)) || a.id.localeCompare(b.id),
    );
  const starred = active
    .filter((item) => item.isFavorite)
    .slice(0, Math.max(1, columns) * 2);
  const shown = new Set(starred.map((item) => item.id));
  return {
    starred,
    recent: active.filter((item) => !shown.has(item.id)).slice(0, 8),
    activeCount: active.length,
  };
}
export function queryInventory(
  data: MemoryData,
  query: InventoryQuery,
): Item[] {
  const candidates = data.items.filter((item) => {
    if (query.view === 'trash' ? !item.deletedAt : !!item.deletedAt)
      return false;
    if (
      query.view !== 'trash' &&
      (query.view === 'archived' ? !item.isArchived : item.isArchived)
    )
      return false;
    if (query.view === 'favorites' && !item.isFavorite) return false;
    if (
      query.category &&
      (query.category === 'uncategorized'
        ? !!item.category
        : item.category !== query.category)
    )
      return false;
    if (
      query.folderId &&
      (query.folderId === 'unfiled'
        ? !!item.folderId
        : (query.includeSubfolders ?? query.includeDescendants)
          ? !inFolder(item.folderId, query.folderId, data.folders)
          : item.folderId !== query.folderId)
    )
      return false;
    if (
      query.placeId &&
      ((query.includeSubplaces ?? query.includeDescendants)
        ? !containsPlace(item.placeId, query.placeId, data.places)
        : item.placeId !== query.placeId)
    )
      return false;
    return true;
  });
  const results = searchItems(
    candidates,
    data.places,
    query.text,
    data.folders,
    query.view === 'archived' || query.view === 'trash',
  );
  if (query.sort === 'relevance' && query.text.trim()) return results;
  return results.sort(
    (a, b) =>
      (query.sort === 'name'
        ? a.name.localeCompare(b.name)
        : query.sort === 'oldest'
          ? a.createdAt.localeCompare(b.createdAt)
          : query.sort === 'moved'
            ? b.locationUpdatedAt.localeCompare(a.locationUpdatedAt)
            : b.createdAt.localeCompare(a.createdAt)) ||
      a.id.localeCompare(b.id),
  );
}

export type GroupBy = 'items' | 'folders' | 'places' | 'categories';
export function groupInventory(items: Item[], data: MemoryData, by: GroupBy) {
  const groups = new Map<
    string,
    { id: string; label: string; items: Item[] }
  >();
  for (const item of items) {
    const id =
      by === 'folders'
        ? (item.folderId ?? 'unfiled')
        : by === 'places'
          ? (item.placeId ?? 'exact')
          : by === 'categories'
            ? (item.category ?? 'uncategorized')
            : 'items';
    const label =
      by === 'folders'
        ? folderPath(item.folderId, data.folders) || 'Unfiled'
        : by === 'places'
          ? placePath(item.placeId, data.places) || 'Exact spot only'
          : by === 'categories'
            ? item.category || 'Uncategorized'
            : 'Items';
    if (!groups.has(id)) groups.set(id, { id, label, items: [] });
    groups.get(id)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
export function randomItem(
  items: Item[],
  previousId?: string,
  random = Math.random,
): Item | undefined {
  const active = items.filter((item) => !item.deletedAt && !item.isArchived);
  const pool =
    active.length > 1
      ? active.filter((item) => item.id !== previousId)
      : active;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
