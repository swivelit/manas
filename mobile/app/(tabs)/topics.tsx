import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVideoBookmarks, useVideoLikes,useBookmarkVideo } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { Icon } from '../../components/Icon';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const thumbColors = [
  colors.pink,
  colors.purple,
  colors.blue,
];

export default function TopicsScreen() {
  const dialog = useDialog();
  const token = useAuthStore(s => s.token);

  const { data: bookmarks, isLoading, isError } = useVideoBookmarks();
  const { data: likes, isLoading: likesLoading } = useVideoLikes();
  const bookmark = useBookmarkVideo();

  const bookmarkList = Array.isArray(bookmarks) ? bookmarks : [];
  const likeList = Array.isArray(likes) ? likes : [];

  async function handleRemoveBookmark(id: string) {
    if (!token) {
      void dialog.alert('Sign in', 'Sign in to manage saved videos.');
      return;
    }

    try {
      await bookmark.mutateAsync(id);
    } catch {
      void dialog.alert('Could not update saved video');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.head}>
          <Text style={styles.title}>
            Saved{'\n'}
            <Text style={styles.titleItalic}>videos.</Text>
          </Text>

          <Text style={styles.sub}>
            Your saved guidance, all in one place
          </Text>
        </View>

       {isLoading ? (
  <ActivityIndicator
    color={colors.blue}
    style={{ marginTop: 40 }}
  />
) : isError ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>Saved videos unavailable</Text>
    <Text style={styles.emptyText}>
      MANAS could not load your saved videos right now.
    </Text>
  </View>
) : (
  <>
    {/* Bookmarked videos */}
    <Text style={styles.sectionTitle}>Bookmarked videos</Text>

    {bookmarkList.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No bookmarked videos yet</Text>
        <Text style={styles.emptyText}>
          Tap the heart on a video in the Library to save it here.
        </Text>
      </View>
    ) : (
      <View style={styles.list}>
        {bookmarkList.map((video: any, index: number) => (
          <TouchableOpacity
            key={video.id}
            onPress={() => router.push(`/video/${video.id}`)}
            style={styles.vidItem}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor:
                    thumbColors[index % thumbColors.length],
                },
              ]}
            >
              <Text style={styles.playSmall}>▶</Text>
            </View>

            <View style={styles.vidText}>
              <Text style={styles.vidType}>
                {video.type} · {video.isPremium ? 'PREMIUM' : 'FREE'}
              </Text>

              <Text style={styles.vidTitle} numberOfLines={2}>
                {video.title}
              </Text>

              <Text style={styles.vidMeta}>
                {Math.floor(video.durationSec ?? 0) / 60 >= 1
                  ? `${Math.floor(video.durationSec / 60)} min`
                  : `${video.durationSec ?? 0} sec`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleRemoveBookmark(video.id)}
              hitSlop={10}
              style={styles.heartBtn}
            >
              <Icon
                name="heart"
                size={16}
                color={colors.pink}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    )}

    {/* Liked videos */}
    <Text style={styles.sectionTitle}>Liked videos</Text>

    {likesLoading ? (
      <ActivityIndicator
        color={colors.blue}
        style={{ marginTop: 20 }}
      />
    ) : likeList.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No liked videos yet</Text>
        <Text style={styles.emptyText}>
          Tap the like button on a video to see it here.
        </Text>
      </View>
    ) : (
      <View style={styles.list}>
        {likeList.map((video: any, index: number) => (
          <TouchableOpacity
            key={video.id}
            onPress={() => router.push(`/video/${video.id}`)}
            style={styles.vidItem}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor:
                    thumbColors[index % thumbColors.length],
                },
              ]}
            >
              <Text style={styles.playSmall}>▶</Text>
            </View>

            <View style={styles.vidText}>
              <Text style={styles.vidType}>
                {video.type} · {video.isPremium ? 'PREMIUM' : 'FREE'}
              </Text>

              <Text style={styles.vidTitle} numberOfLines={2}>
                {video.title}
              </Text>

              <Text style={styles.vidMeta}>
                {Math.floor(video.durationSec ?? 0) / 60 >= 1
                  ? `${Math.floor(video.durationSec / 60)} min`
                  : `${video.durationSec ?? 0} sec`}
              </Text>
            </View>

            <Icon
              name="thumbs_up"
              size={16}
              color={colors.pink}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        ))}
      </View>
    )}
  </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  scroll: {
    paddingBottom: 24,
  },

  head: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
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
    color: colors.pink,
  },

  sub: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },

  list: {
    paddingHorizontal: 22,
    gap: 10,
  },

  vidItem: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },

  thumb: {
    width: 62,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  playSmall: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },

  vidText: {
    flex: 1,
  },

  vidType: {
    fontFamily: fontFamilies.dmSansBold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: colors.pink,
    textTransform: 'uppercase',
  },

  vidTitle: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 11.5,
    color: colors.ink,
    marginTop: 2,
    lineHeight: 14,
  },

  vidMeta: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 9,
    color: colors.muted,
    marginTop: 3,
  },

  heartBtn: {
    padding: 6,
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
  sectionTitle: {
  paddingHorizontal: 22,
  marginTop: 8,
  marginBottom: 10,
  fontFamily: fontFamilies.dmSansBold,
  fontSize: 11,
  letterSpacing: 1.2,
  color: colors.pink,
  textTransform: 'uppercase',
},
});