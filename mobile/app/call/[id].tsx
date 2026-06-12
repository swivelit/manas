import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { useSession, useSessionCallConfig } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { canJoinSession, isCallSession } from '../../lib/sessionCall';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const SERVICE_CONFIG_ERROR = 'Video service is not configured correctly. Please contact support.';

type PermissionStatus = 'idle' | 'checking' | 'granted' | 'denied';

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

function safeNavigationTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return 'unparseable-url';
  }
}

function isBlockedAuthNavigation(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const host = parsed.host.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const full = `${host}${path}`.toLowerCase();

  if (host === 'accounts.google.com' || host.endsWith('.accounts.google.com')) return true;
  if (host === 'oauth2.googleapis.com' || host === 'www.googleapis.com') return true;
  if (host.startsWith('login.') || host.includes('auth.meet.jit.si')) return true;
  if (full.includes('/login') || full.includes('/signin') || full.includes('/oauth')) return true;
  if (host.includes('jitsi') && (path.includes('login') || path.includes('auth'))) return true;

  return false;
}

function callConfigErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response;
  if (response?.status === 503) return SERVICE_CONFIG_ERROR;
  return response?.data?.error ?? 'MANAS could not prepare this meeting room.';
}

async function requestAndroidCallPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ];
  const checks = await Promise.all(permissions.map(permission => PermissionsAndroid.check(permission)));
  if (checks.every(Boolean)) return true;

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

export default function SessionCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = (Array.isArray(id) ? id[0] : id) ?? '';
  const token = useAuthStore(s => s.token);
  const { data: session, isLoading, isError } = useSession(sessionId);
  const [webError, setWebError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  const [permissionRetryKey, setPermissionRetryKey] = useState(0);

  const joinable = useMemo(() => canJoinSession(session), [session]);
  const isCall = isCallSession(session?.type);
  const shouldFetchCallConfig = Boolean(token && sessionId && session && isCall && joinable && permissionStatus === 'granted' && !webError);
  const {
    data: callConfig,
    isLoading: isCallConfigLoading,
    isError: isCallConfigError,
    error: callConfigError,
  } = useSessionCallConfig(sessionId, shouldFetchCallConfig);

  useEffect(() => {
    if (!token || !session || !isCallSession(session.type) || !canJoinSession(session)) return;

    let cancelled = false;
    setPermissionStatus('checking');

    requestAndroidCallPermissions()
      .then(granted => {
        if (!cancelled) setPermissionStatus(granted ? 'granted' : 'denied');
      })
      .catch(error => {
        console.warn('[call] camera/microphone permission request failed', error instanceof Error ? error.message : 'unknown');
        if (!cancelled) setPermissionStatus('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [permissionRetryKey, session, token]);

  function handleShouldStartLoadWithRequest(request: ShouldStartLoadRequest) {
    if (isBlockedAuthNavigation(request.url)) {
      console.warn('[call] blocked meeting auth navigation', safeNavigationTarget(request.url));
      setWebError(SERVICE_CONFIG_ERROR);
      return false;
    }
    return true;
  }

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

  if (!joinable) {
    return (
      <CallStateScreen
        title="Call not open yet"
        message="The meeting opens 10 minutes before start and remains available for 30 minutes after."
        onPress={() => returnToSession(sessionId)}
      />
    );
  }

  if (permissionStatus === 'checking' || permissionStatus === 'idle') {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Checking camera and microphone access...</Text>
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <CallStateScreen
        title="Camera and microphone needed"
        message="Camera and microphone access are needed for video sessions."
        actionLabel="Retry"
        onPress={() => setPermissionRetryKey(key => key + 1)}
      />
    );
  }

  if (isCallConfigLoading || (shouldFetchCallConfig && !callConfig && !isCallConfigError)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loadingText}>Preparing your secure MANAS call...</Text>
      </SafeAreaView>
    );
  }

  if (isCallConfigError || !callConfig?.joinUrl) {
    return (
      <CallStateScreen
        title="Meeting room unavailable"
        message={callConfigErrorMessage(callConfigError)}
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
    <SafeAreaView style={styles.callScreen} edges={['top', 'bottom', 'left', 'right']}>
      <WebView
        source={{ uri: callConfig.joinUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        originWhitelist={['https://*', 'http://*']}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={() => setWebError('The meeting provider could not load. Please try again.')}
      />
      <View pointerEvents="box-none" style={styles.callChrome}>
        <TouchableOpacity onPress={() => returnToSession(sessionId)} style={styles.endButton} activeOpacity={0.85}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  callScreen: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  callChrome: { position: 'absolute', top: 10, left: 0, right: 0, paddingHorizontal: 12, alignItems: 'flex-end' },
  endButton: { backgroundColor: 'rgba(20, 24, 28, 0.82)', borderRadius: 999, minHeight: 38, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  endButtonText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  stateScreen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateCard: { width: '100%', maxWidth: 420, backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 20 },
  stateTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink },
  stateMessage: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
  stateButton: { marginTop: 18, backgroundColor: colors.ink, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  loadingText: { marginTop: 12, fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted },
});
