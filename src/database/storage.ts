import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { defaultSettings, emptyData, type MemoryData } from '../types/models';
import type { StorageAdapter } from './storage.types';

let connection: Promise<SQLiteDatabase> | undefined;
async function database() {
  connection ??= (async () => {
    const db = await openDatabaseAsync('item-nesia.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    if ((version?.user_version ?? 0) > 1)
      throw new Error('This data needs a newer version of Item-Nesia.');
    if (!version?.user_version) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.execAsync(`
          CREATE TABLE items (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
          CREATE TABLE places (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
          CREATE TABLE history (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
          CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
          PRAGMA user_version = 1;
        `);
      });
    }
    return db;
  })().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export const storage: StorageAdapter = {
  async load() {
    const db = await database();
    const data = emptyData();
    for (const table of ['items', 'places', 'history'] as const) {
      const rows = await db.getAllAsync<{ data: string }>(
        `SELECT data FROM ${table}`,
      );
      // Each table has its own typed entity collection; table names are a closed constant list.
      Object.assign(data, { [table]: rows.map((row) => JSON.parse(row.data)) });
    }
    const settings = await db.getFirstAsync<{ data: string }>(
      'SELECT data FROM settings WHERE id = 1',
    );
    data.settings = {
      ...defaultSettings,
      ...(settings ? JSON.parse(settings.data) : {}),
    };
    return data;
  },
  async save(data: MemoryData) {
    const db = await database();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const table of ['items', 'places', 'history'] as const) {
        await tx.runAsync(`DELETE FROM ${table}`);
        for (const entity of data[table]) {
          await tx.runAsync(
            `INSERT INTO ${table} (id, data) VALUES (?, ?)`,
            entity.id,
            JSON.stringify(entity),
          );
        }
      }
      await tx.runAsync(
        'INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)',
        JSON.stringify(data.settings),
      );
    });
  },
};
