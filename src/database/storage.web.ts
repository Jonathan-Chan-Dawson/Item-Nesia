import { defaultSettings, emptyData, type MemoryData } from '../types/models';
import type { StorageAdapter } from './storage.types';
const key = 'item-nesia:v1';
export const storage: StorageAdapter = {
  async load() {
    const value = localStorage.getItem(key);
    if (!value) return emptyData();
    const parsed = JSON.parse(value) as MemoryData;
    if (
      !Array.isArray(parsed.items) ||
      !Array.isArray(parsed.places) ||
      !Array.isArray(parsed.history)
    )
      throw new Error('Saved browser data could not be read.');
    return { ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
  },
  async save(data) {
    // One atomic browser write; quota errors propagate before UI state is changed.
    localStorage.setItem(key, JSON.stringify(data));
  },
};
