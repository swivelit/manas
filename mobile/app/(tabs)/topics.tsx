import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCategoryTopics } from '../../lib/queries';
import { TopicTile } from '../../components/TopicTile';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function TopicsScreen() {
  const { data: topics, isLoading } = useCategoryTopics('emotional-healing');
  const [search, setSearch] = React.useState('');

  const filtered = topics?.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emotional{'\n'}<Text style={styles.titleItalic}>Healing.</Text></Text>
        <Text style={styles.sub}>15 spaces to feel, soften, and return to yourself</Text>
      </View>

      {/* Search */}
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search a feeling…"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Grid */}
      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.slug}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => (
            <TopicTile
              topic={item}
              index={index}
              onPress={() => router.push(`/topics/${item.slug}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  backText: { fontSize: 18, color: colors.ink },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.4, lineHeight: 27 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.blue },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 4 },
  search: { marginHorizontal: 22, marginBottom: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchIcon: { fontSize: 14, color: colors.muted },
  searchInput: { flex: 1, fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.ink },
  grid: { paddingHorizontal: 22, paddingBottom: 24 },
  row: { gap: 8, marginBottom: 8, flex: 1 },
});
