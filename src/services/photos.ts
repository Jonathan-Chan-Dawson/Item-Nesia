import { Directory, File, Paths } from 'expo-file-system';
import { newId } from '../utils/memory';

const photoDirectory = () => new Directory(Paths.document, 'memories');
export async function persistPhoto(uri: string): Promise<string> {
  const dir = photoDirectory();
  dir.create({ idempotent: true, intermediates: true });
  if (uri.startsWith(`${dir.uri}/`) || uri.startsWith(dir.uri)) return uri;
  const extension =
    uri.split('?')[0].match(/\.(jpe?g|png|webp|heic)$/i)?.[1] ?? 'jpg';
  const target = new File(dir, `${newId()}.${extension}`);
  await new File(uri).copy(target);
  return target.uri;
}
export async function removePhoto(uri: string) {
  if (!uri.startsWith(photoDirectory().uri)) return;
  const file = new File(uri);
  if (file.exists) await file.delete();
}
