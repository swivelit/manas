import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useVideo, useVideoProgress, useBookmarkVideo, useLikeVideo } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Icon } from '../../components/Icon';
import { useDialog } from '../../components/AppDialog';
import { clearMascotBriefingOverride, setMascotBriefingOverride } from '../../components/MascotAssistant';
type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};
function parseSubtitleTime(value: string): number {
  const parts = value.trim().replace(',', '.').split(':');

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    return minutes * 60 + seconds;
  }

  return 0;
}
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

function PlayableVideo({ video, videoId ,subtitleEnabled,}: { video: VideoDetails; videoId: string , subtitleEnabled: boolean; }) {
  const token = useAuthStore(s => s.token);
  const trackProgress = useVideoProgress();
  const lastPostedSecondRef = useRef<number | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const savedProgressSec = typeof video.progress?.progressSec === 'number' ? video.progress.progressSec : 0;
  useEffect(() => {
  if (!video.subtitleUrl) {
    setSubtitleCues([]);
    return;
  }

  let cancelled = false;

  async function loadSubtitles() {
    try {
      const response = await fetch(video.subtitleUrl!);

      if (!response.ok) {
        throw new Error(`Subtitle request failed: ${response.status}`);
      }

      const content = await response.text();

      if (cancelled) return;

      const blocks = content
        .replace(/\r/g, '')
        .split(/\n\n+/);

      const cues: SubtitleCue[] = [];

      for (const block of blocks) {
        const lines = block
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        const timingIndex = lines.findIndex(line => line.includes('-->'));

        if (timingIndex === -1) continue;

        const [startTime, endTime] = lines[timingIndex]
          .split('-->')
          .map(value => value.trim().split(' ')[0]);

        const text = lines
          .slice(timingIndex + 1)
          .join('\n')
          .replace(/<[^>]+>/g, '');

        if (!text) continue;

        cues.push({
          start: parseSubtitleTime(startTime),
          end: parseSubtitleTime(endTime),
          text,
        });
      }

      setSubtitleCues(cues);
    } catch (error) {
      console.log('SUBTITLE LOAD ERROR:', error);
      setSubtitleCues([]);
    }
  }

  void loadSubtitles();

  return () => {
    cancelled = true;
  };
}, [video.subtitleUrl]);
  
  const source = useMemo(() => ({
  uri: video.url,
  metadata: {
    title: video.title,
    artwork: video.thumbnailUrl ?? undefined,
  },
  subtitle: video.subtitleUrl
    ? {
        uri: video.subtitleUrl,
        language: 'en',
        label: 'English',
      }
    : undefined,
}), [
  video.thumbnailUrl,
  video.subtitleUrl,
  video.title,
  video.url,
]);

  const player = useVideoPlayer(source, p => {
  p.timeUpdateEventInterval = 1;

  if (savedProgressSec > 0) {
    p.currentTime = savedProgressSec;
  }
});

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const activeCue = subtitleCues.find(
      cue => currentTime >= cue.start && currentTime < cue.end
    );

    setCurrentSubtitle(
     subtitleEnabled && activeCue ? activeCue.text : ''
  );
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
  <View style={styles.videoContainer}>
    <VideoView
      player={player}
      style={styles.player}
      nativeControls
      contentFit="contain"
      allowsPictureInPicture={false}
       buttonOptions={{ showSubtitles: false }}
    />
     {currentSubtitle ? (
      <View style={styles.subtitleOverlay}>
        <Text style={styles.subtitleText}>{currentSubtitle}</Text>
      </View>
    ) : null}
  </View>
  );
}

export default function VideoPlayer() {
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const videoId = Array.isArray(id) ? id[0] : id;
  const { data, isLoading, isError, error } = useVideo(videoId);
  const bookmark = useBookmarkVideo();
  const like = useLikeVideo();
  const token = useAuthStore(s => s.token);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);

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
    if (!token) { void dialog.alert('Sign in', 'Sign in to bookmark videos.'); return; }
    try {
      const res = await bookmark.mutateAsync(videoId);
      setIsBookmarked(res.bookmarked);
    } catch {
      void dialog.alert('Could not bookmark');
    }
  }

  async function handleLike() {
    if (!token) { void dialog.alert('Sign in', 'Sign in to like videos.'); return; }
    try {
      await like.mutateAsync(videoId);
    } catch {
      void dialog.alert('Could not update like');
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
            <Icon
    name="thumbs_up"
    size={15}
    color={video.likedByMe ? colors.ink : colors.cream}
    strokeWidth={video.likedByMe ? 2.3 : 1.6}
  />
  <Text style={[styles.likeText, video.likedByMe && styles.likeTextActive]}>
    {video.likeCount ?? 0}
  </Text>
</TouchableOpacity>

{video.subtitleUrl ? (
  <TouchableOpacity
    onPress={() => setSubtitleEnabled(prev => !prev)}
    style={styles.ccButton}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.ccButtonText,
        !subtitleEnabled && styles.ccButtonTextOff,
      ]}
    >
      CC
    </Text>
  </TouchableOpacity>
) : null}
          <TouchableOpacity onPress={handleBookmark} style={styles.heartBtn}>
            <Icon name="heart" size={18} color={isBookmarked ? colors.pink : colors.cream} strokeWidth={isBookmarked ? 2.5 : 1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <PlayableVideo video={video} videoId={videoId} subtitleEnabled={subtitleEnabled}/>

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
  videoContainer: {
  width: '100%',
  position: 'relative',
},

subtitleOverlay: {
  position: 'absolute',
  bottom: 20,
  left: 20,
  right: 20,
  alignItems: 'center',
},

subtitleText: {
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  color: '#fff',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  textAlign: 'center',
  fontFamily: fontFamilies.dmSansMedium,
  fontSize: 14,
  lineHeight: 20,
},
  subtitleButton: {
  position: 'absolute',
  right: 10,
  bottom: 10,
  width: 32,
  height: 28,
  borderRadius: 4,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  alignItems: 'center',
  justifyContent: 'center',
},

subtitleButtonText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '700',
},
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
  ccButton: {
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
},

ccButtonText: {
  color: colors.cream,
  fontSize: 13,
  fontWeight: '700',
},

ccButtonTextOff: {
  opacity: 0.4,
},
});
