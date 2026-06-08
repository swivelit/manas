import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAdminStats, useBroadcast } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

function StatCard({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: tint }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const dialog = useDialog();
  const { data, isLoading, isError } = useAdminStats();
  const broadcast = useBroadcast();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function logout() {
    const confirmed = await dialog.confirm({
      title: 'Sign out',
      message: 'Sign out of the admin account?',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!confirmed) return;
    await clearAuth();
    router.replace('/onboarding');
  }

  async function sendBroadcast() {
    if (title.trim().length < 2 || body.trim().length < 2) {
      void dialog.alert('Add a message', 'Enter a title and body to broadcast.');
      return;
    }
    try {
      const res = await broadcast.mutateAsync({ title: title.trim(), body: body.trim() });
      void dialog.alert('Sent', `Delivered to ${res.recipients} member${res.recipients === 1 ? '' : 's'}.`);
      setTitle(''); setBody('');
    } catch {
      void dialog.alert('Could not send', 'Please try again.');
    }
  }

  const s = data ?? {};

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Overview</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Icon name="settings" size={15} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} />
        ) : isError ? (
          <Text style={styles.help}>Couldn't load stats. Pull down or retry.</Text>
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard label="Total users" value={s.users ?? 0} tint={colors.blueSoft} />
              <StatCard label="Sessions this week" value={s.sessionsThisWeek ?? 0} tint={colors.pinkSoft} />
              <StatCard label="Premium members" value={s.premiumUsers ?? 0} tint={colors.sageSoft} />
              <StatCard label="Coaches" value={s.coaches ?? 0} tint={colors.peachSoft} />
              <StatCard label="Videos" value={s.videos ?? 0} tint={colors.creamDeep} />
              <StatCard label="Pending sessions" value={s.sessions?.pending ?? 0} tint={colors.creamDeep} />
            </View>

            <View style={styles.sessionRow}>
              <Text style={styles.sessionRowLabel}>Sessions</Text>
              <Text style={styles.sessionRowText}>
                {s.sessions?.confirmed ?? 0} confirmed · {s.sessions?.completed ?? 0} done · {s.sessions?.cancelled ?? 0} cancelled
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Broadcast a message</Text>
            <View style={styles.broadcastCard}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted} maxLength={120} />
              <TextInput style={[styles.input, styles.multiline]} value={body} onChangeText={setBody} placeholder="Message to all members…" placeholderTextColor={colors.muted} multiline maxLength={500} />
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Button label={broadcast.isPending ? 'Sending…' : 'Send to all members'} onPress={sendBroadcast} loading={broadcast.isPending} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 26, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  help: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47.5%', borderRadius: 16, padding: 16, minHeight: 92, justifyContent: 'space-between' },
  statValue: { fontFamily: fontFamilies.frauncesMedium, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, marginTop: 6 },
  sessionRow: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 12 },
  sessionRowLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  sessionRowText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink, marginTop: 4 },
  sectionTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 16, color: colors.ink, marginTop: 26, marginBottom: 10 },
  broadcastCard: { backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 },
  input: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, fontFamily: fontFamilies.dmSans, fontSize: 14, color: colors.ink },
  multiline: { height: 80, textAlignVertical: 'top' },
});
