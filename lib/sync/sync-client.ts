import { AppState } from 'react-native';

import type { DeviceIdentity } from '@/lib/device/identity';
import type {
  ClipboardEntry,
  RemoteClipboardEvent,
  SyncEnvelope,
  SyncHandshake,
} from '@/lib/models/clipboard';

export interface SyncClientOptions {
  endpoint: string;
  pairingToken?: string;
  device: DeviceIdentity;
  discoverable: boolean;
  onClipboardEvent?: (event: RemoteClipboardEvent) => void;
  onConnectionChange?: (state: SyncConnectionState) => void;
  onServerInfo?: (info: { serverName?: string; clients?: Array<{ id: string; deviceName?: string }> }) => void;
}

export type SyncConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const HEARTBEAT_INTERVAL_MS = 20_000;
const RECONNECT_MIN_DELAY = 3_000;
const RECONNECT_MAX_DELAY = 25_000;

export class SyncClient {
  private socket: WebSocket | null = null;
  private state: SyncConnectionState = 'disconnected';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor(private options: SyncClientOptions) {}

  setOptions(options: Partial<SyncClientOptions>) {
    this.options = { ...this.options, ...options } as SyncClientOptions;
    if (this.state === 'connected' && options.endpoint && this.socket) {
      this.reconnect();
    }
  }

  connect() {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }
    this.clearReconnectTimer();
    this.updateState('connecting');

    try {
      this.socket = new WebSocket(this.options.endpoint);
    } catch (error) {
      console.warn('[sync] Failed to construct WebSocket', error);
      this.updateState('error');
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.updateState('connected');
      this.sendEnvelope<SyncHandshake>('handshake', {
        deviceId: this.options.device.id,
        deviceName: this.options.device.name,
        pairingToken: this.options.pairingToken,
        supportsChunking: true,
        protocolVersion: '1.0.0',
        discoverable: this.options.discoverable,
      });
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as SyncEnvelope;
        if (envelope.type === 'clipboard-event' && this.options.onClipboardEvent) {
          this.options.onClipboardEvent(envelope.payload as RemoteClipboardEvent);
        } else if (envelope.type === 'ack' && this.options.onServerInfo) {
          const payload = envelope.payload as { serverName?: string; clients?: Array<{ id: string; deviceName?: string }> };
          this.options.onServerInfo(payload);
        }
      } catch (error) {
        console.warn('[sync] Failed to decode message', error);
      }
    };

    this.socket.onerror = (error: any) => {
      // In RN, the error event often hides the message in `event.message`.
      const msg = typeof error?.message === 'string' ? error.message : (() => {
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      })();
      console.warn('[sync] WebSocket error', msg);
      this.updateState('error');
    };

    this.socket.onclose = (evt: any) => {
      try {
        const code = evt?.code;
        const reason = evt?.reason;
        const wasClean = evt?.wasClean;
        console.warn('[sync] WebSocket closed', { code, reason, wasClean });
      } catch {}
      this.stopHeartbeat();
      this.updateState('disconnected');
      this.scheduleReconnect();
    };

    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.updateState('disconnected');
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  sendClipboardEntry(entry: ClipboardEntry) {
    this.sendEnvelope('clipboard-event', {
      id: entry.id,
      payload: entry,
      eventType: 'added',
    } satisfies RemoteClipboardEvent);
  }

  private handleAppStateChange = (state: string) => {
    if (state === 'active' && this.state === 'disconnected') {
      this.connect();
    }
  };

  private updateState(state: SyncConnectionState) {
    this.state = state;
    this.options.onConnectionChange?.(state);
  }

  private sendEnvelope<T>(type: SyncEnvelope['type'], payload: T) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const envelope: SyncEnvelope<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };
    this.socket.send(JSON.stringify(envelope));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendEnvelope('heartbeat', { deviceId: this.options.device.id });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (!this.heartbeatTimer) {
      return;
    }
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    const delay = Math.floor(
      Math.random() * (RECONNECT_MAX_DELAY - RECONNECT_MIN_DELAY) + RECONNECT_MIN_DELAY,
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
