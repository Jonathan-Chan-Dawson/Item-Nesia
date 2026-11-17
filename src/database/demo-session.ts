import { emptyData, type Settings, type MemoryData } from '../types/models';
import type { StorageAdapter } from './storage.types';
import { withDemo } from './demo';

/** A disposable collection with no access to the device's saved collection. */
export function demoStorage(settings: Settings): StorageAdapter {
  let snapshot: MemoryData = withDemo({
    ...emptyData(),
    settings: {
      ...settings,
      quickAccess: [],
      onboardingCompleted: true,
      demoInitialized: false,
    },
  });
  return {
    load: async () => JSON.parse(JSON.stringify(snapshot)) as MemoryData,
    save: async (data) => {
      snapshot = JSON.parse(JSON.stringify(data)) as MemoryData;
    },
  };
}
