import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientContainer } from '@/components/ui/gradient-container';
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <GradientContainer colors={['#1d4ed8']} style={styles.hero}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios" size={18} color="#dbeafe" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <MaterialIcons name="phonelink" size={36} color="#dbeafe" />
          <Text style={styles.heroTitle}>Pair this phone</Text>
          <Text style={styles.heroSubtitle}>
            Enter the one-time code shown on your Mac. We&apos;ll set up the secure connection instantly.
          </Text>
        </GradientContainer>

        <View style={styles.content}>
          <View style={styles.inputCard}>
            <Text style={styles.label}>One-time code</Text>
            <TextInput
              value={formattedCode}
              onChangeText={handleChange}
              autoCapitalize="characters"
              keyboardType="ascii-capable"
              autoCorrect={false}
              style={styles.codeInput}
              placeholder="ABCD-EFGH-IJKL"
              placeholderTextColor="rgba(15,23,42,0.3)"
              maxLength={14}
            />
            <Text style={styles.helpText}>Codes skip O, I, 0, and 1 to avoid typos.</Text>
          </View>

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
    </SafeAreaView>
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
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  hero: {
    padding: 24,
    gap: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backButtonText: {
    color: '#dbeafe',
    fontWeight: '600',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: '#1e1f38',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    paddingVertical: 12,
    borderRadius: 16,
    textAlign: 'center',
    backgroundColor: '#eef2ff',
    color: '#0f172a',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});
