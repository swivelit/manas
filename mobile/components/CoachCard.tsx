import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Icon } from './Icon';

const avatarGradients = [
  { start: '#FFD6EC', end: colors.pink },
  { start: '#CCE0FF', end: colors.blue },
  { start: '#E0D4F5', end: colors.purple },
];

interface Coach {
  id: string;
  specialty: string;
  yearsExp: number;
  rating: number;
  languages: string[];
  user: { name: string; avatarUrl: string | null };
}

interface CoachCardProps {
  coach: Coach;
  index: number;
  onPress: () => void;
}

export function CoachCard({ coach, index, onPress }: CoachCardProps) {
  const grad = avatarGradients[index % avatarGradients.length];
  const coachName = coach.user?.name ?? 'MANAS coach';
  const rating = typeof coach.rating === 'number' ? coach.rating.toFixed(1) : 'New';
  const languages = Array.isArray(coach.languages) && coach.languages.length > 0
    ? coach.languages.join(' · ')
    : 'Languages pending';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={[styles.av, { backgroundColor: grad.end }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{coachName}</Text>
        <Text style={styles.specialty}>{coach.specialty ?? 'Psychologist'} · {coach.yearsExp ?? 0} yrs</Text>
        <View style={styles.meta}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.metaText}>{rating}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{languages}</Text>
        </View>
      </View>
      <View style={styles.cta}>
        <Icon name="chevron_right" size={14} color={colors.ink} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  av: {
    width: 54,
    height: 54,
    borderRadius: 16,
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { fontFamily: fontFamilies.frauncesMedium, fontSize: 14, color: colors.ink, lineHeight: 16 },
  specialty: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  star: { color: '#F5A623', fontSize: 10 },
  metaText: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.inkSoft },
  dot: { width: 3, height: 3, borderRadius: 99, backgroundColor: '#DDD' },
  cta: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
