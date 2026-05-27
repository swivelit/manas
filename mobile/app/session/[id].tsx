import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { format, differenceInMinutes } from 'date-fns';
import { useSession, useUpdateSession, useCoachAvailability, useMe } from '../../lib/queries';
import { formatInTimeZone } from 'date-fns-tz';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const JOIN_WINDOW_MIN = 10;

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading } = useSession(id);
  const update = useUpdateSession();

  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const { data: availability } = useCoachAvailability(session?.coachId ?? '', newDate ?? '');
  const { data: me } = useMe();
  const userTz = me?.timezone ?? 'Asia/Kolkata';
  const slots: { startsAt: string; label: string; available: boolean }[] = (availability?.slots ?? [])
    .filter((s: { available: boolean }) => s.available)
    .map((s: { startsAt: string }) => ({
      startsAt: s.startsAt,
      label: formatInTimeZone(new Date(s.startsAt), userTz, 'HH:mm'),
      available: true,
    }));

  if (isLoading) {
    return <SafeAreaView style={styles.screen}><ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} /></SafeAreaView>;
  }
  if (!session) return null;

  const at = new Date(session.scheduledAt);
  const minsUntil = differenceInMinutes(at, new Date());
  const canJoin = session.status === 'CONFIRMED' && minsUntil <= JOIN_WINDOW_MIN && minsUntil >= -30;

  async function handleJoin() {
    if (!session.meetingUrl) { Alert.alert('No link yet', 'Try refreshing.'); return; }
    const url = session.type === 'AUDIO'
      ? `${session.meetingUrl}#config.startWithVideoMuted=true`
      : session.meetingUrl;
    Linking.openURL(url);
  }

  async function handlePickSlot(slot: { startsAt: string }) {
    try {
      await update.mutateAsync({ id, scheduledAt: slot.startsAt });
      setRescheduling(false);
      setNewDate(null);
      Alert.alert('Rescheduled', `New time: ${format(new Date(slot.startsAt), 'EEE, d MMM · h:mm a')}`);
    } catch {
      Alert.alert('Could not reschedule', 'Please try a different slot.');
    }
  }

  function handleCancel() {
    Alert.alert(
      'Cancel session?',
      'You can always book another time.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel session',
          style: 'destructive',
          onPress: async () => {
            try {
              await update.mutateAsync({ id, status: 'CANCELLED' });
              router.back();
            } catch {
              Alert.alert('Could not cancel', 'Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.tag}>
          {session.isDemo ? 'FREE DEMO' : 'SESSION'} · {session.status}
        </Text>
        <Text style={styles.title}>
          {session.topic.name}{'\n'}<Text style={styles.titleItalic}>with {session.coach.user.name.replace('Dr. ', 'Dr. ')}.</Text>
        </Text>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>When</Text>
            <Text style={styles.metaVal}>{format(at, 'EEE, d MMM · h:mm a')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Format</Text>
            <Text style={styles.metaVal}>{session.type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaVal}>{session.durationMin} min</Text>
          </View>
        </View>

        {session.status === 'CONFIRMED' && (
          <>
            <TouchableOpacity
              onPress={handleJoin}
              disabled={!canJoin}
              style={[styles.btnPrimary, !canJoin && styles.btnDisabled]}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {canJoin ? 'Join session →' : `Starts in ${Math.max(minsUntil, 0)} min`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRescheduling(v => !v)}
              style={styles.btnSecondary}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>{rescheduling ? 'Close' : 'Reschedule'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancel} style={styles.btnGhost} activeOpacity={0.7}>
              <Text style={styles.btnGhostText}>Cancel session</Text>
            </TouchableOpacity>
          </>
        )}

        {rescheduling && (
          <View style={styles.reschedule}>
            <Text style={styles.rescheduleLabel}>Pick a new day</Text>
            <Calendar
              onDayPress={d => setNewDate(d.dateString)}
              markedDates={newDate ? { [newDate]: { selected: true, selectedColor: colors.ink } } : undefined}
              minDate={format(new Date(), 'yyyy-MM-dd')}
              theme={{ todayTextColor: colors.pink, arrowColor: colors.ink }}
            />
            {newDate && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={styles.rescheduleLabel}>Available times ({formatInTimeZone(new Date(), userTz, 'zzz')})</Text>
                {slots.length === 0 && (
                  <Text style={styles.noSlots}>No availability on this day.</Text>
                )}
                <View style={styles.slotsRow}>
                  {slots.map(s => (
                    <TouchableOpacity
                      key={s.startsAt}
                      onPress={() => handlePickSlot(s)}
                      style={styles.slot}
                    >
                      <Text style={styles.slotText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {session.meetingUrl && session.status === 'CONFIRMED' && (
          <Text style={styles.meetingMeta}>Meeting room: {session.meetingUrl}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 40 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  backText: { fontSize: 18, color: colors.ink },
  tag: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 2, color: colors.pink },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 26, color: colors.ink, letterSpacing: -0.4, marginTop: 6, lineHeight: 30 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic },
  metaCard: { marginTop: 18, backgroundColor: colors.paper, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
  metaVal: { fontFamily: fontFamilies.fraunces, fontSize: 13, color: colors.ink },
  btnPrimary: { marginTop: 18, backgroundColor: colors.ink, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  btnDisabled: { opacity: 0.45 },
  btnSecondary: { marginTop: 10, backgroundColor: colors.paper, paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  btnSecondaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
  btnGhost: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  btnGhostText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.pink },
  reschedule: { marginTop: 16, backgroundColor: colors.paper, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  rescheduleLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 1.5, color: colors.muted },
  noSlots: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, paddingVertical: 8 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  slot: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.creamDeep },
  slotText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.ink },
  meetingMeta: { marginTop: 18, fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted },
});
