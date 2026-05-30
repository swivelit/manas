import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCategoryTopics } from '../lib/queries';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

const icoColors = ['#4C7BFF', '#C47A3C', '#4C7BFF', '#C47A3C', '#4C7BFF', '#C47A3C', '#4C7BFF', '#C47A3C', '#4C7BFF', '#C47A3C'];
const icoBgs = [colors.blueSoft, colors.peachSoft, colors.blueSoft, colors.peachSoft, colors.blueSoft, colors.peachSoft, colors.blueSoft, colors.peachSoft, colors.blueSoft, colors.peachSoft];

export default function CoachingScreen() {
  const { data: topics, isLoading, isError } = useCategoryTopics('coaching');
  const topicList = Array.isArray(topics) ? topics : [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <View style={styles.backWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroMeta}>10 TOPICS · LEADERSHIP TRACK</Text>
          <Text style={styles.heroTitle}>
            Coaching for the{'\n'}<Text style={styles.heroItalic}>quiet leader.</Text>
          </Text>
          <Text style={styles.heroPara}>
            Communication, decision-making, time, teams — practical work with senior coaches.
          </Text>
        </View>

        {/* Topic list */}
        {isLoading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 32 }} />
        ) : isError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Coaching unavailable</Text>
            <Text style={styles.emptyText}>MANAS could not load coaching topics right now.</Text>
          </View>
        ) : topicList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No coaching topics yet</Text>
            <Text style={styles.emptyText}>Check whether the production database has been seeded.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {topicList.map((t: any, i: number) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => router.push(`/topics/${t.slug}`)}
                style={styles.item}
                activeOpacity={0.85}
              >
                <Text style={styles.num}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={[styles.ico, { backgroundColor: icoBgs[i] }]}>
                  <Icon name={t.iconName} size={16} color={icoColors[i]} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>{t.name}</Text>
                  <Text style={styles.itemSub} numberOfLines={1}>{t.description}</Text>
                </View>
                <Text style={styles.arr}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 32 },
  backWrap: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 0 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.ink },
  hero: {
    marginHorizontal: 22,
    marginTop: 14,
    marginBottom: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.blueDeep,
    overflow: 'hidden',
  },
  heroMeta: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' },
  heroTitle: { fontFamily: fontFamilies.fraunces, fontSize: 22, color: '#FFF', marginTop: 6, letterSpacing: -0.3, lineHeight: 26 },
  heroItalic: { fontFamily: fontFamilies.frauncesItalic, color: '#FFD6EC' },
  heroPara: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 15, maxWidth: '80%' },
  list: { paddingHorizontal: 22, gap: 8 },
  item: { backgroundColor: colors.paper, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line },
  num: { fontFamily: fontFamilies.instrumentSerifItalic, fontSize: 20, color: colors.muted, width: 24 },
  ico: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  itemTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 12, color: colors.ink, lineHeight: 15 },
  itemSub: { fontFamily: fontFamilies.dmSans, fontSize: 9, color: colors.muted, marginTop: 1 },
  arr: { fontFamily: fontFamilies.dmSans, fontSize: 16, color: colors.muted },
  emptyState: { marginHorizontal: 22, backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  emptyText: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
});
