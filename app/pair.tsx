import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { StatusPill } from '@/components/StatusPill';
import { useSettings } from '@/context/settings-context';
import { decodePairingCode } from '@/lib/pairing/pairing-code';

export default function PairScreen() {
  const router = useRouter();
  const { update } = useSettings();
  const [code, setCode] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const formattedCode = useMemo(() => formatCodeDisplay(code), [code]);
  const isCodeComplete = code.length === 12;

  const handleChange = (value: string) => {
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/[IO10]/g, ''); // remove ambiguous characters
    setCode(cleaned.slice(0, 12));
  };

  const handleSubmit = async () => {
    const result = decodePairingCode(code);
    if (!result) {
      Alert.alert('Invalid code', 'Check the digits and try again.');
      return;
    }

    try {
      setSubmitting(true);
      await update({ endpoint: result.endpoint, pairingToken: null });
      Alert.alert('Connected', 'Your phone is now paired with the desktop bridge.', [
        { text: 'Done', onPress: () => router.replace('/(tabs)/devices') },
      ]);
    } catch (error) {
      Alert.alert('Unable to save', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell
      title="Pair with Mac"
      status={<StatusPill state="pairing" detail="Enter code from your Mac" />}
      rightAction={
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={18} color="#0f172a" />
        </Pressable>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.inputCard}>
            <MaterialIcons name="phonelink" size={28} color="#1d4ed8" />
            <Text style={styles.heroTitle}>Enter the one-time code</Text>
            <Text style={styles.heroSubtitle}>We skip O, I, 0, and 1 to prevent typos.</Text>

            <Text style={styles.label}>Code</Text>
            <TextInput
              value={formattedCode}
              onChangeText={handleChange}
              autoCapitalize="characters"
              keyboardType="ascii-capable"
              autoCorrect={false}
              style={styles.codeInput}
              placeholder="ABCD-EFGH-IJKL"
              placeholderTextColor="rgba(15,23,42,0.35)"
              maxLength={14}
            />
          </View>
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.primaryButton, (!isCodeComplete || isSubmitting) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isCodeComplete || isSubmitting}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Connecting…' : 'Connect'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function formatCodeDisplay(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const groups = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }
  return groups.filter(Boolean).join('-');
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  heroSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 6,
    paddingVertical: 10,
    borderRadius: 12,
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    color: '#0f172a',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    padding: 16,
    gap: 10,
    backgroundColor: '#f6f7fb',
  },
});
