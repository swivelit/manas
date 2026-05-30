import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminVideos, useUpdateAdminVideo } from '../../lib/queries';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

type AdminVideo = {
  id: string; title: string; type: string; isPremium: boolean; approved: boolean;
  topic?: { name?: string } | null;
};

export default function AdminContent() {
  const { data, isLoading, isError } = useAdminVideos();
  const update = useUpdateAdminVideo();
  const videos: AdminVideo[] = Array.isArray(data) ? data : [];

  function set(id: string, patch: { approved?: boolean; isPremium?: boolean }) {
    update.mutate({ id, ...patch }, { onError: () => Alert.alert('Could not update', 'Please try again.') });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <Text style={styles.kicker}>LIBRARY</Text>
        <Text style={styles.title}>Content{videos.length ? ` · ${videos.length}` : ''}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Couldn't load content</Text></View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.help}>No videos in the library yet.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.row, !item.approved && styles.rowHidden]}>
              <View style={styles.rowTop}>
                <Text style={styles.vTitle} numberOfLines={2}>{item.title}</Text>
                {item.isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PREMIUM</Text></View>}
              </View>
              <Text style={styles.vMeta}>{item.type}{item.topic?.name ? ` · ${item.topic.name}` : ''}</Text>
              <View style={styles.toggles}>
                <View style={styles.toggle}>
                  <Text style={styles.toggleLabel}>Approved</Text>
                  <Switch value={item.approved} onValueChange={(v) => set(item.id, { approved: v })} trackColor={{ true: colors.sage, false: colors.line }} thumbColor={colors.paper} />
                </View>
                <View style={styles.toggle}>
                  <Text style={styles.toggleLabel}>Premium</Text>
                  <Switch value={item.isPremium} onValueChange={(v) => set(item.id, { isPremium: v })} trackColor={{ true: colors.pink, false: colors.line }} thumbColor={colors.paper} />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  row: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  rowHidden: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vTitle: { flex: 1, fontFamily: fontFamilies.frauncesMedium, fontSize: 14, color: colors.ink, lineHeight: 18 },
  premiumBadge: { backgroundColor: colors.pinkSoft, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  premiumBadgeText: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, letterSpacing: 0.5 },
  vMeta: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 3 },
  toggles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 8, paddingHorizontal: 12 },
  toggleLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  help: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 20 },
});
