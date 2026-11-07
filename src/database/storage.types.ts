import type { MemoryData } from '../types/models';
export interface StorageAdapter {
  load(): Promise<MemoryData>;
  save(data: MemoryData): Promise<void>;
}
