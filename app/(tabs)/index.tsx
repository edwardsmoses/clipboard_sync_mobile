import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useClipboardHistory } from "@/context/clipboard-history-context";
import { copyTextToClipboard } from "@/lib/clipboard/monitor";
import { GradientContainer } from "@/components/ui/gradient-container";
import type { ClipboardEntry } from "@/lib/models/clipboard";
import { useSettings } from "@/context/settings-context";

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, isReady, syncState, refresh, togglePin, remove, clearAll } =
    useClipboardHistory();
  const { settings } = useSettings();
  const [query, setQuery] = useState("");
  const [isRefreshing, setRefreshing] = useState(false);
  const isPaired = Boolean(settings.endpoint);

  const filteredEntries = useMemo<ClipboardEntry[]>(() => {
    if (!query.trim()) {
      return entries;
    }
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) =>
      (entry.text ?? "").toLowerCase().includes(needle)
    );
  }, [entries, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <GradientContainer colors={["#1d4ed8"]} style={styles.hero}>
        <Text style={styles.heroTitle}>Clipboard vault</Text>
        <Text style={styles.heroSubtitle}>
          Your snippets travel with you. Tap to reuse instantly.
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroChip}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(syncState) },
              ]}
            />
            <Text style={styles.heroChipText}>
              {formatSyncState(syncState)}
            </Text>
          </View>
          <View style={styles.heroChip}>
            <MaterialIcons name="layers" color="#dbeafe" size={16} />
            <Text style={styles.heroChipText}>{entries.length} saved</Text>
          </View>
        </View>
        {!isPaired && (
          <Pressable style={styles.pairCta} onPress={() => router.push("/pair")}>
            <MaterialIcons name="phonelink" size={16} color="#0f172a" />
            <Text style={styles.pairCtaText}>Pair a device</Text>
          </Pressable>
        )}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="rgba(15,23,42,0.55)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your clipboard"
            placeholderTextColor="rgba(15,23,42,0.55)"
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.searchBadge}>
            <Text style={styles.searchBadgeText}>{filteredEntries.length}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (entries.length === 0) return;
            Alert.alert(
              "Delete all history?",
              "This removes all saved items on this phone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete all",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      await clearAll();
                      await refresh();
                    })();
                  },
                },
              ]
            );
          }}
          style={({ pressed }) => [
            styles.clearAllButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons
            name="delete-sweep"
            size={16}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={styles.clearAllText}>Delete all</Text>
        </Pressable>
      </GradientContainer>

      <FlashList<ClipboardEntry>
        data={filteredEntries}
        estimatedItemSize={160}
        keyExtractor={(item: ClipboardEntry) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }: { item: ClipboardEntry }) => (
          <HistoryListItem
            entry={item}
            onTogglePin={() => togglePin(item.id, !item.isPinned)}
            onDelete={() => remove(item.id)}
            onInspect={() =>
              router.push({ pathname: "/modal", params: { entryId: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          isReady ? (
            <View style={[styles.emptyState, {}]}>
              <MaterialIcons name="inbox" size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>
                {isPaired ? 'Waiting for your first copy' : 'Pair to get started'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isPaired
                  ? 'Copy anything on your phone or Mac and it will appear here.'
                  : 'Pair this phone with your Mac to start syncing. Tap “Pair a device” above.'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="hourglass-empty" size={36} color="#94a3b8" />
              <Text style={styles.emptySubtitle}>
                Preparing clipboard watcher…
              </Text>
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

function HistoryListItem({
  entry,
  onTogglePin,
  onDelete,
  onInspect,
}: HistoryListItemProps) {
  const createdAt = new Date(entry.createdAt);
  const formattedTime = `${createdAt.toLocaleDateString()} · ${createdAt.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;

  const handleCopy = async () => {
    if (!entry.text) {
      return;
    }
    const copied = await copyTextToClipboard(entry.text);
    if (copied) {
      await Haptics.selectionAsync();
    }
  };

  return (
    <Pressable
      onPress={handleCopy}
      onLongPress={onInspect}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <MaterialIcons
          name={getContentIcon(entry.contentType)}
          size={16}
          color="#2563eb"
        />
        <Text style={styles.cardDevice}>{entry.deviceName}</Text>
        <Text style={styles.cardTimestamp}>{formattedTime}</Text>
      </View>
      <Text style={styles.cardText} numberOfLines={3}>
        {entry.text ?? "[Unsupported clipboard content]"}
      </Text>
      <View style={styles.cardFooter}>
        <Text
          style={[styles.pill, entry.isPinned && styles.pillActive]}
          onPress={onTogglePin}
        >
          {entry.isPinned ? "Pinned" : "Pin"}
        </Text>
        <Text style={[styles.pill, styles.deletePill]} onPress={onDelete}>
          Delete
        </Text>
      </View>
    </Pressable>
  );
}

function getStatusColor(state: string) {
  switch (state) {
    case "connected":
      return "#4ade80";
    case "error":
      return "#f87171";
    default:
      return "#fbbf24";
  }
}

function formatSyncState(state: string) {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function getContentIcon(contentType: ClipboardEntry["contentType"]) {
  switch (contentType) {
    case "image":
      return "image";
    case "html":
      return "code";
    case "file":
      return "attach-file";
    default:
      return "text-snippet";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  containerDark: {
    backgroundColor: "#0f172a",
  },
  hero: {
    padding: 24,
    paddingBottom: 32,
    gap: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#0f172a",
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#f8fafc",
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(248,250,252,0.8)",
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
  },
  clearAllButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  clearAllText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: 13,
  },
  pairCta: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pairCtaText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroChipText: {
    color: "#dbeafe",
    fontWeight: "600",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  searchBar: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(248,250,252,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
  },
  searchBadge: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  searchBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  listContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 120,
    backgroundColor: "#eef2ff",
  },
  separator: { height: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDevice: {
    flex: 1,
    fontWeight: "600",
    color: "#111827",
  },
  cardTimestamp: {
    fontSize: 12,
    color: "#9ca3af",
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2937",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
  },
  pill: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "transparent",
    color: "#6b7280",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
  },
  pillActive: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  deletePill: {
    backgroundColor: "transparent",
    color: "#b91c1c",
    borderColor: "#fecaca",
  },
  emptyState: {
    marginTop: 72,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
