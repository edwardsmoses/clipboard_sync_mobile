import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useClipboardHistory } from '@/context/clipboard-history-context';
import { copyTextToClipboard } from '@/lib/clipboard/monitor';
import { GradientContainer } from '@/components/ui/gradient-container';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entryId?: string }>();
  const { entries } = useClipboardHistory();

  const entry = useMemo(
    () => entries.find((item) => item.id === params.entryId),
    [entries, params.entryId],
  );

  if (!entry) {
    return (
      <GradientContainer colors={['#1d4ed8']} style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Ready to pair?</Text>
        <Text style={styles.emptySubtitle}>
          Ask your Mac to show the pairing QR code, then tap the button below. We’ll reconnect you instantly.
        </Text>
        <View style={styles.steps}>
          <Text style={styles.stepText}>• Open clipboard sync on macOS</Text>
          <Text style={styles.stepText}>• Choose “Pair new device”</Text>
          <Text style={styles.stepText}>• Scan the QR with this phone</Text>
        </View>
        <Text style={styles.heroLink} onPress={() => router.back()}>
          Return to devices
        </Text>
      </GradientContainer>
    );
  }

  const handleCopy = async () => {
    if (!entry.text) {
      return;
    }
    const copied = await copyTextToClipboard(entry.text);
    if (copied) {
      Alert.alert('Copied', 'The clipboard entry has been copied.');
    } else {
      Alert.alert('Unable to copy', 'Clipboard access is not available in this environment.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.caption}>Entry details</Text>
      <Text style={styles.title}>{entry.deviceName}</Text>
      <Text style={styles.body}>Captured {new Date(entry.createdAt).toLocaleString()}</Text>

      <View style={styles.card}>
        <Text selectable style={styles.content}>
          {entry.text ?? '[Unsupported clipboard content]'}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Content type</Text>
        <Text style={styles.metaValue}>{entry.contentType}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Sync state</Text>
        <Text style={styles.metaValue}>{entry.syncState}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Entry ID</Text>
        <Text style={styles.metaValue}>{entry.id}</Text>
      </View>

      <Text style={styles.primaryAction} onPress={handleCopy}>
        Copy to clipboard
      </Text>
      <Text style={styles.secondaryAction} onPress={() => router.back()}>
        Close
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: '#F9FAFB',
  },
  caption: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1F2937',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryAction: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    textAlign: 'center',
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  link: {
    marginTop: 24,
    color: '#2563EB',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    padding: 32,
    gap: 18,
    justifyContent: 'center',
    borderRadius: 32,
    margin: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
  },
  steps: {
    gap: 8,
  },
  stepText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  heroLink: {
    marginTop: 12,
    color: '#facc15',
    fontWeight: '600',
    fontSize: 16,
  },
});
