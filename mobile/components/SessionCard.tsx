import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Icon } from './Icon';

interface Session {
  id: string;
  scheduledAt: string;
  type: string;
  status: string;
  topic: { name: string };
  coach: { user: { name: string } };
}

interface SessionCardProps {
  session: Session;
  accentColor?: string;
  onPress?: () => void;
}

export function SessionCard({ session, accentColor = colors.ink, onPress }: SessionCardProps) {
  const date = new Date(session.scheduledAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={[styles.dateBox, { backgroundColor: accentColor }]}>
        <Text style={styles.dateNum}>{format(date, 'd')}</Text>
        <Text style={styles.dateMon}>{format(date, 'MMM').toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{session.topic.name} · Demo</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{session.coach.user.name}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{format(date, 'h:mm a')}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{session.type}</Text>
        </View>
      </View>
      <Icon name="chevron_right" size={14} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  dateBox: {
    width: 42,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 5,
  },
  dateNum: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.cream, lineHeight: 16 },
  dateMon: { fontFamily: fontFamilies.dmSans, fontSize: 8, color: colors.cream, opacity: 0.7, letterSpacing: 1 },
  info: { flex: 1 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 11.5, color: colors.ink, lineHeight: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  metaText: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted },
  metaDot: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, marginHorizontal: 3 },
});
