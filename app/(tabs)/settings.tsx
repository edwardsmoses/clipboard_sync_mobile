import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/context/settings-context';
import { useNetworkSummary } from '@/lib/network/network-status';
import { GradientContainer } from '@/components/ui/gradient-container';

export default function SettingsScreen() {
  const { settings, update, isReady } = useSettings();
  const [endpoint, setEndpoint] = useState(settings.endpoint ?? '');
  const [pairingToken, setPairingToken] = useState(settings.pairingToken ?? '');
  const [autoStartOnBoot, setAutoStartOnBoot] = useState(settings.autoStartOnBoot);
  const [wifiOnly, setWifiOnly] = useState(settings.wifiOnly);
  const [discoverable, setDiscoverable] = useState(settings.discoverable);
  const [isSaving, setSaving] = useState(false);

  const network = useNetworkSummary();

  useEffect(() => {
    setEndpoint(settings.endpoint ?? '');
    setPairingToken(settings.pairingToken ?? '');
    setAutoStartOnBoot(settings.autoStartOnBoot);
    setWifiOnly(settings.wifiOnly);
    setDiscoverable(settings.discoverable);
  }, [settings]);

  const networkStatusLabel = useMemo(() => {
    if (!network) {
      return 'Detecting network…';
    }
    if (!network.isConnected) {
      return 'Offline';
    }
    if (network.type === 'WIFI') {
      return network.details?.ssid ? `Wi‑Fi · ${network.details.ssid}` : 'Wi‑Fi connected';
    }
    return 'Cellular connection';
  }, [network]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await update({
        endpoint: endpoint.trim() || null,
        pairingToken: pairingToken.trim() || null,
        autoStartOnBoot,
        wifiOnly,
        discoverable,
      });
    } catch (error) {
      Alert.alert('Unable to save settings', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <GradientContainer colors={['#274198']} style={styles.hero}>
          <Text style={styles.heroTitle}>Stay in sync</Text>
          <Text style={styles.heroSubtitle}>Make sure both devices share the same network to pair instantly.</Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{networkStatusLabel}</Text>
          </View>
        </GradientContainer>

        <View style={styles.surface}>
          <Text style={styles.sectionTitle}>Bridge connection</Text>
          <Text style={styles.sectionBody}>
            Paste the secure URL exposed by the macOS bridge. We autofill everything else for you.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="wss://mac.local:4000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={endpoint}
            onChangeText={setEndpoint}
          />
          <TextInput
            style={styles.input}
            placeholder="Pairing token (optional)"
            autoCapitalize="none"
            autoCorrect={false}
            value={pairingToken}
            onChangeText={setPairingToken}
          />
        </View>

        <View style={styles.surface}>
          <Text style={styles.sectionTitle}>Behaviour</Text>
          <SettingRow
            title="Launch watcher at boot"
            description="Reconnect automatically when your phone restarts."
            value={autoStartOnBoot}
            onValueChange={setAutoStartOnBoot}
          />
          <SettingRow
            title="Sync on Wi‑Fi only"
            description="Pause while on cellular to avoid untrusted networks."
            value={wifiOnly}
            onValueChange={setWifiOnly}
          />
          <SettingRow
            title="Make this device discoverable"
            description="When off, your mac won’t announce this phone to new pair requests."
            value={discoverable}
            onValueChange={setDiscoverable}
          />
        </View>

        <View style={styles.actions}>
          <Text style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]} onPress={handleSave}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Text>
          {!isReady && <Text style={styles.helper}>Loading your preferences…</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  content: {
    padding: 24,
    gap: 20,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    shadowColor: '#1c2a60',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
  },
  heroPill: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  heroPillText: {
    color: '#fff',
    fontWeight: '600',
  },
  surface: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#1e1f38',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111826',
  },
  sectionBody: {
    fontSize: 14,
    color: '#4b5563',
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingCopy: {
    flex: 1,
    gap: 6,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  actions: {
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#111827',
    color: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    fontSize: 16,
    fontWeight: '700',
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  helper: {
    fontSize: 12,
    color: '#6b7280',
  },
});
