import {
  defaultSettings,
  type MemoryData,
  type QuickAccessRef,
  type Settings,
} from '../types/models';
export function validShortcuts(
  value: unknown,
  data: Pick<MemoryData, 'places' | 'folders'>,
): QuickAccessRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: QuickAccessRef[] = [];
  for (const ref of value) {
    if (
      !ref ||
      (ref.kind !== 'place' && ref.kind !== 'folder') ||
      typeof ref.id !== 'string'
    )
      continue;
    const key = `${ref.kind}:${ref.id}`;
    if (
      seen.has(key) ||
      !(ref.kind === 'place' ? data.places : data.folders).some(
        (entity) => entity.id === ref.id,
      )
    )
      continue;
    seen.add(key);
    output.push({ kind: ref.kind, id: ref.id });
    if (output.length === 4) break;
  }
  return output;
}
export function normalizeSettings(
  settings: Partial<Settings> | undefined,
  data: Pick<MemoryData, 'places' | 'folders'>,
): Settings {
  return {
    ...defaultSettings,
    ...settings,
    quickAccess: validShortcuts(settings?.quickAccess, data),
  };
}
