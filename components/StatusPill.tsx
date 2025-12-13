import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type StatusKind = 'syncing' | 'offline' | 'waiting' | 'pairing';

const copy: Record<StatusKind, { label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  syncing: { label: 'Syncing', color: '#22c55e', icon: 'sync' },
  offline: { label: 'Offline', color: '#f97316', icon: 'cloud-off' },
  waiting: { label: 'Waiting', color: '#eab308', icon: 'hourglass-empty' },
  pairing: { label: 'Pairing', color: '#3b82f6', icon: 'phonelink' },
};

type Props = { state: StatusKind; detail?: string };

export function StatusPill({ state, detail }: Props) {
  const item = copy[state];
  return (
    <View style={[styles.pill, { backgroundColor: `${item.color}1A`, borderColor: `${item.color}33` }]}>
      <MaterialIcons name={item.icon} size={16} color={item.color} />
      <Text style={[styles.label, { color: item.color }]}>{item.label}</Text>
      {detail ? (
        <Text style={[styles.detail, { color: item.color }]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    fontWeight: '500',
  },
});
