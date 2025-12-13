import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useClipboardHistory } from '@/context/clipboard-history-context';
import { GradientContainer } from '@/components/ui/gradient-container';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entryId?: string }>();
  const { entries, copyEntryToClipboard } = useClipboardHistory();

  const entry = useMemo(
    () => entries.find((item) => item.id === params.entryId),
    [entries, params.entryId],
  );

  if (!entry) {
    return (
      <GradientContainer colors={['#1d4ed8']} style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Ready to pair?</Text>
        <Text style={styles.emptySubtitle}>Ask your Mac to show the pairing code, then tap the button below. We’ll reconnect you instantly.</Text>
        <View style={styles.steps}>
          <Text style={styles.stepText}>• Open clipboard sync on macOS</Text>
          <Text style={styles.stepText}>• Choose “Pair new device”</Text>
          <Text style={styles.stepText}>• Enter the code on this phone</Text>
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
    const copied = await copyEntryToClipboard(entry);
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
    padding: 22,
    gap: 16,
    backgroundColor: '#f6f7fb',
  },
  caption: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    fontSize: 14,
    color: '#475569',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryAction: {
    backgroundColor: '#4f8cff',
    color: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    textAlign: 'center',
    color: '#1d4ed8',
    fontSize: 14,
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
    color: '#e2e8f0',
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
