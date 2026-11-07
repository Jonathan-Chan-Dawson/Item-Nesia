import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../database/storage';
import { MemoryRepository } from '../repositories/memory';
import { emptyData, type MemoryData } from '../types/models';
import { palettes } from '../theme/tokens';
import { removePhoto } from '../services/photos';

interface Context {
  data: MemoryData;
  repository: MemoryRepository;
  loading: boolean;
  error?: string;
  retry(): void;
}
const MemoryContext = createContext<Context | null>(null);
export function MemoryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [repository] = useState(
    () => new MemoryRepository(storage, setData, removePhoto),
  );
  useEffect(() => {
    repository
      .initialize()
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : 'Your memories could not be opened.',
        ),
      )
      .finally(() => setLoading(false));
  }, [attempt, repository]);
  return (
    <MemoryContext.Provider
      value={{
        data,
        repository,
        loading,
        error,
        retry: () => {
          setLoading(true);
          setError(undefined);
          setAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}
export function useMemory() {
  const context = useContext(MemoryContext);
  if (!context) throw new Error('MemoryProvider is missing.');
  return context;
}
export function useTheme() {
  const { data } = useMemory();
  const system = useColorScheme();
  const dark =
    (data.settings.theme === 'system' ? system : data.settings.theme) ===
    'dark';
  return { colors: palettes[dark ? 'dark' : 'light'], dark };
}
