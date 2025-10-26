import { openDatabaseAsync } from 'expo-sqlite';

import type { ClipboardEntry, ClipboardSyncState } from '@/lib/models/clipboard';

type SQLiteBindValue = string | number | null;
function bind(v: unknown): SQLiteBindValue {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  // Fallback: serialize objects (prevents Kotlin bridge type errors)
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toSqlLiteral(value: SQLiteBindValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  // escape single quotes by doubling them
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

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
  const sql = `INSERT OR REPLACE INTO clipboard_entries (
      id, content_type, text, html, image_uri, file_uri, app_package,
      created_at, updated_at, device_id, device_name, origin, is_pinned,
      sync_state, synced_at, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
  const params = [
    bind(entry.id),
    bind(entry.contentType),
    bind(entry.text ?? null),
    bind(entry.html ?? null),
    bind(entry.imageUri ?? null),
    bind(entry.fileUri ?? null),
    bind(entry.appPackage ?? null),
    bind(entry.createdAt),
    bind(entry.updatedAt),
    bind(entry.deviceId),
    bind(entry.deviceName),
    bind(entry.origin),
    bind(entry.isPinned ? 1 : 0),
    bind(String(entry.syncState)),
    bind(entry.syncedAt ?? null),
    bind(
      entry.metadata == null
        ? null
        : typeof entry.metadata === 'string'
          ? entry.metadata
          : JSON.stringify(entry.metadata),
    ),
  ];

  if (__DEV__) {
    try {
      const preview = params.map((v, i) => describeParam(i, v));
      // Avoid logging huge data URIs
      // eslint-disable-next-line no-console
      console.log('[sqlite][upsert] params:', preview);
    } catch {}
  }

  try {
    await db.runAsync(sql, params);
  } catch (error) {
    if (__DEV__) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[sqlite][upsert] FAILED', String(error));
      } catch {}
    }
    // Fallback: build a safe literal SQL to bypass param conversion issues on some Android bridges
    try {
      const literalSql = `INSERT OR REPLACE INTO clipboard_entries (
        id, content_type, text, html, image_uri, file_uri, app_package,
        created_at, updated_at, device_id, device_name, origin, is_pinned,
        sync_state, synced_at, metadata
      ) VALUES (${params.map(toSqlLiteral).join(', ')});`;
      await db.execAsync(literalSql);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[sqlite][upsert] fallback execAsync succeeded');
      }
      return;
    } catch (fallbackError) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[sqlite][upsert] fallback execAsync FAILED', String(fallbackError));
      }
      throw error;
    }
  }
}

export async function getEntries(limit = 500): Promise<ClipboardEntry[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    `SELECT * FROM clipboard_entries ORDER BY created_at DESC LIMIT ?;`,
    [limit],
  )) as HistoryRow[];
  return rows.map(mapRow);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM clipboard_entries WHERE id = ?;`, [id]);
}

export async function clearEntries(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clipboard_entries;');
}

export async function updatePinned(id: string, isPinned: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE clipboard_entries SET is_pinned = ? WHERE id = ?;`, [isPinned ? 1 : 0, id]);
}

export async function updateSyncState(id: string, syncState: ClipboardSyncState, syncedAt: number | null) {
  const db = await getDatabase();
  const sql = `UPDATE clipboard_entries SET sync_state = ?, synced_at = ?, updated_at = ? WHERE id = ?;`;
  const params = [bind(String(syncState)), bind(syncedAt ?? null), bind(Date.now()), bind(id)];
  if (__DEV__) {
    try {
      const preview = params.map((v, i) => describeParam(i, v));
      // eslint-disable-next-line no-console
      console.log('[sqlite][updateSyncState] params:', preview);
    } catch {}
  }
  try {
    await db.runAsync(sql, params);
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[sqlite][updateSyncState] FAILED', String(error));
    }
    // Fallback literal exec
    try {
      const literalSql = `UPDATE clipboard_entries SET sync_state = ${toSqlLiteral(params[0])}, synced_at = ${toSqlLiteral(params[1])}, updated_at = ${toSqlLiteral(params[2])} WHERE id = ${toSqlLiteral(params[3])};`;
      await db.execAsync(literalSql);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[sqlite][updateSyncState] fallback execAsync succeeded');
      }
      return;
    } catch (fallbackError) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[sqlite][updateSyncState] fallback execAsync FAILED', String(fallbackError));
      }
      throw error;
    }
  }
}

function describeParam(index: number, value: SQLiteBindValue) {
  if (value === null) {
    return { index, type: 'null', value: null };
  }
  if (typeof value === 'number') {
    return { index, type: 'number', value };
  }
  // string
  if (value.startsWith('data:image')) {
    return { index, type: 'string', value: 'data:image (redacted)', length: value.length };
  }
  const preview = value.length > 120 ? `${value.slice(0, 120)}…` : value;
  return { index, type: 'string', value: preview, length: value.length };
}
