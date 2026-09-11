import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCategoryTopics } from '../lib/queries';
import { TopicTile } from '../components/TopicTile';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

export default function EmotionalHealingScreen() {
  const {
    data: topics,
    isLoading,
    isError,
  } = useCategoryTopics('emotional-healing');

  const [search, setSearch] = React.useState('');

  const topicList = Array.isArray(topics) ? topics : [];

  const filtered = topicList.filter((topic: any) =>
    String(topic.name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Emotional{'\n'}
          <Text style={styles.titleItalic}>Healing.</Text>
        </Text>

        <Text style={styles.sub}>
          Explore topics to soothe the mind
        </Text>
      </View>

      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search a topic…"
          placeholderTextColor={colors.muted}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={colors.blue}
          style={{ marginTop: 40 }}
        />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Topics unavailable</Text>
          <Text style={styles.emptyText}>
            MANAS could not load the topics right now.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No topics found</Text>
          <Text style={styles.emptyText}>
            Try a different search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `${item.slug}-${index}`}
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
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  head: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 12,
  },

  back: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  backText: {
    fontSize: 18,
    color: colors.ink,
  },

  title: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 29,
  },

  titleItalic: {
    fontFamily: fontFamilies.frauncesItalic,
    color: colors.pink,
  },

  sub: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.muted,
    marginTop: 5,
  },

  search: {
    marginHorizontal: 22,
    marginBottom: 14,
    height: 42,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  searchIcon: {
    fontSize: 20,
    color: colors.muted,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.dmSans,
    fontSize: 12,
    color: colors.ink,
  },

  grid: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  row: {
    gap: 8,
    marginBottom: 8,
  },

  emptyState: {
    marginHorizontal: 22,
    marginTop: 8,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },

  emptyTitle: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 15,
    color: colors.ink,
  },

  emptyText: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 16,
  },
});