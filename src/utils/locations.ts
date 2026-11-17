import type {
  Item,
  ItemDraft,
  LocationSnapshot,
  MemoryData,
  Place,
} from '../types/models';
import { placePath } from './memory';
export const cleanPosition = (value?: string) =>
  value?.trim().replace(/\s+/g, ' ') || undefined;
export function locationSnapshot(
  item: Pick<
    ItemDraft,
    | 'placeId'
    | 'exactSpot'
    | 'locationPhotoUri'
    | 'locationPinX'
    | 'locationPinY'
  >,
  places: Place[],
): LocationSnapshot {
  return {
    placeId: item.placeId || undefined,
    path: placePath(item.placeId, places),
    position: cleanPosition(item.exactSpot),
    photoUri: item.locationPhotoUri || undefined,
    pinX: item.locationPinX,
    pinY: item.locationPinY,
  };
}
export function locationKey(value: LocationSnapshot) {
  return JSON.stringify([
    value.placeId || '',
    cleanPosition(value.position) || '',
    value.photoUri || '',
    value.pinX ?? null,
    value.pinY ?? null,
  ]);
}
export function locationDraft(value: LocationSnapshot) {
  return {
    placeId: value.placeId,
    exactSpot: value.position,
    locationPhotoUri: value.photoUri,
    locationPinX: value.pinX,
    locationPinY: value.pinY,
  };
}
export const snapshotLabel = (value: LocationSnapshot) =>
  [value.path, value.position].filter(Boolean).join(' · ') ||
  'Choose a location';
export function changePlace(
  previous: LocationSnapshot,
  placeId: string | undefined,
  places: Place[],
): LocationSnapshot {
  return placeId === previous.placeId
    ? previous
    : { placeId, path: placePath(placeId, places) };
}
export function suggestedDestinations(data: MemoryData, item?: Item) {
  const map = new Map<
    string,
    {
      snapshot: LocationSnapshot;
      recent: string;
      frequency: number;
      similar: boolean;
    }
  >();
  function add(snapshot: LocationSnapshot, recent: string, similar: boolean) {
    if (
      (!snapshot.placeId && !snapshot.position) ||
      (snapshot.placeId &&
        !data.places.some((place) => place.id === snapshot.placeId))
    )
      return;
    const key = locationKey(snapshot);
    const old = map.get(key);
    map.set(key, {
      snapshot: { ...snapshot, path: placePath(snapshot.placeId, data.places) },
      recent: old && old.recent > recent ? old.recent : recent,
      frequency: (old?.frequency ?? 0) + 1,
      similar: similar || !!old?.similar,
    });
  }
  for (const other of data.items.filter(
    (other) => !other.deletedAt && !other.isArchived && other.id !== item?.id,
  ))
    add(
      locationSnapshot(other, data.places),
      other.locationUpdatedAt,
      !!item?.category && item.category === other.category,
    );
  for (const entry of data.history) {
    const owner = data.items.find((other) => other.id === entry.itemId);
    if (!owner || owner.deletedAt || owner.isArchived) continue;
    add(
      entry.newLocation ?? {
        placeId: entry.newPlaceId,
        path: placePath(entry.newPlaceId, data.places),
        position: cleanPosition(entry.newSpot),
      },
      entry.changedAt,
      !!item?.category && item.category === owner.category,
    );
  }
  const current = item
    ? locationKey(locationSnapshot(item, data.places))
    : undefined;
  return [...map.entries()]
    .filter(([key]) => key !== current)
    .sort(
      (a, b) =>
        Number(b[1].similar) - Number(a[1].similar) ||
        b[1].recent.localeCompare(a[1].recent) ||
        b[1].frequency - a[1].frequency ||
        a[0].localeCompare(b[0]),
    )
    .slice(0, 4)
    .map(([, value]) => value.snapshot);
}
export function positionSuggestions(
  data: MemoryData,
  placeId?: string,
  text = '',
) {
  const values = [
    ...data.items
      .filter(
        (item) =>
          !item.deletedAt && !item.isArchived && item.placeId === placeId,
      )
      .sort((a, b) => b.locationUpdatedAt.localeCompare(a.locationUpdatedAt))
      .map((item) => cleanPosition(item.exactSpot)),
    ...data.history
      .filter(
        (entry) =>
          (entry.newLocation?.placeId ?? entry.newPlaceId) === placeId &&
          data.items.some(
            (item) =>
              item.id === entry.itemId && !item.deletedAt && !item.isArchived,
          ),
      )
      .map((entry) =>
        cleanPosition(entry.newLocation?.position ?? entry.newSpot),
      ),
    'Top shelf',
    'Middle shelf',
    'Bottom shelf',
    'Drawer',
    'Door',
    'Left',
    'Right',
    'Back',
  ];
  const seen = new Set<string>();
  return values
    .filter((value): value is string => {
      if (
        !value ||
        seen.has(value.toLowerCase()) ||
        !value.toLowerCase().includes(text.trim().toLowerCase()) ||
        value.toLowerCase() === text.trim().toLowerCase()
      )
        return false;
      seen.add(value.toLowerCase());
      return true;
    })
    .slice(0, 8);
}
