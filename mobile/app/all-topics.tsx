import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCategoryTopics } from '../lib/queries';
import { TopicTile } from '../components/TopicTile';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

export default function AllTopicsScreen() {
  const {
    data: emotionalTopics,
    isLoading: emotionalLoading,
    isError: emotionalError,
  } = useCategoryTopics('emotional-healing');

  const {
    data: coachingTopics,
    isLoading: coachingLoading,
    isError: coachingError,
  } = useCategoryTopics('coaching');

  const [search, setSearch] = React.useState('');

  const emotionalList = Array.isArray(emotionalTopics)
    ? emotionalTopics
    : [];

  const coachingList = Array.isArray(coachingTopics)
    ? coachingTopics
    : [];

  const filteredEmotional = emotionalList.filter((topic: any) =>
    String(topic.name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredCoaching = coachingList.filter((topic: any) =>
    String(topic.name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const hasResults =
    filteredEmotional.length > 0 || filteredCoaching.length > 0;

  const isLoading = emotionalLoading || coachingLoading;
  const isError = emotionalError || coachingError;

  function renderRows(topics: any[], prefix: string) {
    const rows = [];

    for (let i = 0; i < topics.length; i += 3) {
      rows.push(
        <View key={`${prefix}-row-${i}`} style={styles.row}>
          {topics.slice(i, i + 3).map((item: any, index: number) => (
            <TopicTile
              key={`${prefix}-${item.slug}`}
              topic={item}
              index={i + index}
              onPress={() => router.push(`/topics/${item.slug}`)}
            />
          ))}

          {topics.length - i < 3 &&
            Array.from({ length: 3 - (topics.length - i) }).map(
              (_, emptyIndex) => (
                <View
                  key={`${prefix}-empty-${emptyIndex}`}
                  style={styles.emptyTile}
                />
              )
            )}
        </View>
      );
    }

    return rows;
  }

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
          All <Text style={styles.titleItalic}>Topics.</Text>
        </Text>

        <Text style={styles.sub}>
          Explore Emotional Healing and Coaching & Growth
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
          <Text style={styles.emptyTitle}>
            Topics unavailable
          </Text>

          <Text style={styles.emptyText}>
            MANAS could not load the topics right now.
          </Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No topics found
          </Text>

          <Text style={styles.emptyText}>
            Try a different search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => 'topics'}
          contentContainerStyle={styles.grid}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {filteredEmotional.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>
                    Emotional Healing
                  </Text>

                  <View style={styles.topicGrid}>
                    {renderRows(
                      filteredEmotional,
                      'emotional'
                    )}
                  </View>
                </>
              ) : null}

              {filteredCoaching.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>
                    Coaching & Growth
                  </Text>

                  <View style={styles.topicGrid}>
                    {renderRows(
                      filteredCoaching,
                      'coaching'
                    )}
                  </View>
                </>
              ) : null}
            </View>
          }
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
    paddingBottom: 14,
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
    marginBottom: 14,
  },

  backText: {
    fontSize: 18,
    color: colors.ink,
  },

  title: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 27,
  },

  titleItalic: {
    fontFamily: fontFamilies.frauncesItalic,
    color: colors.blue,
  },

  sub: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },

  search: {
    marginHorizontal: 22,
    marginBottom: 14,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  searchIcon: {
    fontSize: 14,
    color: colors.muted,
  },

  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.ink,
  },

  grid: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  sectionTitle: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 18,
    color: colors.ink,
    marginTop: 6,
    marginBottom: 10,
  },

  topicGrid: {
    marginBottom: 18,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  emptyTile: {
    flex: 1,
  },

  emptyState: {
    marginHorizontal: 22,
    marginTop: 16,
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