import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSettings } from '@/context/settings-context';

export default function SettingsScreen() {
  const { settings, update, isReady } = useSettings();
  const [endpoint, setEndpoint] = useState(settings.endpoint ?? '');
  const [pairingToken, setPairingToken] = useState(settings.pairingToken ?? '');
  const [autoStartOnBoot, setAutoStartOnBoot] = useState(settings.autoStartOnBoot);
  const [wifiOnly, setWifiOnly] = useState(settings.wifiOnly);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    setEndpoint(settings.endpoint ?? '');
    setPairingToken(settings.pairingToken ?? '');
    setAutoStartOnBoot(settings.autoStartOnBoot);
    setWifiOnly(settings.wifiOnly);
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await update({
        endpoint: endpoint.trim() || null,
        pairingToken: pairingToken.trim() || null,
        autoStartOnBoot,
        wifiOnly,
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
        <Text style={styles.heading}>Sync preferences</Text>
        <Text style={styles.description}>
          Configure how this device connects to your desktop bridge and how clipboard data is synced.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Bridge endpoint</Text>
          <TextInput
            style={styles.input}
            placeholder="wss://hostname:port"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={endpoint}
            onChangeText={setEndpoint}
          />
          <Text style={styles.helper}>This is provided by the macOS app after pairing.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Pairing token</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional token"
            autoCapitalize="none"
            autoCorrect={false}
            value={pairingToken}
            onChangeText={setPairingToken}
          />
          <Text style={styles.helper}>Use the one-time code displayed on mac during pairing.</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Launch service at boot</Text>
            <Text style={styles.helper}>Keeps the clipboard watcher running after device restarts.</Text>
          </View>
          <Switch value={autoStartOnBoot} onValueChange={setAutoStartOnBoot} />
        </View>

        <View style={styles.cardRow}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Sync on Wi-Fi only</Text>
            <Text style={styles.helper}>Pause sync while on cellular data to save bandwidth.</Text>
          </View>
          <Switch value={wifiOnly} onValueChange={setWifiOnly} />
        </View>

        <View style={styles.actions}>
          <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Text>
          {!isReady && <Text style={styles.helper}>Loading your settings…</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 24,
    gap: 18,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  actions: {
    alignItems: 'flex-start',
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    fontSize: 16,
    fontWeight: '700',
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
});
