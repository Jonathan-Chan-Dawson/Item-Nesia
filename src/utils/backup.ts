import JSZip from 'jszip';
import { categories, type MemoryData } from '../types/models';
import { inFolder } from './folders';
import { validateParent } from './memory';
import { normalizeSettings } from './preferences';
export const BACKUP_LIMIT = 64 * 1024 * 1024;
export interface PhotoBytes {
  bytes: Uint8Array;
  mime: string;
}
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/avif': 'avif',
};
const fail = () => {
  throw new Error(
    'This backup is incomplete, damaged, or uses an unsupported format. Your current data has not changed.',
  );
};
export function photoReferences(data: MemoryData) {
  return [
    ...new Set(
      [
        ...data.items.flatMap((i) => [i.photoUri, i.locationPhotoUri]),
        ...data.places.map((p) => p.coverPhotoUri),
        ...data.history.flatMap((entry) => [
          entry.previousLocation?.photoUri,
          entry.newLocation?.photoUri,
        ]),
      ].filter((uri): uri is string => !!uri),
    ),
  ];
}
export function remapPhotos(
  data: MemoryData,
  map: Map<string, string>,
): MemoryData {
  const copy: MemoryData = JSON.parse(JSON.stringify(data));
  for (const item of copy.items) {
    if (item.photoUri) item.photoUri = map.get(item.photoUri) ?? fail();
    if (item.locationPhotoUri)
      item.locationPhotoUri = map.get(item.locationPhotoUri) ?? fail();
  }
  for (const place of copy.places)
    if (place.coverPhotoUri)
      place.coverPhotoUri = map.get(place.coverPhotoUri) ?? fail();
  for (const entry of copy.history)
    for (const snapshot of [entry.previousLocation, entry.newLocation])
      if (snapshot?.photoUri)
        snapshot.photoUri = map.get(snapshot.photoUri) ?? fail();
  return copy;
}
export function validateBackupData(raw: unknown): MemoryData {
  if (!raw || typeof raw !== 'object') return fail();
  const data = raw as MemoryData;
  const arrays = [data.items, data.places, data.folders, data.history];
  if (arrays.some((a) => !Array.isArray(a) || a.length > 10000)) return fail();
  const string = (v: unknown) => typeof v === 'string' && v.length <= 100000;
  const date = (v: unknown) =>
    string(v) && Number.isFinite(Date.parse(v as string));
  const optional = (v: unknown) => v === undefined || string(v);
  const photoUri = (v: unknown) =>
    v === undefined || (typeof v === 'string' && v.length <= 28 * 1024 * 1024);
  for (const rows of arrays) {
    const ids = new Set<string>();
    for (const row of rows) {
      if (
        !row ||
        typeof row !== 'object' ||
        !string(row.id) ||
        !row.id ||
        ids.has(row.id)
      )
        return fail();
      ids.add(row.id);
    }
  }
  for (const folder of data.folders) {
    if (
      !string(folder.name) ||
      !folder.name.trim() ||
      !optional(folder.parentId) ||
      !optional(folder.icon) ||
      !date(folder.createdAt) ||
      !date(folder.updatedAt)
    )
      return fail();
    if (
      folder.parentId &&
      (!data.folders.some((f) => f.id === folder.parentId) ||
        inFolder(folder.parentId, folder.id, data.folders))
    )
      return fail();
  }
  for (const place of data.places) {
    if (
      !string(place.name) ||
      !place.name.trim() ||
      !date(place.createdAt) ||
      !date(place.updatedAt) ||
      ![place.parentId, place.description, place.icon].every(optional) ||
      !photoUri(place.coverPhotoUri)
    )
      return fail();
    try {
      validateParent(place.id, place.parentId, data.places);
    } catch {
      return fail();
    }
  }
  for (const item of data.items) {
    if (
      !string(item.name) ||
      !item.name.trim() ||
      !Array.isArray(item.tags) ||
      !Array.isArray(item.aliases) ||
      ![...item.tags, ...item.aliases].every(string) ||
      typeof item.isFavorite !== 'boolean' ||
      typeof item.isArchived !== 'boolean' ||
      ![item.createdAt, item.updatedAt, item.locationUpdatedAt].every(date) ||
      ![
        item.description,
        item.category,
        item.placeId,
        item.folderId,
        item.exactSpot,
      ].every(optional) ||
      !optional(item.icon) ||
      (item.deletedAt !== undefined && !date(item.deletedAt)) ||
      !photoUri(item.photoUri) ||
      !photoUri(item.locationPhotoUri)
    )
      return fail();
    if (item.category && !categories.includes(item.category)) return fail();
    if (item.folderId && !data.folders.some((f) => f.id === item.folderId))
      return fail();
    if (item.placeId && !data.places.some((p) => p.id === item.placeId))
      return fail();
    const pin = [item.locationPinX, item.locationPinY];
    if (
      pin.some((v) => v !== undefined) &&
      (!item.locationPhotoUri ||
        pin.some(
          (v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1,
        ))
    )
      return fail();
  }
  const validSnapshot = (value: unknown) => {
    if (value === undefined) return true;
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as import('../types/models').LocationSnapshot;
    const pins = [snapshot.pinX, snapshot.pinY];
    return (
      string(snapshot.path) &&
      optional(snapshot.placeId) &&
      optional(snapshot.position) &&
      photoUri(snapshot.photoUri) &&
      (!pins.some((v) => v !== undefined) ||
        (!!snapshot.photoUri &&
          pins.every(
            (v) =>
              typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1,
          )))
    );
  };
  for (const entry of data.history)
    if (
      !data.items.some((i) => i.id === entry.itemId) ||
      !date(entry.changedAt) ||
      !validSnapshot(entry.previousLocation) ||
      !validSnapshot(entry.newLocation) ||
      (entry.previousLocationUpdatedAt !== undefined &&
        !date(entry.previousLocationUpdatedAt)) ||
      ![
        entry.itemId,
        entry.previousPlaceId,
        entry.newPlaceId,
        entry.previousSpot,
        entry.newSpot,
        entry.note,
      ].every(optional)
    )
      return fail();
  const settings = data.settings;
  if (
    !settings ||
    !['system', 'light', 'dark'].includes(settings.theme) ||
    !['grid', 'list'].includes(settings.defaultItemsView) ||
    ![
      settings.hapticsEnabled,
      settings.onboardingCompleted,
      settings.demoInitialized,
    ].every((v) => typeof v === 'boolean')
  )
    return fail();
  return {
    items: data.items,
    places: data.places,
    folders: data.folders,
    history: data.history,
    settings: normalizeSettings(data.settings, data),
  };
}

export async function createBackup(
  data: MemoryData,
  readPhoto: (uri: string) => Promise<PhotoBytes>,
): Promise<Uint8Array> {
  validateBackupData(data);
  const zip = new JSZip();
  const map = new Map<string, string>();
  const photos: { path: string; mime: string }[] = [];
  let total = 0;
  for (const uri of photoReferences(data)) {
    const photo = await readPhoto(uri);
    const extension = mimeExtensions[photo.mime];
    if (!extension)
      throw new Error(
        'A photo has an unsupported format. Replace it before backing up.',
      );
    total += photo.bytes.length;
    if (
      !photo.bytes.length ||
      photo.bytes.length > 20 * 1024 * 1024 ||
      total > BACKUP_LIMIT - 4 * 1024 * 1024
    )
      throw new Error('This backup exceeds the 64 MB limit (20 MB per photo).');
    const path = `photos/${photos.length}.${extension}`;
    map.set(uri, path);
    photos.push({ path, mime: photo.mime });
    zip.file(path, photo.bytes);
  }
  const manifest = JSON.stringify({
    format: 'item-nesia-backup',
    version: 4,
    createdAt: new Date().toISOString(),
    data: remapPhotos(data, map),
    photos,
  });
  if (manifest.length > 4 * 1024 * 1024)
    throw new Error('Item metadata exceeds the 4 MB backup limit.');
  zip.file('manifest.json', manifest);
  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'STORE',
  });
  preflight(bytes);
  return bytes;
}
/** Our format uses uncompressed ZIP entries, making size checks possible before allocating extracted files. */
function preflight(bytes: Uint8Array) {
  if (bytes.length < 22 || bytes.length > BACKUP_LIMIT) return fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    view.getUint32(end, true) !== 0x06054b50
  )
    end--;
  if (
    end < 0 ||
    view.getUint32(end, true) !== 0x06054b50 ||
    end + 22 + view.getUint16(end + 20, true) !== bytes.length
  )
    return fail();
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  let total = 0;
  if (
    count > 2000 ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true)
  )
    return fail();
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > end ||
      view.getUint32(offset, true) !== 0x02014b50 ||
      view.getUint16(offset + 10, true) !== 0 ||
      view.getUint16(offset + 8, true) & 1
    )
      return fail();
    const size = view.getUint32(offset + 24, true);
    total += size;
    if (
      size !== view.getUint32(offset + 20, true) ||
      size > 20 * 1024 * 1024 ||
      total > BACKUP_LIMIT
    )
      return fail();
    offset +=
      46 +
      view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
  if (offset !== end) return fail();
}
export async function readBackup(bytes: Uint8Array) {
  preflight(bytes);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) return fail();
  const text = await manifestFile.async('string');
  if (text.length > 4 * 1024 * 1024) return fail();
  const manifest = JSON.parse(text);
  if (
    manifest.format !== 'item-nesia-backup' ||
    ![1, 2, 3, 4].includes(manifest.version) ||
    !Array.isArray(manifest.photos)
  )
    return fail();
  const data = validateBackupData(manifest.data);
  const photos = new Map<string, PhotoBytes>();
  for (const photo of manifest.photos) {
    if (
      !photo ||
      typeof photo.path !== 'string' ||
      !/^photos\/\d+\.(jpg|png|webp|heic|heif|gif|avif)$/.test(photo.path) ||
      !mimeExtensions[photo.mime] ||
      photos.has(photo.path)
    )
      return fail();
    const entry = zip.file(photo.path);
    if (!entry) return fail();
    const photoBytes = await entry.async('uint8array');
    if (!photoBytes.length) return fail();
    photos.set(photo.path, {
      bytes: photoBytes,
      mime: photo.mime,
    });
  }
  if (
    photoReferences(data).some((path) => !photos.has(path)) ||
    photos.size !== photoReferences(data).length
  )
    return fail();
  return { data, photos };
}
