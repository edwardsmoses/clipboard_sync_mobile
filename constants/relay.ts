import Constants from 'expo-constants';

type RelayConfig = {
  apiBaseUrl?: string;
  websocketUrl?: string;
};

const relayConfig = (Constants.expoConfig?.extra?.relay ?? {}) as RelayConfig;

export const RELAY_API_BASE_URL = relayConfig.apiBaseUrl ?? 'https://bridge.edwardsmoses.com';
export const RELAY_WEBSOCKET_URL = relayConfig.websocketUrl ?? 'wss://bridge.edwardsmoses.com/connect';
