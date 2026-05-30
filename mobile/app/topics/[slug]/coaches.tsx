import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useCoaches } from '../../../lib/queries';
import { CoachCard } from '../../../components/CoachCard';
import { colors } from '../../../theme/colors';
import { fontFamilies } from '../../../theme/fonts';

const FILTERS = ['All', 'Anxiety', 'English', 'Today', '★ 4.8+'];

export default function CoachList() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topicSlug = Array.isArray(slug) ? slug[0] : slug;
  const [activeFilter, setActiveFilter] = useState('All');
  const { data: coaches, isLoading, isError } = useCoaches(topicSlug);
  const coachList = Array.isArray(coaches) ? coaches : [];

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose your guide</Text>
        <View style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>⚙</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Coach list */}
      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Coaches unavailable</Text>
          <Text style={styles.emptyText}>MANAS could not load coaches right now.</Text>
        </View>
      ) : coachList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No coaches available</Text>
          <Text style={styles.emptyText}>Check whether the production database has been seeded.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {coachList.map((c: any, i: number) => (
            <CoachCard
              key={c.id}
              coach={c}
              index={i}
              onPress={() => router.push(`/booking/${c.id}?topicSlug=${topicSlug}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.ink },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 17, color: colors.ink },
  filterBtn: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  filterBtnText: { fontSize: 13, color: colors.cream },
  filters: { paddingHorizontal: 22, gap: 7, marginBottom: 14 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
  list: { paddingHorizontal: 22, gap: 10, paddingBottom: 24 },
  emptyState: { marginHorizontal: 22, backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  emptyText: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
});
