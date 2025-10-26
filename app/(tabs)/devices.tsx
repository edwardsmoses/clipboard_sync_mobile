import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useClipboardHistory } from '@/context/clipboard-history-context';
import { useSettings } from '@/context/settings-context';
import { useNetworkSummary } from '@/lib/network/network-status';
import { GradientContainer } from '@/components/ui/gradient-container';

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
    return 'Not on Wi‑Fi';
  }, [network]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <GradientContainer colors={[(isPaired ? '#065f46' : '#1e3a8a')]} style={styles.hero}>
          {isPaired ? (
            <>
              <Text style={styles.heroOverline}>Status</Text>
              <Text style={styles.heroTitle}>Paired successfully</Text>
              <Text style={styles.heroSubtitle}>
                Copy on either device to sync instantly. Keep both on the same Wi‑Fi for best results.
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
                Make sure both devices are awake and connected to the same Wi‑Fi network. Your Mac will show a one-time code when it’s ready.
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
        </GradientContainer>

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
          <Text style={styles.aboutTitle}>ClipBridge</Text>
          <Text style={styles.aboutSubtitle}>Built by Edwards Moses · edwardsmoses.com</Text>
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
    backgroundColor: '#eef2ff',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  hero: {
    borderRadius: 32,
    padding: 24,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  heroOverline: {
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTagText: {
    color: '#fff',
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
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  stepLabel: {
    color: '#f1f5ff',
    fontSize: 15,
  },
  heroButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  heroButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  surface: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    gap: 16,
    shadowColor: '#1e1f38',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  selfCard: {
    gap: 6,
  },
  selfName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  selfMeta: {
    fontSize: 14,
    color: '#6b7280',
  },
  selfStatus: {
    fontSize: 13,
    color: '#4b5563',
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
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusChipMuted: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
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
  aboutTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  aboutSubtitle: { fontSize: 13, color: '#6b7280' },
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
