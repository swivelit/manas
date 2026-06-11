import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useMe, useSession } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { canJoinSession, getCallRoomConfig, isCallSession } from '../../lib/sessionCall';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

function returnToSession(sessionId: string) {
  router.replace(`/session/${sessionId}`);
}

function CallStateScreen({
  title,
  message,
  actionLabel = 'Back to session',
  onPress,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress: () => void;
}) {
  return (
    <SafeAreaView style={styles.stateScreen}>
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateMessage}>{message}</Text>
        <TouchableOpacity onPress={onPress} style={styles.stateButton} activeOpacity={0.85}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function SessionCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const token = useAuthStore(s => s.token);
  const { data: session, isLoading, isError } = useSession(sessionId);
  const { data: me } = useMe();
  const [webError, setWebError] = useState<string | null>(null);

  const callConfig = useMemo(() => {
    if (!session) return null;
    try {
      return { value: getCallRoomConfig(session), error: null };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'This call could not be opened.' };
    }
  }, [session]);

  const meetingUrl = useMemo(() => {
    if (!callConfig?.value) return null;
    const url = new URL(encodeURIComponent(callConfig.value.room), `${callConfig.value.serverURL}/`);
    const hash = new URLSearchParams({
      'config.disableCalendarIntegration': 'true',
      'config.disableDeepLinking': 'true',
      'config.disableInviteFunctions': 'true',
      'config.prejoinPageEnabled': 'true',
      'config.startAudioOnly': String(callConfig.value.isAudioOnly),
      'config.startWithVideoMuted': String(callConfig.value.isAudioOnly),
      'userInfo.displayName': me?.name ?? 'MANAS user',
      'userInfo.email': me?.email ?? '',
    });
    url.hash = hash.toString();
    return url.toString();
  }, [callConfig, me?.email, me?.name]);

  if (!token) {
    return (
      <CallStateScreen
        title="Sign in required"
        message="Please sign in again before joining this session."
        actionLabel="Go to sign in"
        onPress={() => router.replace('/(auth)/login')}
      />
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Opening your MANAS call...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !session) {
    return (
      <CallStateScreen
        title="Session unavailable"
        message="MANAS could not load this session right now."
        onPress={() => router.back()}
      />
    );
  }

  if (!isCallSession(session.type)) {
    return (
      <CallStateScreen
        title="Chat stays in MANAS"
        message="This session is a text chat, so it opens from the session detail screen."
        actionLabel="Open chat"
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  if (!canJoinSession(session)) {
    return (
      <CallStateScreen
        title="Call not open yet"
        message="The meeting opens 10 minutes before start and remains available for 30 minutes after."
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  if (!callConfig?.value) {
    return (
      <CallStateScreen
        title="Meeting room unavailable"
        message={callConfig?.error ?? 'MANAS could not prepare this meeting room.'}
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  if (!meetingUrl) {
    return (
      <CallStateScreen
        title="Meeting room unavailable"
        message="MANAS could not prepare this meeting room."
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  if (webError) {
    return (
      <CallStateScreen
        title="Call could not load"
        message={webError}
        actionLabel="Back to session"
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  return (
    <View style={styles.callScreen}>
      <WebView
        source={{ uri: meetingUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        originWhitelist={['https://*', 'http://*']}
        setSupportMultipleWindows={false}
        onError={event => setWebError(event.nativeEvent.description || 'The meeting provider could not load.')}
      />
      <SafeAreaView pointerEvents="box-none" style={styles.callChrome}>
        <TouchableOpacity onPress={() => returnToSession(sessionId)} style={styles.endButton} activeOpacity={0.85}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  callScreen: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  callChrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, alignItems: 'flex-end' },
  endButton: { marginTop: 8, backgroundColor: 'rgba(20, 24, 28, 0.82)', borderRadius: 999, minHeight: 38, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  endButtonText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  stateScreen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateCard: { width: '100%', maxWidth: 420, backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 20 },
  stateTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink },
  stateMessage: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
  stateButton: { marginTop: 18, backgroundColor: colors.ink, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  loadingText: { marginTop: 12, fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted },
});
