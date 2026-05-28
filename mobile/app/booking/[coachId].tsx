import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCoach, useCoachAvailability, useBookSession, useTopic, useMe } from '../../lib/queries';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function BookingScreen() {
  const { coachId, topicSlug } = useLocalSearchParams<{ coachId: string; topicSlug: string }>();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'VIDEO' | 'AUDIO' | 'CHAT'>('VIDEO');

  const { data: coach } = useCoach(coachId);
  const { data: topic } = useTopic(topicSlug ?? 'chronic-anxiety');
  const { data: me } = useMe();
  const { data: availability, isLoading: slotsLoading } = useCoachAvailability(coachId, selectedDate);
  const bookSession = useBookSession();

  const userTz = me?.timezone ?? 'Asia/Kolkata';
  const tzLabel = formatInTimeZone(new Date(), userTz, 'zzz'); // e.g. "IST", "GMT+5:30"

  function slotLabel(startsAt: string): string {
    return formatInTimeZone(new Date(startsAt), userTz, 'HH:mm');
  }

  async function handleConfirm() {
    if (!selectedStartsAt || !topic) return;
    try {
      const session = await bookSession.mutateAsync({
        coachId,
        topicId: topic.id,
        scheduledAt: selectedStartsAt,
        type: sessionType,
      });
      router.replace({
        pathname: '/booking/confirmation' as never,
        params: {
          coach: coach?.user?.name ?? 'Your MANAS coach',
          topic: topic.name,
          startsAt: selectedStartsAt,
          type: sessionType,
          mock: session?.isMock ? '1' : '0',
        },
      });
    } catch {
      Alert.alert('Booking failed', 'Please try again. If the backend is unavailable, use the demo booking flow from the public app.');
    }
  }

  const markedDates: Record<string, { selected?: boolean; selectedColor?: string; marked?: boolean; dotColor?: string }> = {
    [selectedDate]: { selected: true, selectedColor: colors.ink },
  };
  if (availability?.slots?.some((s: { available: boolean }) => s.available)) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], dotColor: colors.pink, marked: true };
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose a moment</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Calendar */}
        <Calendar
          current={selectedDate}
          onDayPress={(day: { dateString: string }) => { setSelectedDate(day.dateString); setSelectedStartsAt(null); }}
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.cream,
            calendarBackground: colors.cream,
            textSectionTitleColor: colors.muted,
            selectedDayBackgroundColor: colors.ink,
            selectedDayTextColor: colors.cream,
            todayTextColor: colors.blue,
            dayTextColor: colors.ink,
            textDisabledColor: '#C5BCAB',
            arrowColor: colors.ink,
            monthTextColor: colors.ink,
            indicatorColor: colors.pink,
            textDayFontFamily: fontFamilies.dmSans,
            textMonthFontFamily: fontFamilies.frauncesMedium,
            textDayHeaderFontFamily: fontFamilies.dmSans,
            dotColor: colors.pink,
          }}
          style={styles.calendar}
        />

        {/* Slot title */}
        <View style={styles.slotTitle}>
          <Text style={styles.slotDay}>{format(new Date(selectedDate), 'EEEE').toUpperCase()} · {tzLabel}</Text>
          <Text style={styles.slotCoach}>
            Available with{' '}
            <Text style={styles.slotCoachName}>{coach ? coach.user.name.replace('Dr. ', 'Dr. ') : '…'}</Text>
          </Text>
        </View>

        {/* Slots */}
        {slotsLoading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.slots}>
            {availability?.slots?.length === 0 && (
              <Text style={styles.noSlots}>No availability on this day.</Text>
            )}
            {availability?.slots?.map((s: { time: string; startsAt: string; available: boolean }) => (
              <TouchableOpacity
                key={s.startsAt}
                disabled={!s.available}
                onPress={() => setSelectedStartsAt(s.startsAt)}
                style={[
                  styles.slot,
                  selectedStartsAt === s.startsAt && styles.slotSelected,
                  !s.available && styles.slotOff,
                ]}
              >
                <Text style={[
                  styles.slotText,
                  selectedStartsAt === s.startsAt && styles.slotTextSelected,
                  !s.available && styles.slotTextOff,
                ]}>
                  {slotLabel(s.startsAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Session type */}
        <View style={styles.typeRow}>
          {(['VIDEO', 'AUDIO', 'CHAT'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setSessionType(t)}
              style={[styles.typeChip, sessionType === t && styles.typeChipActive]}
            >
              <Text style={[styles.typeText, sessionType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirm */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!selectedStartsAt || bookSession.isPending}
          style={[styles.confirm, (!selectedStartsAt || bookSession.isPending) && styles.confirmDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmLeft}>
            {selectedStartsAt ? `${format(new Date(selectedDate), 'd MMM')} · ` : 'Select a slot · '}
            <Text style={styles.confirmSlot}>{selectedStartsAt ? slotLabel(selectedStartsAt) : '—'}</Text>
          </Text>
          <Text style={styles.confirmRight}>
            {bookSession.isPending ? 'Booking…' : 'Confirm →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 32 },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.ink },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 17, color: colors.ink },
  calendar: { marginHorizontal: 12, borderRadius: 14 },
  slotTitle: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 8 },
  slotDay: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  slotCoach: { fontFamily: fontFamilies.fraunces, fontSize: 13, color: colors.ink, marginTop: 2 },
  slotCoachName: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  slots: { paddingHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  slot: { paddingVertical: 9, paddingHorizontal: 6, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, minWidth: 68, alignItems: 'center' },
  slotSelected: { backgroundColor: colors.blueSoft, borderColor: colors.blue },
  slotOff: { opacity: 0.5 },
  slotText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.ink },
  slotTextSelected: { color: colors.blueDeep },
  slotTextOff: { textDecorationLine: 'line-through', color: '#C5BCAB' },
  noSlots: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, marginTop: 8 },
  typeRow: { paddingHorizontal: 22, flexDirection: 'row', gap: 8, marginTop: 16 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  typeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  typeText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft },
  typeTextActive: { color: colors.cream },
  confirm: { marginHorizontal: 22, marginTop: 14, backgroundColor: colors.ink, padding: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmDisabled: { opacity: 0.5 },
  confirmLeft: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.cream },
  confirmSlot: { fontFamily: fontFamilies.frauncesItalic, color: colors.pinkSoft, fontSize: 14 },
  confirmRight: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
});
