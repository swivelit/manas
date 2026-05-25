import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTopic, useCoaches } from '../../lib/queries';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function TopicDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: topic, isLoading } = useTopic(slug);
  const { data: coaches } = useCoaches();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!topic) return null;

  const previewCoaches = coaches?.slice(0, 2) ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.favBtn}>
            <Text>♡</Text>
          </TouchableOpacity>
          <Text style={styles.float1}>✦</Text>
          <Text style={styles.float2}>✿</Text>
          <Text style={styles.float3}>◌</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.tag}>{topic.category?.name?.toUpperCase()} · {String(topic.order ?? '').padStart(2, '0')} / {topic.category?.slug === 'emotional-healing' ? '15' : '10'}</Text>
          <Text style={styles.title}>{topic.name.split(' ').slice(0, -1).join(' ')}{'\n'}<Text style={styles.titleItalic}>{topic.name.split(' ').slice(-1)[0]}.</Text></Text>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statLabel}>SESSIONS</Text><Text style={styles.statVal}>6 weeks</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>COACHES</Text><Text style={styles.statVal}>12 available</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>FORMAT</Text><Text style={styles.statVal}>1-on-1</Text></View>
          </View>

          <Text style={styles.desc}>{topic.description}</Text>

          {/* Coach strip */}
          <View style={styles.coachStrip}>
            <Text style={styles.coachStripLabel}>WORK WITH</Text>
            <View style={styles.coachList}>
              {previewCoaches.map((c: any, i: number) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push(`/topics/${slug}/coaches`)}
                  style={styles.coachChip}
                >
                  <View style={[styles.coachPic, i === 1 && styles.coachPicBlue]} />
                  <View>
                    <Text style={styles.coachName}>{c.user.name.replace('Dr. ', 'Dr. ')}</Text>
                    <Text style={styles.coachRating}>★ {c.rating.toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Book CTA */}
          <TouchableOpacity
            onPress={() => router.push(`/topics/${slug}/coaches`)}
            style={styles.bookBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.bookBtnLeft}>Book a <Text style={styles.bookBtnFree}>free demo</Text></Text>
            <Text style={styles.bookBtnArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingBottom: 32 },
  hero: {
    height: 200,
    backgroundColor: '#F4E9FF',
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 14,
  },
  backBtn: { position: 'absolute', top: 14, left: 20, width: 34, height: 34, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.ink },
  favBtn: { position: 'absolute', top: 14, right: 20, width: 34, height: 34, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  float1: { position: 'absolute', fontSize: 36, opacity: 0.4, top: 30, left: 30, color: colors.ink },
  float2: { position: 'absolute', fontSize: 24, opacity: 0.4, top: 50, right: 34, color: colors.ink },
  float3: { position: 'absolute', fontSize: 18, opacity: 0.4, top: 90, left: '60%', color: colors.ink },
  body: { padding: 22 },
  tag: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, letterSpacing: 2, color: colors.pink },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 26, color: colors.ink, letterSpacing: -0.4, marginTop: 4, lineHeight: 28 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic },
  stats: { flexDirection: 'row', gap: 18, marginTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#F0EBDE' },
  stat: {},
  statLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  statVal: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.ink, marginTop: 2 },
  desc: { fontFamily: fontFamilies.dmSans, fontSize: 11.5, color: colors.inkSoft, lineHeight: 18, marginTop: 14 },
  coachStrip: { marginTop: 'auto', paddingTop: 20 },
  coachStripLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  coachList: { flexDirection: 'row', gap: 8, marginTop: 8 },
  coachChip: { flex: 1, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachPic: { width: 24, height: 24, borderRadius: 99, backgroundColor: colors.pink },
  coachPicBlue: { backgroundColor: colors.blue },
  coachName: { fontFamily: fontFamilies.dmSansMedium, fontSize: 10, color: colors.ink },
  coachRating: { fontFamily: fontFamilies.dmSans, fontSize: 8, color: colors.muted },
  bookBtn: { marginTop: 14, backgroundColor: colors.ink, padding: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookBtnLeft: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  bookBtnFree: { fontFamily: fontFamilies.frauncesItalic, color: colors.pinkSoft, fontSize: 14 },
  bookBtnArrow: { fontFamily: fontFamilies.dmSans, fontSize: 16, color: colors.cream },
});
