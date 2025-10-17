import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AppSettings } from '@/lib/settings/settings-store';
import { loadSettings, updateSettings } from '@/lib/settings/settings-store';

interface SettingsContextValue {
  settings: AppSettings;
  isReady: boolean;
  update(partial: Partial<AppSettings>): Promise<void>;
}

const defaultValue: SettingsContextValue = {
  settings: {
    endpoint: null,
    pairingToken: null,
    autoStartOnBoot: true,
    wifiOnly: false,
    discoverable: true,
  },
  isReady: false,
  update: async () => undefined,
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

interface Props {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: Props) {
  const [settings, setSettings] = useState<AppSettings>(defaultValue.settings);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const loaded = await loadSettings();
      if (isMounted) {
        setSettings(loaded);
        setReady(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = await updateSettings(partial);
    setSettings(updated);
  }, []);

  const value = useMemo(() => ({ settings, isReady, update }), [isReady, settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
