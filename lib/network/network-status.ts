import { useEffect, useState } from 'react';

type NetworkModule = typeof import('expo-network');

export type NetworkSummary = {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  details?: {
    ssid?: string | null;
    ipAddress?: string | null;
    subnet?: string | null;
  } | null;
};

let networkModulePromise: Promise<NetworkModule | null> | null = null;

async function loadNetworkModule(): Promise<NetworkModule | null> {
  if (!networkModulePromise) {
    networkModulePromise = import('expo-network')
      .then((mod) => mod)
      .catch((error) => {
        console.warn('[network] expo-network unavailable', error);
        return null;
      });
  }
  return networkModulePromise;
}

export async function getNetworkSummary(): Promise<NetworkSummary | null> {
  const Network = await loadNetworkModule();
  if (!Network) {
    return null;
  }

  const state = await Network.getNetworkStateAsync();

  let typeName: string | null = null;
  switch (state.type) {
    case Network.NetworkStateType.WIFI:
      typeName = 'WIFI';
      break;
    case Network.NetworkStateType.CELLULAR:
      typeName = 'CELLULAR';
      break;
    case Network.NetworkStateType.ETHERNET:
      typeName = 'ETHERNET';
      break;
    case Network.NetworkStateType.NONE:
      typeName = 'NONE';
      break;
    case Network.NetworkStateType.UNKNOWN:
      typeName = 'UNKNOWN';
      break;
    default:
      typeName = null;
  }

  return {
    isConnected: Boolean(state.isConnected),
    isInternetReachable: Boolean(state.isInternetReachable),
    type: typeName,
    details:
      state.type === Network.NetworkStateType.WIFI
        ? {
            ssid: state.details?.ssid ?? null,
            ipAddress: state.details?.ipAddress ?? null,
            subnet: state.details?.subnet ?? null,
          }
        : null,
  };
}

export function useNetworkSummary(pollMs = 10_000) {
  const [summary, setSummary] = useState<NetworkSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const next = await getNetworkSummary();
      if (mounted) {
        setSummary(next);
        timer = setTimeout(tick, pollMs);
      }
    };

    void tick();

    return () => {
      mounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [pollMs]);

  return summary;
}
