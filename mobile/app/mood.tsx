import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCreateMoodEntry } from '../lib/queries';
import { useAuthStore } from '../lib/auth';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

const MOODS = [
  { value: 1, emoji: '⛈', label: 'Very low' },
  { value: 2, emoji: '☁', label: 'Low' },
  { value: 3, emoji: '☼', label: 'Okay' },
  { value: 4, emoji: '✿', label: 'Good' },
  { value: 5, emoji: '✦', label: 'Great' },
];

export default function MoodScreen() {
  const token = useAuthStore(s => s.token);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateMoodEntry();

  async function handleSubmit() {
    if (selected == null) { Alert.alert('Pick how you\'re feeling'); return; }
    if (!token) {
      Alert.alert(
        'Sign in to save',
        'Create an account to keep a record of how you\'re feeling over time.',
        [
          { text: 'Maybe later', style: 'cancel', onPress: () => router.back() },
          { text: 'Sign in', onPress: () => router.replace('/(auth)/login') },
        ]
      );
      return;
    }
    try {
      await create.mutateAsync({ mood: selected, note: note.trim() || undefined });
      setSubmitted(true);
      setTimeout(() => router.back(), 1100);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.thanksWrap}>
          <Text style={styles.thanksEmoji}>✿</Text>
          <Text style={styles.thanksTitle}>Thanks for{'\n'}<Text style={styles.thanksTitleItalic}>checking in.</Text></Text>
          <Text style={styles.thanksSub}>Noticing how you feel is the first kindness.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>How are{'\n'}<Text style={styles.headingItalic}>you, really?</Text></Text>
          <Text style={styles.sub}>Pick the one that feels closest. There are no wrong answers.</Text>

          <View style={styles.moodRow}>
            {MOODS.map(m => {
              const active = selected === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setSelected(m.value)}
                  activeOpacity={0.85}
                  style={[styles.moodChip, active && styles.moodChipActive]}
                >
                  <Text style={[styles.moodEmoji, active && styles.moodEmojiActive]}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noteWrap}>
            <Text style={styles.noteLabel}>A NOTE FOR YOURSELF (OPTIONAL)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="What's behind today's feeling?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={selected == null || create.isPending}
            activeOpacity={0.88}
            style={[styles.submit, (selected == null || create.isPending) && styles.submitDisabled]}
          >
            <Text style={styles.submitText}>{create.isPending ? 'Saving…' : 'Save check-in'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 32 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  backText: { fontSize: 18, color: colors.ink },
  heading: { fontFamily: fontFamilies.fraunces, fontSize: 32, color: colors.ink, letterSpacing: -0.5, lineHeight: 34 },
  headingItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 12.5, color: colors.muted, marginTop: 10, marginBottom: 26 },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 22 },
  moodChip: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  moodChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  moodEmoji: { fontSize: 22, color: colors.ink },
  moodEmojiActive: { color: colors.pinkSoft },
  moodLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, textAlign: 'center' },
  moodLabelActive: { color: colors.cream, fontFamily: fontFamilies.dmSansMedium },
  noteWrap: { gap: 6 },
  noteLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 1.5, color: colors.muted },
  noteInput: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    fontFamily: fontFamilies.dmSans,
    fontSize: 13,
    color: colors.ink,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  submit: { marginTop: 22, backgroundColor: colors.ink, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  thanksWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  thanksEmoji: { fontSize: 44, color: colors.pink, marginBottom: 8 },
  thanksTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 28, color: colors.ink, textAlign: 'center', lineHeight: 30 },
  thanksTitleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  thanksSub: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 12 },
});
