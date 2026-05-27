import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useVideo, useVideoProgress, useBookmarkVideo } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Icon } from '../../components/Icon';

export default function VideoPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useVideo(id);
  const trackProgress = useVideoProgress();
  const bookmark = useBookmarkVideo();
  const token = useAuthStore(s => s.token);
  const videoRef = useRef<Video>(null);
  const [, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const video = data?.video;
  const paywalled = data?.paywalled === true;

  function handleStatus(s: AVPlaybackStatus) {
    setStatus(s);
    if (!token || !s.isLoaded) return;
    const pos = Math.floor(s.positionMillis / 1000);
    const dur = Math.floor((s.durationMillis ?? 0) / 1000);
    const completed = dur > 0 && pos >= dur - 5;
    if (pos % 10 === 0 && pos > 0) {
      trackProgress.mutate({ id, progressSec: pos, completed });
    }
  }

  async function handleBookmark() {
    if (!token) { Alert.alert('Sign in', 'Sign in to bookmark videos.'); return; }
    try {
      const res = await bookmark.mutateAsync(id);
      setIsBookmarked(res.bookmarked);
    } catch {
      Alert.alert('Could not bookmark');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  // Paywall view — 402 from the backend.
  if (paywalled) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.type}>PREMIUM · LOCKED</Text>
        </View>
        <View style={styles.paywallWrap}>
          <View style={styles.paywallCard}>
            <Text style={styles.paywallEmoji}>✿</Text>
            <Text style={styles.paywallTitle}>A premium space.</Text>
            <Text style={styles.paywallBody}>
              This video is part of MANAS Premium. Upgrade to unlock guided coaching content and unlimited library access.
            </Text>
            <TouchableOpacity
              style={styles.paywallBtn}
              activeOpacity={0.85}
              onPress={() => Alert.alert('Coming soon', 'Premium upgrades are launching soon. Thanks for your patience.')}
            >
              <Text style={styles.paywallBtnText}>Coming soon</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.paywallBackBtn}>
              <Text style={styles.paywallBackText}>← Back to library</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.type}>{video.type} · {video.isPremium ? 'PREMIUM' : 'FREE'}</Text>
        <TouchableOpacity onPress={handleBookmark} style={styles.heartBtn}>
          <Icon name="heart" size={18} color={isBookmarked ? colors.pink : colors.cream} strokeWidth={isBookmarked ? 2.5 : 1.5} />
        </TouchableOpacity>
      </View>

      {/* NOTE: expo-av Video doesn't expose a textTracks prop. The subtitleUrl is stored
          and surfaced as a "CC" badge below; full WebVTT rendering ships with the
          expo-video migration planned for v1.1. */}
      <Video
        ref={videoRef}
        source={{ uri: video.url }}
        style={styles.player}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handleStatus}
      />

      <View style={styles.meta}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.desc}>{video.description}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.info}>{Math.floor(video.durationSec / 60)} min</Text>
          {video.topic && <><Text style={styles.infoDot}>·</Text><Text style={styles.info}>{video.topic.name}</Text></>}
          {video.subtitleUrl && <><Text style={styles.infoDot}>·</Text><Text style={styles.info}>CC</Text></>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.cream },
  type: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 2, color: colors.pink, textTransform: 'uppercase', flex: 1 },
  heartBtn: { width: 34, height: 34, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  player: { width: '100%', height: 240, backgroundColor: '#000' },
  meta: { padding: 22 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 20, color: colors.cream, letterSpacing: -0.3, lineHeight: 24 },
  desc: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: '#BCC3DE', lineHeight: 19, marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  info: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
  infoDot: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
  paywallWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  paywallCard: { backgroundColor: colors.cream, borderRadius: 22, padding: 26, alignItems: 'center', maxWidth: 360 },
  paywallEmoji: { fontSize: 32, color: colors.pink, marginBottom: 8 },
  paywallTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  paywallBody: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20, marginTop: 10 },
  paywallBtn: { backgroundColor: colors.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  paywallBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  paywallBackBtn: { marginTop: 14, paddingVertical: 4 },
  paywallBackText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.muted },
});
