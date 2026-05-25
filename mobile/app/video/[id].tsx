import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useVideo, useVideoProgress } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function VideoPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: video, isLoading } = useVideo(id);
  const trackProgress = useVideoProgress();
  const token = useAuthStore(s => s.token);
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  function handleStatus(s: AVPlaybackStatus) {
    setStatus(s);
    if (!token || !s.isLoaded) return;
    const pos = Math.floor((s as any).positionMillis / 1000);
    const dur = Math.floor((s as any).durationMillis / 1000);
    const completed = dur > 0 && pos >= dur - 5;
    if (pos % 10 === 0 && pos > 0) {
      trackProgress.mutate({ id, progressSec: pos, completed });
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!video) return null;

  return (
    <SafeAreaView style={styles.screen}>
      {/* Back */}
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.type}>{video.type} · {video.isPremium ? 'PREMIUM' : 'FREE'}</Text>
      </View>

      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri: video.url }}
        style={styles.player}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handleStatus}
      />

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.desc}>{video.description}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.info}>{Math.floor(video.durationSec / 60)} min</Text>
          {video.topic && <><Text style={styles.infoDot}>·</Text><Text style={styles.info}>{video.topic.name}</Text></>}
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
  type: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 2, color: colors.pink, textTransform: 'uppercase' },
  player: { width: '100%', height: 240, backgroundColor: '#000' },
  meta: { padding: 22 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 20, color: colors.cream, letterSpacing: -0.3, lineHeight: 24 },
  desc: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: '#BCC3DE', lineHeight: 19, marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  info: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
  infoDot: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
});
