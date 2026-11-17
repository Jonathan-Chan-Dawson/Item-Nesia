import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { PhotoBytes } from '../utils/backup';
import { newId } from '../utils/memory';
export async function readBytes(uri: string): Promise<Uint8Array> {
  if (new File(uri).size > 64 * 1024 * 1024)
    throw new Error('Backup is larger than 64 MB.');
  return new File(uri).bytes();
}
export async function readPhoto(uri: string): Promise<PhotoBytes> {
  const file = new File(uri);
  if (file.size > 20 * 1024 * 1024)
    throw new Error('A photo exceeds the 20 MB backup limit.');
  const extension = uri.split('.').pop()?.toLowerCase();
  const mime =
    file.type ||
    ({
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      heic: 'image/heic',
      heif: 'image/heif',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
    }[extension ?? ''] ??
      'image/jpeg');
  return { bytes: await file.bytes(), mime };
}
export async function writePhoto(photo: PhotoBytes): Promise<string> {
  const directory = new Directory(Paths.document, 'memories');
  directory.create({ idempotent: true, intermediates: true });
  const extension =
    photo.mime.split('/')[1] === 'jpeg' ? 'jpg' : photo.mime.split('/')[1];
  const file = new File(directory, `${newId()}.${extension}`);
  await file.write(photo.bytes);
  return file.uri;
}
export async function exportArchive(bytes: Uint8Array) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, `Item-Nesia-${newId()}.zip`);
  await file.write(bytes);
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      dialogTitle: 'Save Item-Nesia backup',
      UTI: 'public.zip-archive',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
