import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useVideo, useVideoProgress, useBookmarkVideo, useLikeVideo } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Icon } from '../../components/Icon';
import { clearMascotBriefingOverride, setMascotBriefingOverride } from '../../components/MascotAssistant';

type VideoDetails = {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string | null;
  subtitleUrl?: string | null;
  toyDescription?: string | null;
  toyAudioUrl?: string | null;
  durationSec: number;
  type: string;
  isPremium: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  topic?: { name: string } | null;
  progress?: { progressSec?: number | null; completed?: boolean | null } | null;
};

function PlayableVideo({ video, videoId }: { video: VideoDetails; videoId: string }) {
  const token = useAuthStore(s => s.token);
  const trackProgress = useVideoProgress();
  const lastPostedSecondRef = useRef<number | null>(null);
  const savedProgressSec = typeof video.progress?.progressSec === 'number' ? video.progress.progressSec : 0;

  const source = useMemo(() => ({
    uri: video.url,
    metadata: {
      title: video.title,
      artwork: video.thumbnailUrl ?? undefined,
    },
  }), [video.thumbnailUrl, video.title, video.url]);

  const player = useVideoPlayer(source, p => {
    p.timeUpdateEventInterval = 1;
    if (savedProgressSec > 0) {
      p.currentTime = savedProgressSec;
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!token) return;
    const pos = Math.floor(currentTime);
    const dur = Math.floor(video.durationSec ?? 0);
    const completed = dur > 0 && pos >= dur - 5;
    if (pos % 10 === 0 && pos > 0 && lastPostedSecondRef.current !== pos && !trackProgress.isPending) {
      lastPostedSecondRef.current = pos;
      trackProgress.mutate({ id: videoId, progressSec: pos, completed });
    }
  });

  return (
    <VideoView
      player={player}
      style={styles.player}
      nativeControls
      contentFit="contain"
      buttonOptions={{ showSubtitles: video.subtitleUrl ? undefined : false }}
    />
  );
}

export default function VideoPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const videoId = Array.isArray(id) ? id[0] : id;
  const { data, isLoading, isError, error } = useVideo(videoId);
  const bookmark = useBookmarkVideo();
  const like = useLikeVideo();
  const token = useAuthStore(s => s.token);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const video = data?.video as VideoDetails | undefined;
  const paywalled = data?.paywalled === true;

  useEffect(() => {
    if (!video || (!video.toyDescription && !video.toyAudioUrl)) {
      clearMascotBriefingOverride();
      return undefined;
    }

    setMascotBriefingOverride({
      text: video.toyDescription?.trim() || video.description,
      audioUrl: video.toyAudioUrl ?? undefined,
    });

    return () => {
      clearMascotBriefingOverride();
    };
  }, [video]);

  async function handleBookmark() {
    if (!token) { Alert.alert('Sign in', 'Sign in to bookmark videos.'); return; }
    try {
      const res = await bookmark.mutateAsync(videoId);
      setIsBookmarked(res.bookmarked);
    } catch {
      Alert.alert('Could not bookmark');
    }
  }

  async function handleLike() {
    if (!token) { Alert.alert('Sign in', 'Sign in to like videos.'); return; }
    try {
      await like.mutateAsync(videoId);
    } catch {
      Alert.alert('Could not update like');
    }
  }

  if (!videoId || isError) {
    const message = (error as any)?.response?.status === 404
      ? 'This video could not be found.'
      : 'This video could not load. Check your connection and try again.';
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.type}>VIDEO UNAVAILABLE</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Unable to open video</Text>
          <Text style={styles.errorBody}>{message}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn} activeOpacity={0.85}>
            <Text style={styles.errorBtnText}>Back to library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  // Premium access notice — 402 from the backend.
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
            <Text style={styles.paywallTitle}>Premium content</Text>
            <Text style={styles.paywallBody}>
              Premium content — ask an admin for access.
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.paywallBackBtn}>
              <Text style={styles.paywallBackText}>← Back to library</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.type}>VIDEO UNAVAILABLE</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Unable to open video</Text>
          <Text style={styles.errorBody}>The library did not return playable video details.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn} activeOpacity={0.85}>
            <Text style={styles.errorBtnText}>Back to library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.type}>{video.type} · {video.isPremium ? 'PREMIUM' : 'FREE'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleLike}
            disabled={like.isPending}
            style={[styles.likeBtn, video.likedByMe && styles.likeBtnActive]}
          >
            <Icon name="thumbs_up" size={15} color={video.likedByMe ? colors.ink : colors.cream} strokeWidth={video.likedByMe ? 2.3 : 1.6} />
            <Text style={[styles.likeText, video.likedByMe && styles.likeTextActive]}>{video.likeCount ?? 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={styles.heartBtn}>
            <Icon name="heart" size={18} color={isBookmarked ? colors.pink : colors.cream} strokeWidth={isBookmarked ? 2.5 : 1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <PlayableVideo video={video} videoId={videoId} />

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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeBtn: { height: 34, minWidth: 58, borderRadius: 99, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  likeBtnActive: { backgroundColor: colors.cream },
  likeText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.cream },
  likeTextActive: { color: colors.ink },
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
  paywallTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  paywallBody: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20, marginTop: 10 },
  paywallBackBtn: { marginTop: 14, paddingVertical: 4 },
  paywallBackText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.muted },
  errorWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  errorTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.cream },
  errorBody: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: '#BCC3DE', lineHeight: 19, marginTop: 8 },
  errorBtn: { alignSelf: 'flex-start', marginTop: 20, backgroundColor: colors.cream, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14 },
  errorBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
});
