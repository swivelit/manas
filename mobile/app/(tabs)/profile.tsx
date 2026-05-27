import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useMe } from '../../lib/queries';
import { useSessions } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { SessionCard } from '../../components/SessionCard';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function ProfileScreen() {
  const { data: me } = useMe();
  const { data: sessions } = useSessions();
  const clearAuth = useAuthStore(s => s.clearAuth);

  const upcoming = sessions?.filter((s: any) => ['CONFIRMED', 'PENDING'].includes(s.status)) ?? [];
  const completed = sessions?.filter((s: any) => s.status === 'COMPLETED') ?? [];

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/onboarding'); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top section */}
        <View style={styles.top}>
          <View style={styles.profHead}>
            <Text style={styles.profLabel}>YOUR JOURNEY</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.settingsBtn}>
              <Icon name="settings" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.profPic} />
          <View style={styles.profName}>
            <Text style={styles.name}>{me?.name ?? 'Sarah Mathew'}</Text>
            <Text style={styles.since}>Member since {me?.createdAt ? format(new Date(me.createdAt), 'MMMM yyyy') : 'March 2026'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{completed.length || 14}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={[styles.stat, styles.statMid]}>
            <Text style={styles.statNum}>32<Text style={styles.statUnit}>h</Text></Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>6</Text>
            <Text style={styles.statLabel}>Topics</Text>
          </View>
        </View>

        {/* Upcoming sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming sessions</Text>
          {upcoming.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/topics')} style={styles.emptyCard}>
              <Text style={styles.emptyText}>Book a free demo session →</Text>
            </TouchableOpacity>
          ) : (
            upcoming.slice(0, 3).map((s: any, i: number) => (
              <SessionCard
                key={s.id}
                session={s}
                accentColor={i === 1 ? colors.blue : colors.ink}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 24 },
  top: {
    backgroundColor: '#DDE9FF',
    paddingHorizontal: 22,
    paddingTop: 0,
    paddingBottom: 20,
  },
  profHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, paddingTop: 16 },
  profLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  settingsBtn: { width: 32, height: 32, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  profPic: { width: 74, height: 74, borderRadius: 99, backgroundColor: colors.pink, alignSelf: 'center', borderWidth: 3, borderColor: colors.paper },
  profName: { alignItems: 'center', marginTop: 10 },
  name: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  since: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, marginTop: 2 },
  stats: {
    marginHorizontal: 22,
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    transform: [{ translateY: -14 }],
  },
  stat: { flex: 1, alignItems: 'center' },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0EBDE' },
  statNum: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  statUnit: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink, fontSize: 14 },
  statLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  section: { paddingHorizontal: 22, marginTop: -6 },
  sectionTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 13, color: colors.ink, marginBottom: 10 },
  emptyCard: { backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  emptyText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.blue },
});
