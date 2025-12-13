import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';

type Props = {
  title: string;
  status?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScreenShell({ title, status, rightAction, children, contentStyle }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{title}</Text>
          {status ? <View style={styles.status}>{status}</View> : null}
        </View>
        {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleColumn: { gap: 6 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
