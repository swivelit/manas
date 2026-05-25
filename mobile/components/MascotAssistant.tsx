import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Pressable } from 'react-native';
import { usePathname } from 'expo-router';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Button } from './Button';

const contextMessages: Record<string, string> = {
  '/': 'Welcome! I\'m Manas, your guide here. Tap any section to explore, or ask me where to start.',
  '/(tabs)': 'This is your home — your mood, your path, your upcoming sessions. What would you like to do today?',
  '/(tabs)/topics': 'These are the healing spaces available to you. Each one is a gentle journey, not a destination.',
  '/(tabs)/videos': 'The Library holds therapist-led videos for you to watch anytime — before or after a session.',
  '/(tabs)/sessions': 'Your sessions live here. You can book new ones or revisit past conversations.',
  '/(tabs)/profile': 'This is your journey. Everything you\'ve explored, watched, and healed is tracked here.',
};

function getContextMessage(path: string): string {
  for (const key of Object.keys(contextMessages)) {
    if (path.startsWith(key)) return contextMessages[key];
  }
  return 'I\'m here to help you navigate. Tap anything you\'re curious about!';
}

export function MascotAssistant() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const message = getContextMessage(pathname);

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
              <Text style={styles.guideLabel}>MANAS · GUIDE</Text>
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
  guideLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, letterSpacing: 1.5 },
  message: { fontFamily: fontFamilies.fraunces, fontSize: 12, color: colors.ink, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
