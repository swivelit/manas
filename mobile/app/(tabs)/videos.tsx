import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useVideos } from '../../lib/queries';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const TYPE_CHIPS = ['All', 'Intro', 'Therapy', 'Coaching', 'Motivational'];
const TYPE_MAP: Record<string, string | undefined> = {
  All: undefined, Intro: 'INTRO', Therapy: 'THERAPY', Coaching: 'COACHING', Motivational: 'MOTIVATIONAL',
};

const thumbColors = [
  { start: colors.peach, end: colors.pink },
  { start: colors.blue, end: colors.purple },
  { start: colors.sage, end: colors.blue },
];

export default function VideosScreen() {
  const [activeType, setActiveType] = useState('All');
  const { data: videos, isLoading } = useVideos({ type: TYPE_MAP[activeType] });

  const featured = videos?.[0];
  const list = videos?.slice(1) ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.head}>
          <Text style={styles.title}>The Library —{'\n'}<Text style={styles.titleItalic}>watch & learn.</Text></Text>
          <Text style={styles.sub}>Therapist-led guidance, anytime</Text>
        </View>

        {/* Featured */}
        {featured && (
          <TouchableOpacity
            onPress={() => router.push(`/video/${featured.id}`)}
            style={styles.featured}
            activeOpacity={0.88}
          >
            <View style={styles.playBtn}>
              <Icon name="play" size={16} color={colors.ink} />
            </View>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredLabel}>FEATURED · {featured.isPremium ? 'PREMIUM' : 'FREE'}</Text>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <Text style={styles.featuredTime}>{Math.floor(featured.durationSec / 60)} min · {featured.topic?.name ?? 'General'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Type chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TYPE_CHIPS.map(chip => (
            <TouchableOpacity
              key={chip}
              onPress={() => setActiveType(chip)}
              style={[styles.chip, activeType === chip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeType === chip && styles.chipTextActive]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Video list */}
        {isLoading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.list}>
            {list.map((v: any, i: number) => {
              const grad = thumbColors[i % thumbColors.length];
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => router.push(`/video/${v.id}`)}
                  style={styles.vidItem}
                  activeOpacity={0.85}
                >
                  <View style={[styles.thumb, { backgroundColor: grad.end }]}>
                    <Text style={styles.playSmall}>▶</Text>
                  </View>
                  <View style={styles.vidText}>
                    <Text style={styles.vidType}>{v.type} · {v.isPremium ? 'PREMIUM' : 'FREE'}</Text>
                    <Text style={styles.vidTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={styles.vidMeta}>{Math.floor(v.durationSec / 60)} min</Text>
                  </View>
                  {v.isPremium && <Icon name="lock" size={12} color={colors.muted} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 24 },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink, letterSpacing: -0.3, lineHeight: 26 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, marginTop: 2 },
  featured: {
    marginHorizontal: 22,
    marginBottom: 16,
    height: 140,
    borderRadius: 18,
    backgroundColor: colors.blueDeep,
    justifyContent: 'flex-end',
    padding: 12,
    overflow: 'hidden',
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -23,
    marginLeft: -23,
    width: 46,
    height: 46,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredMeta: {},
  featuredLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  featuredTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 14, color: '#FFF', marginTop: 2, lineHeight: 17 },
  featuredTime: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  chips: { paddingHorizontal: 22, gap: 6, marginBottom: 12 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
  list: { paddingHorizontal: 22, gap: 10 },
  vidItem: { backgroundColor: colors.paper, borderRadius: 14, padding: 8, flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  thumb: { width: 62, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  playSmall: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  vidText: { flex: 1 },
  vidType: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, letterSpacing: 1.5, color: colors.pink, textTransform: 'uppercase' },
  vidTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 11.5, color: colors.ink, marginTop: 2, lineHeight: 14 },
  vidMeta: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, marginTop: 3 },
});
