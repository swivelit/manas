import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function BookingConfirmation() {
  const params = useLocalSearchParams<{
    coach?: string;
    topic?: string;
    startsAt?: string;
    type?: string;
    mock?: string;
  }>();

  const startsAt = params.startsAt ? new Date(params.startsAt) : null;
  const isMock = params.mock === '1';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <View style={styles.mark}>
          <Text style={styles.markText}>✓</Text>
        </View>
        <Text style={styles.kicker}>{isMock ? 'MVP DEMO CONFIRMATION' : 'BOOKING CONFIRMED'}</Text>
        <Text style={styles.title}>Your free demo session is held.</Text>
        <Text style={styles.body}>
          {params.topic ?? 'Your topic'} with {params.coach ?? 'your MANAS coach'}
          {startsAt ? ` on ${format(startsAt, 'EEE, d MMM')} at ${format(startsAt, 'h:mm a')}` : ''}.
        </Text>

        <View style={styles.card}>
          <Text style={styles.rowLabel}>Session type</Text>
          <Text style={styles.rowValue}>{params.type ?? 'VIDEO'}</Text>
          <Text style={styles.rowLabel}>Notification</Text>
          <Text style={styles.rowValue}>
            {isMock
              ? 'Demo placeholder only. Production push/email/SMS needs backend credentials.'
              : 'Confirmation notification has been requested.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(tabs)/sessions')}>
            <Text style={styles.primaryText}>View sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryText}>Back home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  wrap: { flex: 1, padding: 24, justifyContent: 'center' },
  mark: { width: 70, height: 70, borderRadius: 99, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  markText: { fontFamily: fontFamilies.dmSansBold, fontSize: 30, color: colors.blueDeep },
  kicker: { fontFamily: fontFamilies.dmSansBold, fontSize: 10, color: colors.pink, textAlign: 'center', letterSpacing: 2, marginTop: 18 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 30, color: colors.ink, textAlign: 'center', lineHeight: 34, marginTop: 8 },
  body: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.inkSoft, textAlign: 'center', lineHeight: 20, marginTop: 12 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginTop: 24, gap: 6 },
  rowLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  rowValue: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.ink, lineHeight: 19, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  primary: { flex: 1, backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  primaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  secondary: { flex: 1, backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
});
