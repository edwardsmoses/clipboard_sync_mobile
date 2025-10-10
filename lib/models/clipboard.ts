export type ClipboardContentType = 'text' | 'html' | 'image' | 'file' | 'unknown';

export type ClipboardSyncState = 'pending' | 'synced' | 'failed';

export interface ClipboardEntry {
  id: string;
  contentType: ClipboardContentType;
  text?: string | null;
  html?: string | null;
  imageUri?: string | null;
  fileUri?: string | null;
  appPackage?: string | null;
  createdAt: number;
  updatedAt: number;
  deviceId: string;
  deviceName: string;
  origin: 'local' | 'remote';
  isPinned: boolean;
  syncState: ClipboardSyncState;
  syncedAt?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface RemoteClipboardEvent {
  id: string;
  payload: ClipboardEntry;
  eventType: 'added' | 'updated' | 'deleted';
}

export interface SyncHandshake {
  deviceId: string;
  deviceName: string;
  pairingToken?: string;
  supportsChunking: boolean;
  protocolVersion: string;
}

export interface SyncEnvelope<T = unknown> {
  type: 'handshake' | 'clipboard-event' | 'ack' | 'error' | 'heartbeat';
  timestamp: number;
  payload: T;
}
