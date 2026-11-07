import type { Item, Place } from '../types/models';

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const normalize = (text: string) =>
  text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export function placePath(id: string | undefined, places: Place[]): string {
  const names: string[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const place = places.find((p) => p.id === id);
    if (!place) break;
    names.unshift(place.name);
    id = place.parentId;
  }
  return names.join(' › ');
}

export function validateParent(
  id: string,
  parentId: string | undefined,
  places: Place[],
) {
  const seen = new Set([id]);
  while (parentId) {
    if (seen.has(parentId)) throw new Error('A place cannot be inside itself.');
    seen.add(parentId);
    const parent = places.find((p) => p.id === parentId);
    if (!parent) throw new Error('That parent place no longer exists.');
    parentId = parent.parentId;
  }
}

export const locationLabel = (item: Item, places: Place[]) =>
  [placePath(item.placeId, places), item.exactSpot]
    .filter(Boolean)
    .join(' · ') || 'Location not recorded';

export function searchItems(
  items: Item[],
  places: Place[],
  query: string,
): Item[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  return items
    .filter((i) => !i.isArchived)
    .map((item) => {
      const name = normalize(item.name);
      const aliases = normalize(item.aliases.join(' '));
      const other = normalize(
        [
          item.description,
          item.category,
          ...item.tags,
          locationLabel(item, places),
        ].join(' '),
      );
      const matches = terms.every((term) =>
        `${name} ${aliases} ${other}`.includes(term),
      );
      const score = terms.reduce(
        (sum, term) =>
          sum +
          (name === term
            ? 100
            : name.startsWith(term)
              ? 50
              : name.includes(term)
                ? 25
                : aliases.includes(term)
                  ? 15
                  : 1),
        0,
      );
      return { item, score: matches ? score : -1 };
    })
    .filter((result) => result.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt),
    )
    .map((result) => result.item);
}
