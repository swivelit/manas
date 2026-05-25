import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

interface MoodCheckInProps {
  onPress: () => void;
}

export function MoodCheckIn({ onPress }: MoodCheckInProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.container}>
      <View style={styles.ico}>
        <Text style={styles.emoji}>☼</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>HOW ARE YOU FEELING TODAY?</Text>
        <Text style={styles.cta}>Tap to check in</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 22,
    marginBottom: 18,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ico: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  text: { flex: 1 },
  label: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
  cta: { fontFamily: fontFamilies.frauncesMedium, fontSize: 12, color: colors.ink, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 20 },
});
