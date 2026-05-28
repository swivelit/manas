import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { format, formatDistanceToNowStrict, differenceInMinutes } from 'date-fns';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Icon } from './Icon';

const PRE_START_JOIN_WINDOW_MIN = 10;
const POST_START_JOIN_WINDOW_MIN = 30;

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
  const now = new Date();
  const minsUntil = differenceInMinutes(date, now);
  const joinable =
    session.status === 'CONFIRMED' &&
    minsUntil <= PRE_START_JOIN_WINDOW_MIN &&
    minsUntil >= -POST_START_JOIN_WINDOW_MIN;
  const completed = session.status === 'COMPLETED';
  const cancelled = session.status === 'CANCELLED';

  async function handleJoin() {
    if (!session.meetingUrl) {
      Alert.alert('No meeting link', 'Please refresh — the meeting link is being set up.');
      return;
    }
    const url = session.type === 'AUDIO'
      ? `${session.meetingUrl}#config.startWithVideoMuted=true`
      : session.meetingUrl;
    const can = await Linking.canOpenURL(url);
    if (!can) { Alert.alert('Cannot open link', url); return; }
    Linking.openURL(url);
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, cancelled && styles.cardDim]}>
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
        {completed && <Text style={styles.statusDone}>Completed</Text>}
        {cancelled && <Text style={styles.statusCancel}>Cancelled</Text>}
      </View>

      {!completed && !cancelled && (
        joinable ? (
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
