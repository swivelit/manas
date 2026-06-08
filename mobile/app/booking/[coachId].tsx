import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCoach, useCoachAvailability, useBookSession, useTopic, useMe } from '../../lib/queries';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function BookingScreen() {
  const dialog = useDialog();
  const { coachId, topicSlug } = useLocalSearchParams<{ coachId: string; topicSlug: string }>();
  const coachParam = Array.isArray(coachId) ? coachId[0] : coachId;
  const topicParam = Array.isArray(topicSlug) ? topicSlug[0] : topicSlug;
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'VIDEO' | 'AUDIO' | 'CHAT'>('VIDEO');

  const { data: coach, isError: coachError } = useCoach(coachParam);
  const { data: topic, isError: topicError } = useTopic(topicParam ?? 'chronic-anxiety');
  const { data: me } = useMe();
  const { data: availability, isLoading: slotsLoading, isError: slotsError } = useCoachAvailability(coachParam, selectedDate);
  const bookSession = useBookSession();
  const slots = Array.isArray(availability?.slots) ? availability.slots : [];

  const userTz = me?.timezone ?? 'Asia/Kolkata';
  const tzLabel = formatInTimeZone(new Date(), userTz, 'zzz'); // e.g. "IST", "GMT+5:30"

  function slotLabel(startsAt: string): string {
    return formatInTimeZone(new Date(startsAt), userTz, 'HH:mm');
  }

  async function handleConfirm() {
    if (!selectedStartsAt || !topic || !coachParam) return;
    try {
      await bookSession.mutateAsync({
        coachId: coachParam,
        topicId: topic.id,
        scheduledAt: selectedStartsAt,
        type: sessionType,
      });
      await dialog.show({
        title: 'Booked!',
        message: 'Your free demo session is confirmed.',
        actions: [{ label: 'OK', onPress: () => router.replace('/(tabs)/sessions') }],
      });
    } catch {
      void dialog.alert('Booking failed', 'Please try again.');
    }
  }

  const markedDates: Record<string, { selected?: boolean; selectedColor?: string; marked?: boolean; dotColor?: string }> = {
    [selectedDate]: { selected: true, selectedColor: colors.ink },
  };
  if (slots.some((s: { available: boolean }) => s.available)) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], dotColor: colors.pink, marked: true };
  }

  if (coachError || topicError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.errorTitle}>Booking unavailable</Text>
          <Text style={styles.errorText}>MANAS could not load the coach or topic needed for booking.</Text>
        </View>
      </SafeAreaView>
    );
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
        ) : slotsError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Availability unavailable</Text>
            <Text style={styles.emptyText}>Could not load time slots. Try another day or check your connection.</Text>
          </View>
        ) : (
          <View style={styles.slots}>
            {slots.length === 0 && (
              <Text style={styles.noSlots}>No availability on this day.</Text>
            )}
            {slots.map((s: { time: string; startsAt: string; available: boolean }) => (
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
  emptyState: { marginHorizontal: 22, backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  emptyText: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  errorWrap: { flex: 1, padding: 22, justifyContent: 'center' },
  errorTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink },
  errorText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 8 },
});
