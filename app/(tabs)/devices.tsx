import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useClipboardHistory } from '@/context/clipboard-history-context';
import { useSettings } from '@/context/settings-context';
import { useNetworkSummary } from '@/lib/network/network-status';
const palette = {
  background: '#f6f7fb',
  surface: '#ffffff',
  border: 'rgba(15,23,42,0.06)',
  accent: '#4f8cff',
  text: '#0f172a',
  muted: '#64748b',
};

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function DevicesScreen() {
  const router = useRouter();
  const { entries, device, syncState, serverName } = useClipboardHistory();
  const { settings, update } = useSettings();
  const network = useNetworkSummary(6000);
  const isConnected = syncState === 'connected';
  const isPaired = Boolean(settings.endpoint);
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'dev';
  const updateFingerprint = Updates.updateId ?? Updates.manifest?.id ?? null;

  const connectedDevices = useMemo(() => {
    const map = new Map<string, { name: string; lastSeen: number }>();
    entries.forEach((entry) => {
      const previous = map.get(entry.deviceId);
      const lastSeen = Math.max(previous?.lastSeen ?? 0, entry.createdAt);
      map.set(entry.deviceId, { name: entry.deviceName, lastSeen });
    });
    return Array.from(map.entries()).map(([id, info]) => ({ id, ...info }));
  }, [entries]);

  const networkBadge = useMemo(() => {
    if (!network) {
      return 'Checking network…';
    }
    if (!network.isConnected) {
      return 'Offline';
    }
    if (network.type === 'WIFI') {
      return network.details?.ssid ? `Wi‑Fi · ${network.details.ssid}` : 'Wi‑Fi connected';
    }
    return 'Online';
  }, [network]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {isPaired ? (
            <>
              <Text style={styles.heroOverline}>Status</Text>
              <Text style={styles.heroTitle}>Paired successfully</Text>
              <Text style={styles.heroSubtitle}>
                Copy on either device to sync instantly over the secure relay. Works anywhere you have an internet connection.
              </Text>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{isConnected ? 'Connected' : 'Connecting…'} · {networkBadge}</Text>
              </View>
              <Pressable
                style={[styles.heroButton, { backgroundColor: '#fee2e2' }]}
                onPress={() => {
                  Alert.alert('Forget pairing?', 'This will disconnect from the desktop bridge.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Forget',
                      style: 'destructive',
                      onPress: () => void update({ endpoint: null, pairingToken: null }),
                    },
                  ]);
                }}>
                <Text style={[styles.heroButtonText, { color: '#991b1b' }]}>Forget pairing</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.heroOverline}>Quick pairing</Text>
              <Text style={styles.heroTitle}>Bring your Mac nearby</Text>
              <Text style={styles.heroSubtitle}>
                Open the macOS companion to generate a one-time code. Enter it below to pair.
              </Text>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{networkBadge}</Text>
              </View>
              <View style={styles.heroSteps}>
                <Step index={1} label="Open the macOS companion" />
                <Step index={2} label="Tap Pair new device" />
                <Step index={3} label="Enter the code shown on your Mac" />
              </View>
              <Pressable style={styles.heroButton} onPress={() => router.push('/pair')}>
                <Text style={styles.heroButtonText}>Pair a device</Text>
              </Pressable>
            </>
          )}
        </View>

        {isPaired && (
          <View style={styles.surface}>
            <Text style={styles.sectionTitle}>Active connection</Text>
            <View style={styles.selfCard}>
              <Text style={styles.selfName}>{serverName ?? 'Desktop bridge'}</Text>
              <Text style={styles.selfMeta}>macOS companion</Text>
              <Text style={[styles.statusChip, isConnected ? styles.statusChipPositive : styles.statusChipMuted]}>
                {isConnected ? 'Connected' : 'Connecting…'}
              </Text>
              <Text style={styles.selfStatus}>Syncs in real time</Text>
            </View>
          </View>
        )}

        <View style={styles.surface}>
          <Text style={styles.sectionTitle}>This phone</Text>
          <View style={styles.selfCard}>
            <Text style={styles.selfName}>{device?.name ?? 'Unnamed device'}</Text>
            <Text style={styles.selfMeta}>{device?.platform ?? 'unknown platform'}</Text>
            <Text style={[styles.statusChip, settings.discoverable ? styles.statusChipPositive : styles.statusChipMuted]}>
              {settings.discoverable ? 'Discoverable' : 'Hidden from new pairings'}
            </Text>
            <Text style={styles.selfStatus}>Sync state · {syncState}</Text>
          </View>
        </View>

        <View style={styles.surface}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Make this device discoverable</Text>
              <Text style={styles.settingDescription}>Allow new pair requests from your Mac.</Text>
            </View>
            <Switch value={settings.discoverable} onValueChange={(v) => void update({ discoverable: v })} />
          </View>
        </View>

        <View style={styles.surface}>
          <Text style={styles.sectionTitle}>Recently seen devices</Text>
          {connectedDevices.length === 0 ? (
            <Text style={styles.emptyCopy}>No history yet. Pair with your Mac to see it here.</Text>
          ) : (
            connectedDevices.map((item) => (
              <View key={item.id} style={styles.deviceRow}>
                <View style={styles.deviceColumn}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceTimestamp}>Last synced {formatTimestamp(item.lastSeen)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.aboutSection}>
          <View style={styles.aboutHeader}>
            <Text style={styles.aboutTitle}>ClipBridge</Text>
            <Text style={styles.versionBadge}>v{appVersion}</Text>
          </View>
          <Text style={styles.aboutSubtitle}>Built by Edwards Moses · edwardsmoses.com</Text>
          {updateFingerprint ? (
            <Text style={styles.aboutCaption}>Update fingerprint: {updateFingerprint}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ index, label }: { index: number; label: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{index}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  hero: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  heroOverline: {
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.4,
    color: palette.muted,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  heroSubtitle: {
    fontSize: 13,
    color: palette.muted,
    lineHeight: 22,
  },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  heroTagText: {
    color: palette.text,
    fontWeight: '600',
  },
  heroSteps: {
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: palette.text,
    fontWeight: '700',
  },
  stepLabel: {
    color: palette.text,
    fontSize: 15,
  },
  heroButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#e8edff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  heroButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 15,
  },
  surface: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  selfCard: {
    gap: 6,
  },
  selfName: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  selfMeta: {
    fontSize: 14,
    color: palette.muted,
  },
  selfStatus: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipPositive: {
    backgroundColor: '#e8edff',
    color: '#1d4ed8',
  },
  statusChipMuted: {
    backgroundColor: '#f3f4f6',
    color: palette.muted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingCopy: { flex: 1, gap: 4 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  settingDescription: { fontSize: 13, color: '#6b7280' },
  emptyCopy: {
    fontSize: 14,
    color: '#6b7280',
  },
  aboutSection: { gap: 4, paddingHorizontal: 4 },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e8edff',
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  aboutSubtitle: { fontSize: 13, color: palette.muted },
  aboutCaption: { fontSize: 12, color: '#9ca3af' },
  deviceRow: {
    paddingVertical: 14,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceColumn: {
    gap: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  deviceTimestamp: {
    fontSize: 13,
    color: '#6b7280',
  },
});
