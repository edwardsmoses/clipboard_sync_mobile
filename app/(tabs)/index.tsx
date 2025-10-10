import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { useClipboardHistory } from '@/context/clipboard-history-context';
import type { ClipboardEntry } from '@/lib/models/clipboard';

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, isReady, syncState, refresh, togglePin, remove } = useClipboardHistory();
  const [query, setQuery] = useState('');
  const [isRefreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const filteredEntries = useMemo<ClipboardEntry[]>(() => {
    if (!query.trim()) {
      return entries;
    }
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => (entry.text ?? '').toLowerCase().includes(needle));
  }, [entries, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const statusColor = syncState === 'connected' ? '#25D366' : syncState === 'error' ? '#FF5252' : '#FFA500';

  return (
    <SafeAreaView style={[styles.container, colorScheme === 'dark' && styles.containerDark]}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText} numberOfLines={1}>
            {syncState.charAt(0).toUpperCase() + syncState.slice(1)}
          </Text>
        </View>
        <Text style={styles.title}>Clipboard history</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Tap an item to copy it back. Long press for more actions.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clipboard..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.searchActions}>
          <Text style={styles.counter}>{filteredEntries.length}</Text>
          <Text style={styles.counterLabel}>items</Text>
        </View>
      </View>

      <FlashList<ClipboardEntry>
        data={filteredEntries}
        estimatedItemSize={120}
        keyExtractor={(item: ClipboardEntry) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: ClipboardEntry }) => (
          <HistoryListItem
            entry={item}
            onTogglePin={() => togglePin(item.id, !item.isPinned)}
            onDelete={() => remove(item.id)}
            onInspect={() => router.push({ pathname: '/modal', params: { entryId: item.id } })}
          />
        )}
        ListEmptyComponent={
          isReady ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptySubtitle}>
                Copy something and it will appear here instantly.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptySubtitle}>Preparing clipboard watcher…</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

interface HistoryListItemProps {
  entry: ClipboardEntry;
  onTogglePin(): void;
  onDelete(): void;
  onInspect(): void;
}

function HistoryListItem({ entry, onTogglePin, onDelete, onInspect }: HistoryListItemProps) {
  const [isPressed, setPressed] = useState(false);

  const handleCopy = async () => {
    if (entry.text) {
      await Clipboard.setStringAsync(entry.text);
      await Haptics.selectionAsync();
    }
  };

  const createdAt = new Date(entry.createdAt);
  const formattedTime = `${createdAt.toLocaleDateString()} • ${createdAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <View style={[styles.card, isPressed && styles.cardPressed]}>
      <Text
        style={styles.cardText}
        numberOfLines={4}
        onPress={handleCopy}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onLongPress={onInspect}>
        {entry.text ?? '[Unsupported clipboard content]'}
      </Text>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.metaPrimary}>{entry.deviceName}</Text>
          <Text style={styles.metaSecondary}>{formattedTime}</Text>
        </View>
        <View style={styles.actionsRow}>
          <Text style={[styles.pill, entry.isPinned && styles.pillActive]} onPress={onTogglePin}>
            {entry.isPinned ? 'Pinned' : 'Pin'}
          </Text>
          <Text style={styles.pill} onPress={onDelete}>
            Delete
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    color: '#888',
  },
  title: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchActions: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  counter: {
    fontSize: 18,
    fontWeight: '600',
  },
  counterLabel: {
    fontSize: 12,
    color: '#999',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1A1A1A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  metaSecondary: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    color: '#3B82F6',
    overflow: 'hidden',
  },
  pillActive: {
    backgroundColor: '#FDE68A',
    color: '#92400E',
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
