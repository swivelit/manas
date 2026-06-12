import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { format, differenceInMinutes } from 'date-fns';
import {
  useSession,
  useUpdateSession,
  useCoachAvailability,
  useMe,
  useSessionMessages,
  useSendMessage,
} from '../../lib/queries';
import { formatInTimeZone } from 'date-fns-tz';
import { useDialog } from '../../components/AppDialog';
import { canJoinSession, isCallSession, POST_START_JOIN_WINDOW_MIN, PRE_START_JOIN_WINDOW_MIN } from '../../lib/sessionCall';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { name?: string | null } | null;
};

function ChatPanel({ sessionId, currentUserId }: { sessionId: string; currentUserId?: string }) {
  const dialog = useDialog();
  const { data, isLoading, isError } = useSessionMessages(sessionId);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const messages: ChatMessage[] = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    try {
      await send.mutateAsync({ sessionId, body });
      setDraft('');
    } catch {
      void dialog.alert('Could not send message', 'Please try again.');
    }
  }

  return (
    <View style={styles.chatPanel}>
      <View style={styles.chatHead}>
        <Text style={styles.chatTitle}>Session chat</Text>
        {isLoading && <ActivityIndicator color={colors.blue} />}
      </View>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        style={styles.messageThread}
        contentContainerStyle={styles.messageThreadContent}
      >
        {isError ? (
          <Text style={styles.chatEmpty}>Messages could not load right now.</Text>
        ) : messages.length === 0 && !isLoading ? (
          <Text style={styles.chatEmpty}>No messages yet.</Text>
        ) : (
          messages.map(message => {
            const mine = message.senderId === currentUserId;
            return (
              <View key={message.id} style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                  {!mine && <Text style={styles.messageSender}>{message.sender?.name ?? 'Coach'}</Text>}
                  <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.body}</Text>
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                    {format(new Date(message.createdAt), 'h:mm a')}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor={colors.muted}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!draft.trim() || send.isPending}
          style={[styles.sendBtn, (!draft.trim() || send.isPending) && styles.sendBtnDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.sendBtnText}>{send.isPending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SessionDetail() {
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const { data: session, isLoading, isError } = useSession(sessionId);
  const update = useUpdateSession();

  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return <SafeAreaView style={styles.screen}><ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} /></SafeAreaView>;
  }
  if (isError || !session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.errorTitle}>Session unavailable</Text>
          <Text style={styles.errorText}>MANAS could not load this session right now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const at = new Date(session.scheduledAt);
  const safeAt = Number.isNaN(at.getTime()) ? new Date() : at;
  const minsUntil = differenceInMinutes(safeAt, now);
  const isCall = isCallSession(session.type);
  const canJoin = canJoinSession(session, now);

  function handleJoin() {
    if (!canJoin) {
      void dialog.alert(
        'Session not ready',
        `The meeting opens ${PRE_START_JOIN_WINDOW_MIN} minutes before start and remains available for ${POST_START_JOIN_WINDOW_MIN} minutes after.`
      );
      return;
    }
    router.push(`/call/${sessionId}` as any);
  }

  async function handlePickSlot(slot: { startsAt: string }) {
    try {
      await update.mutateAsync({ id: sessionId, scheduledAt: slot.startsAt });
      setRescheduling(false);
      setNewDate(null);
      void dialog.alert('Rescheduled', `New time: ${format(new Date(slot.startsAt), 'EEE, d MMM · h:mm a')}`);
    } catch {
      void dialog.alert('Could not reschedule', 'Please try a different slot.');
    }
  }

  async function handleCancel() {
    const confirmed = await dialog.confirm({
      title: 'Cancel session?',
      message: 'You can always book another time.',
      cancelLabel: 'Keep it',
      confirmLabel: 'Cancel session',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await update.mutateAsync({ id: sessionId, status: 'CANCELLED' });
      router.back();
    } catch {
      void dialog.alert('Could not cancel', 'Please try again.');
    }
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
          {session.topic?.name ?? 'Session'}{'\n'}<Text style={styles.titleItalic}>with {session.coach?.user?.name?.replace('Dr. ', 'Dr. ') ?? 'your MANAS coach'}.</Text>
        </Text>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>When</Text>
            <Text style={styles.metaVal}>{format(safeAt, 'EEE, d MMM · h:mm a')}</Text>
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
            {session.type === 'CHAT' ? (
              <ChatPanel sessionId={sessionId} currentUserId={me?.id} />
            ) : isCall ? (
              <>
                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={!canJoin}
                  style={[styles.btnPrimary, !canJoin && styles.btnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>
                    {canJoin
                      ? 'Join session →'
                      : minsUntil < -POST_START_JOIN_WINDOW_MIN
                        ? 'Join window closed'
                        : `Starts in ${Math.max(minsUntil, 0)} min`}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.callHint}>Calls open securely inside MANAS.</Text>
              </>
            ) : null}

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
  callHint: { marginTop: 8, fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, textAlign: 'center' },
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
  chatPanel: { marginTop: 18, backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  chatHead: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { fontFamily: fontFamilies.dmSansBold, fontSize: 10, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  messageThread: { maxHeight: 320 },
  messageThreadContent: { padding: 12, gap: 8, minHeight: 160 },
  chatEmpty: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 36 },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  messageBubbleMine: { backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: colors.creamDeep, borderBottomLeftRadius: 4 },
  messageSender: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, color: colors.muted, marginBottom: 3 },
  messageBody: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.ink, lineHeight: 18 },
  messageBodyMine: { color: colors.cream },
  messageTime: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMine: { color: 'rgba(250,246,239,0.65)' },
  composer: { borderTopWidth: 1, borderColor: colors.line, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 12, backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.ink },
  sendBtn: { minWidth: 62, minHeight: 40, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  errorWrap: { flex: 1, padding: 22, justifyContent: 'center' },
  errorTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink },
  errorText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 8 },
});
