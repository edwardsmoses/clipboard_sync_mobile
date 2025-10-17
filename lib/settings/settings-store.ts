import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'app.settings.v1';

export interface AppSettings {
  endpoint: string | null;
  pairingToken: string | null;
  autoStartOnBoot: boolean;
  wifiOnly: boolean;
  discoverable: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  endpoint: null,
  pairingToken: null,
  autoStartOnBoot: true,
  wifiOnly: false,
  discoverable: true,
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as AppSettings;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.warn('[settings] Failed to parse settings', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const existing = await loadSettings();
  const merged: AppSettings = { ...existing, ...partial };
  await saveSettings(merged);
  return merged;
}
