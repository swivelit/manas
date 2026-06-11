import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { format, formatDistanceToNowStrict, differenceInMinutes } from 'date-fns';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Icon } from './Icon';
import { canJoinSession, isCallSession, POST_START_JOIN_WINDOW_MIN } from '../lib/sessionCall';

interface Session {
  id: string;
  scheduledAt: string;
  type: 'VIDEO' | 'AUDIO' | 'CHAT' | string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | string;
  meetingUrl?: string | null;
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
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const now = new Date();
  const minsUntil = differenceInMinutes(safeDate, now);
  const topicName = session.topic?.name ?? 'Session';
  const coachName = session.coach?.user?.name ?? 'MANAS coach';
  const isCall = isCallSession(session.type);
  const joinable = canJoinSession(session);
  const completed = session.status === 'COMPLETED';
  const cancelled = session.status === 'CANCELLED';

  function handleJoin() {
    router.push(`/call/${session.id}` as any);
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, cancelled && styles.cardDim]}>
      <View style={[styles.dateBox, { backgroundColor: accentColor }]}>
        <Text style={styles.dateNum}>{format(safeDate, 'd')}</Text>
        <Text style={styles.dateMon}>{format(safeDate, 'MMM').toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{topicName} · Demo</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{coachName}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{format(safeDate, 'h:mm a')}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{session.type}</Text>
        </View>
        {completed && <Text style={styles.statusDone}>Completed</Text>}
        {cancelled && <Text style={styles.statusCancel}>Cancelled</Text>}
      </View>

      {!completed && !cancelled && (
        session.type === 'CHAT' ? (
          <TouchableOpacity onPress={onPress} style={styles.joinBtn} activeOpacity={0.85}>
            <Text style={styles.joinBtnText}>Chat</Text>
          </TouchableOpacity>
        ) : isCall && joinable ? (
          <TouchableOpacity onPress={handleJoin} style={styles.joinBtn} activeOpacity={0.85}>
            <Text style={styles.joinBtnText}>Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.startsIn}>
            <Text style={styles.startsInText}>
              {minsUntil > 0 ? `In ${formatDistanceToNowStrict(date)}` : `${Math.abs(minsUntil)}m ago`}
            </Text>
          </View>
        )
      )}

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
  cardDim: { opacity: 0.55 },
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
  statusDone: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.sage, marginTop: 3, letterSpacing: 1 },
  statusCancel: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, marginTop: 3, letterSpacing: 1 },
  joinBtn: { backgroundColor: colors.pink, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  joinBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 10, color: colors.paper },
  startsIn: { paddingHorizontal: 6 },
  startsInText: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted },
});
