import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Switch, Alert, TouchableOpacity,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAdminVideos,
  useAllTopics,
  useCreateAdminVideo,
  useDeleteAdminVideo,
  useUpdateAdminVideo,
} from '../../lib/queries';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const VIDEO_TYPES = ['INTRO', 'TOPIC', 'THERAPY', 'COACHING', 'MOTIVATIONAL'] as const;
type VideoTypeOption = typeof VIDEO_TYPES[number];

type AdminVideo = {
  id: string; title: string; type: string; isPremium: boolean; approved: boolean;
  topic?: { name?: string } | null;
};

type TopicLite = { id: string; name: string; category?: { name?: string } };

export default function AdminContent() {
  const { data, isLoading, isError } = useAdminVideos();
  const { data: topics } = useAllTopics();
  const update = useUpdateAdminVideo();
  const create = useCreateAdminVideo();
  const remove = useDeleteAdminVideo();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [type, setType] = useState<VideoTypeOption>('THERAPY');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const videos: AdminVideo[] = Array.isArray(data) ? data : [];
  const topicList: TopicLite[] = Array.isArray(topics) ? topics : [];

  function set(id: string, patch: { approved?: boolean; isPremium?: boolean }) {
    update.mutate({ id, ...patch }, { onError: () => Alert.alert('Could not update', 'Please try again.') });
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setUrl('');
    setThumbnailUrl('');
    setType('THERAPY');
    setTopicId(null);
    setIsPremium(false);
  }

  async function submit() {
    if (!title.trim() || !description.trim() || !url.trim()) {
      Alert.alert('Missing details', 'Title, description, and video URL are required.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      Alert.alert('Check the URL', 'Enter a full video URL starting with http(s)://');
      return;
    }
    if (thumbnailUrl.trim() && !/^https?:\/\//i.test(thumbnailUrl.trim())) {
      Alert.alert('Check the thumbnail URL', 'Enter a full thumbnail URL starting with http(s)://');
      return;
    }

    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        type,
        isPremium,
        topicId: topicId || undefined,
      });
      resetForm();
      setModalOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const msg = typeof e?.response?.data?.error === 'string' ? e.response!.data!.error as string : 'Please check the fields and try again.';
      Alert.alert('Could not add video', msg);
    }
  }

  function confirmDelete(video: AdminVideo) {
    Alert.alert('Delete video', `Remove "${video.title}" from the library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove.mutate(video.id, { onError: () => Alert.alert('Could not delete', 'Please try again.') });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>LIBRARY</Text>
          <Text style={styles.title}>Content{videos.length ? ` · ${videos.length}` : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add video</Text>
        </TouchableOpacity>
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
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)} activeOpacity={0.85}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
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

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetTitle}>Add video</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Three breaths for an anxious day" placeholderTextColor={colors.muted} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What this video helps with..." placeholderTextColor={colors.muted} multiline />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Video URL</Text>
                  <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://example.com/video.mp4" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Thumbnail URL (optional)</Text>
                  <TextInput style={styles.input} value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="https://example.com/thumb.jpg" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.chips}>
                    {VIDEO_TYPES.map(t => (
                      <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)} activeOpacity={0.85}>
                        <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Topic (optional)</Text>
                  <View style={styles.chips}>
                    <TouchableOpacity style={[styles.chip, topicId === null && styles.chipActive]} onPress={() => setTopicId(null)} activeOpacity={0.85}>
                      <Text style={[styles.chipText, topicId === null && styles.chipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {topicList.map(t => (
                      <TouchableOpacity key={t.id} style={[styles.chip, topicId === t.id && styles.chipActive]} onPress={() => setTopicId(t.id)} activeOpacity={0.85}>
                        <Text style={[styles.chipText, topicId === t.id && styles.chipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.premiumRow}>
                  <Text style={styles.toggleLabel}>Premium</Text>
                  <Switch value={isPremium} onValueChange={setIsPremium} trackColor={{ true: colors.pink, false: colors.line }} thumbColor={colors.paper} />
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.cancelBtn} activeOpacity={0.85}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Button label={create.isPending ? 'Adding...' : 'Add video'} onPress={submit} loading={create.isPending} />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  addBtn: { backgroundColor: colors.ink, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  row: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  rowHidden: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vTitle: { flex: 1, fontFamily: fontFamilies.frauncesMedium, fontSize: 14, color: colors.ink, lineHeight: 18 },
  premiumBadge: { backgroundColor: colors.pinkSoft, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  premiumBadgeText: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, letterSpacing: 0.5 },
  deleteBtn: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 9 },
  deleteText: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, color: colors.pink, letterSpacing: 0.5 },
  vMeta: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 3 },
  toggles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 8, paddingHorizontal: 12 },
  toggleLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  help: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,28,46,0.4)', justifyContent: 'flex-end' },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 99, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 19, color: colors.ink, marginBottom: 4 },
  field: { gap: 6, marginTop: 12 },
  fieldLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, fontFamily: fontFamilies.dmSans, fontSize: 14, color: colors.ink },
  multiline: { height: 82, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
  premiumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  cancelText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
});
