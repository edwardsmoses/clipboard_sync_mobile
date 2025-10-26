import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { ClipboardMonitor, type ClipboardSnapshot } from '@/lib/clipboard/monitor';
import type { DeviceIdentity } from '@/lib/device/identity';
import { getDeviceIdentity } from '@/lib/device/identity';
import type { ClipboardEntry, RemoteClipboardEvent } from '@/lib/models/clipboard';
import { SyncClient, type SyncConnectionState } from '@/lib/sync/sync-client';
import * as HistoryStore from '@/lib/persistence/history-store';
import uuid from 'react-native-uuid';

import { useSettings } from './settings-context';

type Action =
  | { type: 'SET_ENTRIES'; entries: ClipboardEntry[] }
  | { type: 'UPSERT_ENTRY'; entry: ClipboardEntry }
  | { type: 'REMOVE_ENTRY'; id: string }
  | { type: 'SET_READY'; isReady: boolean }
  | { type: 'SET_DEVICE'; device: DeviceIdentity }
  | { type: 'SET_SYNC_STATE'; state: SyncConnectionState };

interface ClipboardHistoryState {
  entries: ClipboardEntry[];
  isReady: boolean;
  device: DeviceIdentity | null;
  syncState: SyncConnectionState;
}

const initialState: ClipboardHistoryState = {
  entries: [],
  isReady: false,
  device: null,
  syncState: 'disconnected',
};

function reducer(state: ClipboardHistoryState, action: Action): ClipboardHistoryState {
  switch (action.type) {
    case 'SET_ENTRIES':
      return { ...state, entries: action.entries };
    case 'UPSERT_ENTRY': {
      const remaining = state.entries.filter((entry) => entry.id !== action.entry.id);
      return {
        ...state,
        entries: [action.entry, ...remaining].sort((a, b) => b.createdAt - a.createdAt),
      };
    }
    case 'REMOVE_ENTRY':
      return { ...state, entries: state.entries.filter((entry) => entry.id !== action.id) };
    case 'SET_READY':
      return { ...state, isReady: action.isReady };
    case 'SET_DEVICE':
      return { ...state, device: action.device };
    case 'SET_SYNC_STATE':
      return { ...state, syncState: action.state };
    default:
      return state;
  }
}

interface ContextValue {
  entries: ClipboardEntry[];
  isReady: boolean;
  device: DeviceIdentity | null;
  syncState: SyncConnectionState;
  refresh(): Promise<void>;
  remove(id: string): Promise<void>;
  togglePin(id: string, isPinned: boolean): Promise<void>;
  ingestRemoteEntry(entry: ClipboardEntry): Promise<void>;
  clearAll(): Promise<void>;
}

const ClipboardHistoryContext = createContext<ContextValue>({
  entries: [],
  isReady: false,
  device: null,
  syncState: 'disconnected',
  refresh: async () => undefined,
  remove: async () => undefined,
  togglePin: async () => undefined,
  ingestRemoteEntry: async () => undefined,
  clearAll: async () => undefined,
});

interface Props {
  children: React.ReactNode;
}

export function ClipboardHistoryProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const monitorRef = useRef<ClipboardMonitor | null>(null);
  const syncClientRef = useRef<SyncClient | null>(null);
  const { settings, isReady: settingsReady } = useSettings();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const identity = await getDeviceIdentity();
      if (!isMounted) {
        return;
      }
      dispatch({ type: 'SET_DEVICE', device: identity });
      const entries = await HistoryStore.getEntries();
      if (isMounted) {
        dispatch({ type: 'SET_ENTRIES', entries });
        dispatch({ type: 'SET_READY', isReady: true });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const entries = await HistoryStore.getEntries();
    dispatch({ type: 'SET_ENTRIES', entries });
  }, []);

  const remove = useCallback(async (id: string) => {
    await HistoryStore.deleteEntry(id);
    dispatch({ type: 'REMOVE_ENTRY', id });
  }, []);

  const togglePin = useCallback(async (id: string, isPinned: boolean) => {
    await HistoryStore.updatePinned(id, isPinned);
    const entries = await HistoryStore.getEntries();
    dispatch({ type: 'SET_ENTRIES', entries });
  }, []);

  const ingestRemoteEntry = useCallback(async (entry: ClipboardEntry) => {
    await HistoryStore.upsertEntry(entry);
    dispatch({ type: 'UPSERT_ENTRY', entry });
  }, []);

  const clearAll = useCallback(async () => {
    await HistoryStore.clearEntries();
    dispatch({ type: 'SET_ENTRIES', entries: [] });
  }, []);

  useEffect(() => {
    if (!state.device || !state.isReady) {
      return;
    }

    const monitor = new ClipboardMonitor(async (snapshot: ClipboardSnapshot) => {
      if (!state.device) {
        return;
      }

      const createdAt = Date.now();
      const id = (uuid.v4() as string).toString();
      const entry: ClipboardEntry = {
        id,
        contentType: snapshot.contentType,
        text: snapshot.text ?? null,
        html: snapshot.html ?? null,
        imageUri: snapshot.image
          ? `data:image/${snapshot.image.format ?? 'png'};base64,${snapshot.image.data}`
          : null,
        fileUri: null,
        appPackage: null,
        createdAt,
        updatedAt: createdAt,
        deviceId: state.device.id,
        deviceName: state.device.name,
        origin: 'local',
        isPinned: false,
        syncState: 'pending',
        syncedAt: null,
        metadata: snapshot.image
          ? { width: snapshot.image.width, height: snapshot.image.height }
          : null,
      };

      await HistoryStore.upsertEntry(entry);
      dispatch({ type: 'UPSERT_ENTRY', entry });
      syncClientRef.current?.sendClipboardEntry(entry);
    });

    monitorRef.current = monitor;
    monitor.start();

    return () => {
      monitor.stop();
      monitorRef.current = null;
    };
  }, [state.device, state.isReady]);

  useEffect(() => {
    if (!state.device || !settingsReady) {
      return;
    }

    if (!settings.endpoint) {
      syncClientRef.current?.disconnect();
      syncClientRef.current = null;
      dispatch({ type: 'SET_SYNC_STATE', state: 'disconnected' });
      return;
    }

    if (!syncClientRef.current) {
      syncClientRef.current = new SyncClient({
        endpoint: settings.endpoint,
        pairingToken: settings.pairingToken ?? undefined,
        device: state.device,
        discoverable: settings.discoverable,
        onConnectionChange: (syncState: SyncConnectionState) =>
          dispatch({ type: 'SET_SYNC_STATE', state: syncState }),
        onClipboardEvent: (event: RemoteClipboardEvent) => {
          if (event.eventType === 'added') {
            void ingestRemoteEntry(event.payload);
          }
        },
      });
      syncClientRef.current.connect();
      return;
    }

    syncClientRef.current.setOptions({
      endpoint: settings.endpoint,
      pairingToken: settings.pairingToken ?? undefined,
      device: state.device,
      discoverable: settings.discoverable,
    });
  }, [state.device, settings.discoverable, settings.endpoint, settings.pairingToken, settingsReady, ingestRemoteEntry]);

  useEffect(() => {
    return () => {
      monitorRef.current?.stop();
      syncClientRef.current?.disconnect();
    };
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      entries: state.entries,
      isReady: state.isReady,
      device: state.device,
      syncState: state.syncState,
      refresh,
      remove,
      togglePin,
      ingestRemoteEntry,
      clearAll,
    }),
    [clearAll, ingestRemoteEntry, refresh, remove, state.device, state.entries, state.isReady, state.syncState, togglePin],
  );

  return <ClipboardHistoryContext.Provider value={value}>{children}</ClipboardHistoryContext.Provider>;
}

export function useClipboardHistory() {
  return useContext(ClipboardHistoryContext);
}
