import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useCoachAppointments, useUpdateCoachSession, useMe } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

type Appt = {
  id: string;
  scheduledAt: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | string;
  meetingUrl?: string | null;
  user?: { name?: string | null } | null;
  topic?: { name?: string | null } | null;
};

function AppointmentCard({ appt, onSet, busy }: { appt: Appt; onSet: (status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => void; busy: boolean }) {
  const date = new Date(appt.scheduledAt);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const client = appt.user?.name ?? 'Client';
  const topic = appt.topic?.name ?? 'Session';

  async function join() {
    if (!appt.meetingUrl) { Alert.alert('No meeting link', 'This session has no meeting link yet.'); return; }
    const url = appt.type === 'AUDIO' ? `${appt.meetingUrl}#config.startWithVideoMuted=true` : appt.meetingUrl;
    const can = await Linking.canOpenURL(url);
    if (!can) { Alert.alert('Cannot open link', url); return; }
    Linking.openURL(url);
  }

  function openChat() {
    router.push(`/session/${appt.id}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateNum}>{format(safe, 'd')}</Text>
          <Text style={styles.dateMon}>{format(safe, 'MMM').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.client}>{client}</Text>
          <Text style={styles.sub}>{topic} · {format(safe, 'EEE h:mm a')} · {appt.type}</Text>
          {appt.status === 'COMPLETED' && <Text style={styles.done}>COMPLETED</Text>}
          {appt.status === 'CANCELLED' && <Text style={styles.cancel}>DECLINED / CANCELLED</Text>}
          {appt.status === 'PENDING' && <Text style={styles.pending}>AWAITING YOUR RESPONSE</Text>}
        </View>
      </View>

      {busy ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 10 }} />
      ) : appt.status === 'PENDING' ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => onSet('CONFIRMED')} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => onSet('CANCELLED')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : appt.status === 'CONFIRMED' ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPink]} onPress={appt.type === 'CHAT' ? openChat : join} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{appt.type === 'CHAT' ? 'Open chat' : 'Join'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => onSet('COMPLETED')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Mark complete</Text>
          </TouchableOpacity>
        </View>
      ) : appt.type === 'CHAT' && appt.status === 'COMPLETED' ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={openChat} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Open chat</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function CoachAppointments() {
  const { data: me } = useMe();
  const { data, isLoading, isError } = useCoachAppointments();
  const update = useUpdateCoachSession();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const [busyId, setBusyId] = useState<string | null>(null);

  const appts: Appt[] = Array.isArray(data) ? data : [];

  async function setStatus(id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') {
    setBusyId(id);
    try {
      await update.mutateAsync({ id, status });
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  function logout() {
    Alert.alert('Sign out', 'Sign out of your coach account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/onboarding'); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>YOUR PRACTICE</Text>
          <Text style={styles.title}>{me?.name ?? 'Coach'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Icon name="settings" size={15} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Couldn't load appointments</Text><Text style={styles.emptySub}>Check your connection and try again.</Text></View>
      ) : appts.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No appointments yet</Text><Text style={styles.emptySub}>Bookings from clients will appear here.</Text></View>
      ) : (
        <FlatList
          data={appts}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AppointmentCard appt={item} busy={busyId === item.id} onSet={(s) => setStatus(item.id, s)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  card: { backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dateBox: { width: 44, alignItems: 'center', borderRadius: 12, paddingVertical: 6, backgroundColor: colors.ink },
  dateNum: { fontFamily: fontFamilies.fraunces, fontSize: 16, color: colors.cream, lineHeight: 18 },
  dateMon: { fontFamily: fontFamilies.dmSans, fontSize: 8, color: colors.cream, opacity: 0.7, letterSpacing: 1 },
  client: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 2 },
  done: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.sage, marginTop: 4, letterSpacing: 1 },
  cancel: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, marginTop: 4, letterSpacing: 1 },
  pending: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.blue, marginTop: 4, letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 11 },
  btnPrimary: { backgroundColor: colors.ink },
  btnPink: { backgroundColor: colors.pink },
  btnPrimaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  btnGhost: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line },
  btnGhostText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 20, color: colors.ink },
  emptySub: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' },
});
