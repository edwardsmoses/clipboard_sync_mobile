import { openDatabaseAsync } from 'expo-sqlite';

import type { ClipboardEntry, ClipboardSyncState } from '@/lib/models/clipboard';

type HistoryRow = {
  id: string;
  content_type: string;
  text: string | null;
  html: string | null;
  image_uri: string | null;
  file_uri: string | null;
  app_package: string | null;
  created_at: number;
  updated_at: number;
  device_id: string;
  device_name: string;
  origin: string;
  is_pinned: number;
  sync_state: string;
  synced_at: number | null;
  metadata: string | null;
};

type SQLiteDatabase = Awaited<ReturnType<typeof openDatabaseAsync>>;

let database: SQLiteDatabase | null = null;
let openingPromise: Promise<SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLiteDatabase> {
  if (database) {
    return database;
  }
  if (!openingPromise) {
    openingPromise = (async () => {
      const db = await openDatabaseAsync('clipboard-sync.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS clipboard_entries (
          id TEXT PRIMARY KEY NOT NULL,
          content_type TEXT NOT NULL,
          text TEXT,
          html TEXT,
          image_uri TEXT,
          file_uri TEXT,
          app_package TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          device_id TEXT NOT NULL,
          device_name TEXT NOT NULL,
          origin TEXT NOT NULL,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          sync_state TEXT NOT NULL,
          synced_at INTEGER,
          metadata TEXT
        );
      `);
      database = db;
      return db;
    })();
  }

  database = await openingPromise;
  return database;
}

function mapRow(row: HistoryRow): ClipboardEntry {
  return {
    id: row.id,
    contentType: row.content_type as ClipboardEntry['contentType'],
    text: row.text,
    html: row.html,
    imageUri: row.image_uri,
    fileUri: row.file_uri,
    appPackage: row.app_package,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceId: row.device_id,
    deviceName: row.device_name,
    origin: row.origin as ClipboardEntry['origin'],
    isPinned: Boolean(row.is_pinned),
    syncState: row.sync_state as ClipboardSyncState,
    syncedAt: row.synced_at ?? null,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}

export async function upsertEntry(entry: ClipboardEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO clipboard_entries (
      id, content_type, text, html, image_uri, file_uri, app_package,
      created_at, updated_at, device_id, device_name, origin, is_pinned,
      sync_state, synced_at, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    entry.id,
    entry.contentType,
    entry.text ?? null,
    entry.html ?? null,
    entry.imageUri ?? null,
    entry.fileUri ?? null,
    entry.appPackage ?? null,
    entry.createdAt,
    entry.updatedAt,
    entry.deviceId,
    entry.deviceName,
    entry.origin,
    entry.isPinned ? 1 : 0,
    entry.syncState,
    entry.syncedAt ?? null,
    entry.metadata ? JSON.stringify(entry.metadata) : null,
  );
}

export async function getEntries(limit = 500): Promise<ClipboardEntry[]> {
  const db = await getDatabase();
  const rows = (await (db as any).getAllAsync(
    `SELECT * FROM clipboard_entries ORDER BY created_at DESC LIMIT ?;`,
    limit,
  )) as HistoryRow[];
  return rows.map(mapRow);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM clipboard_entries WHERE id = ?;`, id);
}

export async function clearEntries(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clipboard_entries;');
}

export async function updatePinned(id: string, isPinned: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE clipboard_entries SET is_pinned = ? WHERE id = ?;`, isPinned ? 1 : 0, id);
}

export async function updateSyncState(id: string, syncState: ClipboardSyncState, syncedAt: number | null) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE clipboard_entries SET sync_state = ?, synced_at = ?, updated_at = ? WHERE id = ?;`,
    syncState,
    syncedAt,
    Date.now(),
    id,
  );
}
