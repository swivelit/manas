import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyAvailability, useReplaceAvailability, AvailabilityRow } from '../../lib/queries';
import { Button } from '../../components/Button';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

// dayOfWeek follows JS getDay(): 0=Sun … 6=Sat (matches the seed + booking flow).
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

type DayState = { enabled: boolean; startTime: string; endTime: string };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// NOTE: MVP models one availability window per day. Multi-window days are a v1.1
// follow-up; if a day has several rows we edit the earliest.
function buildInitial(rows: AvailabilityRow[] | undefined): Record<number, DayState> {
  const map: Record<number, DayState> = {};
  for (const d of DAYS) map[d.value] = { enabled: false, startTime: '09:00', endTime: '17:00' };
  for (const r of rows ?? []) {
    const cur = map[r.dayOfWeek];
    if (cur && (!cur.enabled || r.startTime < cur.startTime)) {
      map[r.dayOfWeek] = { enabled: true, startTime: r.startTime, endTime: r.endTime };
    }
  }
  return map;
}

export default function CoachAvailability() {
  const dialog = useDialog();
  const { data, isLoading } = useMyAvailability();
  const replace = useReplaceAvailability();
  const [days, setDays] = useState<Record<number, DayState>>(() => buildInitial(undefined));

  useEffect(() => {
    if (Array.isArray(data)) setDays(buildInitial(data));
  }, [data]);

  function update(day: number, patch: Partial<DayState>) {
    setDays(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function save() {
    const out: AvailabilityRow[] = [];
    for (const d of DAYS) {
      const s = days[d.value];
      if (!s.enabled) continue;
      if (!TIME_RE.test(s.startTime) || !TIME_RE.test(s.endTime)) {
        void dialog.alert('Check times', `${d.label}: use 24-hour HH:MM (e.g. 09:00).`);
        return;
      }
      if (s.startTime >= s.endTime) {
        void dialog.alert('Check times', `${d.label}: end time must be after start time.`);
        return;
      }
      out.push({ dayOfWeek: d.value, startTime: s.startTime, endTime: s.endTime });
    }
    try {
      await replace.mutateAsync(out);
      void dialog.alert('Saved', 'Your weekly availability has been updated.');
    } catch {
      void dialog.alert('Could not save', 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>WEEKLY HOURS</Text>
        <Text style={styles.title}>Your{'\n'}<Text style={styles.titleItalic}>availability.</Text></Text>
        <Text style={styles.help}>Toggle the days you see clients and set your window in 24-hour time.</Text>

        {isLoading ? (
          <Text style={styles.help}>Loading…</Text>
        ) : (
          DAYS.map(d => {
            const s = days[d.value];
            return (
              <View key={d.value} style={styles.dayCard}>
                <View style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{d.label}</Text>
                  <Switch
                    value={s.enabled}
                    onValueChange={(v) => update(d.value, { enabled: v })}
                    trackColor={{ true: colors.pink, false: colors.line }}
                    thumbColor={colors.paper}
                  />
                </View>
                {s.enabled && (
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <Text style={styles.timeLabel}>From</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={s.startTime}
                        onChangeText={(t) => update(d.value, { startTime: t })}
                        placeholder="09:00"
                        placeholderTextColor={colors.muted}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={styles.timeField}>
                      <Text style={styles.timeLabel}>To</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={s.endTime}
                        onChangeText={(t) => update(d.value, { endTime: t })}
                        placeholder="17:00"
                        placeholderTextColor={colors.muted}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <Button label={replace.isPending ? 'Saving…' : 'Save availability'} onPress={save} loading={replace.isPending} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 40 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 26, color: colors.ink, letterSpacing: -0.5, lineHeight: 28, marginTop: 2 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  help: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 17 },
  dayCard: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 14, color: colors.ink },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  timeField: { flex: 1, gap: 5 },
  timeLabel: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
  timeInput: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 11, fontFamily: fontFamilies.dmSansMedium, fontSize: 14, color: colors.ink, textAlign: 'center', letterSpacing: 2 },
});
