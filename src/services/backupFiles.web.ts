import type { PhotoBytes } from '../utils/backup';
export async function readBytes(uri: string): Promise<Uint8Array> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('The file could not be read.');
  return new Uint8Array(await response.arrayBuffer());
}
export async function readPhoto(uri: string): Promise<PhotoBytes> {
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error('A photo could not be read. Backup was not created.');
  const blob = await response.blob();
  if (blob.size > 20 * 1024 * 1024)
    throw new Error('A photo exceeds the 20 MB backup limit.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type };
}
export async function writePhoto(photo: PhotoBytes): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Photo could not be restored.'));
    reader.readAsDataURL(
      new Blob([new Uint8Array(photo.bytes)], { type: photo.mime }),
    );
  });
}
export async function exportArchive(bytes: Uint8Array) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `Item-Nesia-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
