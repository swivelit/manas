import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Pressable } from 'react-native';
import { usePathname } from 'expo-router';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Button } from './Button';
import { getAssistantGuide } from '../data/manas';

const contextMessages: Record<string, string> = {
  '/': "Welcome! I'm Manas, your guide. Start with Emotional Healing, Coaching, or the Library, then I can point you to the next step.",
  '/onboarding': 'This is the welcome screen. Continue to sign in or create an account so your sessions, progress, and preferences can be saved.',
  '/(auth)': 'Use this auth screen to sign in with email, Google, or mobile OTP where available. If a provider is not configured yet, use email OTP for testing.',
  '/(auth)/login': 'Sign in here. Enter your email to request an OTP, or use Google when production credentials are configured.',
  '/(auth)/register': 'Create your MANAS account here. Add your name and email, verify the OTP, then continue to the home tabs.',
  '/(auth)/phone': 'Use mobile OTP here. Enter your phone number, request the code, then verify it to continue.',
  '/(tabs)': 'This is Home. Review your mood prompt, choose Emotional Healing or Coaching, book a free demo, or open your upcoming session.',
  '/(tabs)/topics': 'These are Emotional Healing topics. Search a feeling, open a topic, then choose a coach and booking time.',
  '/topics/emotional-healing-list': 'These are the Emotional Healing topics. Pick the topic that fits what you want to work through, then choose a coach.',
  '/coaching': 'This is Coaching. Pick a growth topic, review the detail page, then book a demo with an available coach.',
  '/topics': 'This topic page explains the focus area. Use the heart to save it, review coach options, or book a free demo.',
  '/booking': 'This booking page shows coach availability in your timezone. Select a date, time slot, and video, audio, or chat session before confirming.',
  '/(tabs)/videos': 'The Library has free and premium videos. Public videos open without signing in; bookmarks and progress are saved after you sign in.',
  '/video': 'This video page lets you watch, resume progress, and bookmark after signing in. Premium videos show a safe upgrade prompt.',
  '/(tabs)/sessions': 'Your sessions live here. Review upcoming or past bookings, then join confirmed sessions inside the join window.',
  '/session': 'This session detail shows the coach, topic, time, session type, and meeting link when it is ready.',
  '/(tabs)/profile': "This is Profile. Review your saved journey, session history, and account actions.",
  '/mood': "This mood page records how you're feeling today. Pick the closest option and add a note if it helps.",
};

const VOICE_PREF_KEY = 'manas_voice_enabled';

function getContextMessage(path: string): string {
  if (path.includes('chronic-anxiety')) return getAssistantGuide(path);
  if (contextMessages[path]) return contextMessages[path];

  const prefix = Object.keys(contextMessages)
    .filter(key => key !== '/' && path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return prefix ? contextMessages[prefix] : getAssistantGuide(path);
}

export function MascotAssistant() {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const pathname = usePathname();
  const message = getContextMessage(pathname);

  useEffect(() => {
    SecureStore.getItemAsync(VOICE_PREF_KEY).then(v => setVoiceEnabled(v === '1'));
  }, []);

  useEffect(() => {
    if (open && voiceEnabled) {
      void handleSpeak();
    }
    return () => {
      Speech.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSpeak() {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(message, {
      rate: 0.95,
      pitch: 1.05,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function toggleVoicePref() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    await SecureStore.setItemAsync(VOICE_PREF_KEY, next ? '1' : '0');
    if (!next) {
      await Speech.stop();
      setSpeaking(false);
    }
  }

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.85} style={styles.fab}>
        <Image source={require('../assets/mascot.jpg')} style={styles.fabImg} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.overlay} onPress={e => e.stopPropagation()}>
            <Image source={require('../assets/mascot.jpg')} style={styles.mascotImg} />
            <View style={styles.bubble}>
              <View style={styles.titleRow}>
                <Text style={styles.guideLabel}>MANAS · GUIDE</Text>
                <TouchableOpacity onPress={handleSpeak} hitSlop={8} style={styles.speakerBtn} accessibilityLabel="Read aloud">
                  <Text style={[styles.speakerGlyph, speaking && styles.speakerGlyphActive]}>
                    {speaking ? '⏹' : '♪'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleVoicePref} hitSlop={8} style={styles.voiceToggle} accessibilityLabel="Toggle voice guidance">
                  <Text style={[styles.voiceToggleText, voiceEnabled && styles.voiceToggleActive]}>
                    Voice {voiceEnabled ? 'on' : 'off'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                <Button label="✿ Got it" variant="pill-dark" onPress={() => setOpen(false)} />
                <Button label="Maybe later" variant="pill-light" onPress={() => setOpen(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 99,
    overflow: 'hidden',
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  fabImg: { width: '100%', height: '100%', borderRadius: 99 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', padding: 18 },
  overlay: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  mascotImg: { width: 54, height: 54, borderRadius: 99 },
  bubble: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, letterSpacing: 1.5, flex: 1 },
  speakerBtn: { padding: 2 },
  speakerGlyph: { fontFamily: fontFamilies.dmSansBold, fontSize: 13, color: colors.muted },
  speakerGlyphActive: { color: colors.pink },
  voiceToggle: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.creamDeep },
  voiceToggleText: { fontFamily: fontFamilies.dmSans, fontSize: 8, color: colors.muted, letterSpacing: 0.5 },
  voiceToggleActive: { color: colors.ink, fontFamily: fontFamilies.dmSansMedium },
  message: { fontFamily: fontFamilies.fraunces, fontSize: 12, color: colors.ink, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
