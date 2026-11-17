import type { Folder } from '../types/models';
export function folderPath(id: string | undefined, folders: Folder[]): string {
  const names: string[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = folders.find((f) => f.id === id);
    if (!folder) break;
    names.unshift(folder.name);
    id = folder.parentId;
  }
  return names.join(' › ');
}
export function inFolder(
  id: string | undefined,
  root: string,
  folders: Folder[],
): boolean {
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    if (id === root) return true;
    seen.add(id);
    id = folders.find((f) => f.id === id)?.parentId;
  }
  return false;
}
