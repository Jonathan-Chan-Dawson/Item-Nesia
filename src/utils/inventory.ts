import type { Category, Item, MemoryData } from '../types/models';
import { containsPlace, searchItems } from './memory';
import { inFolder } from './folders';
export interface InventoryQuery {
  text: string;
  view: 'all' | 'favorites' | 'archived';
  category?: Category | 'uncategorized';
  placeId?: string;
  folderId?: string | 'unfiled';
  includeDescendants: boolean;
  sort: 'relevance' | 'recent' | 'moved' | 'name' | 'oldest';
  layout: 'grid' | 'list';
}
export const recordedAt = (item: Item) =>
  item.locationUpdatedAt > item.createdAt
    ? item.locationUpdatedAt
    : item.createdAt;
export function queryInventory(
  data: MemoryData,
  query: InventoryQuery,
): Item[] {
  const candidates = data.items.filter((item) => {
    if (query.view === 'archived' ? !item.isArchived : item.isArchived)
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
        : query.includeDescendants
          ? !inFolder(item.folderId, query.folderId, data.folders)
          : item.folderId !== query.folderId)
    )
      return false;
    if (
      query.placeId &&
      (query.includeDescendants
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
    query.view === 'archived',
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
