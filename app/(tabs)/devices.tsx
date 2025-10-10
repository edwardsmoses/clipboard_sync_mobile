import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useClipboardHistory } from '@/context/clipboard-history-context';

export default function DevicesScreen() {
  const router = useRouter();
  const { entries, device, syncState } = useClipboardHistory();

  const connectedDevices = useMemo(() => {
    const map = new Map<string, { name: string; lastSeen: number }>();
    entries.forEach((entry) => {
      const previous = map.get(entry.deviceId);
      const lastSeen = Math.max(previous?.lastSeen ?? 0, entry.createdAt);
      map.set(entry.deviceId, { name: entry.deviceName, lastSeen });
    });
    return Array.from(map.entries()).map(([id, info]) => ({ id, ...info }));
  }, [entries]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.overline}>This device</Text>
          <Text style={styles.title}>{device?.name ?? 'Unnamed device'}</Text>
          <Text style={styles.subtitle}>
            {device?.platform ?? 'unknown'} • {syncState}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paired devices</Text>
          {connectedDevices.length === 0 ? (
            <Text style={styles.emptyText}>No other devices seen yet.</Text>
          ) : (
            connectedDevices.map((item) => (
              <View key={item.id} style={styles.deviceCard}>
                <View>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceMeta}>
                    Last synced {new Date(item.lastSeen).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/modal')}>
          <Text style={styles.primaryButtonText}>Pair new device</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  overline: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  deviceCard: {
    paddingVertical: 12,
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
