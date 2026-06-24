import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Switch, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAllTopics, useCreateCoachVideo, useUploadToyAudio, useUploadVideo } from '../../lib/queries';
import { Button } from '../../components/Button';
import { ToyAudioClip, ToyAudioRecorder } from '../../components/ToyAudioRecorder';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import {
  PickedVideoFile,
  durationMsToSeconds,
  formatBytes,
  getReadableErrorMessage,
  pickVideoFromFiles,
} from '../../lib/videoUpload';

const VIDEO_TYPES = ['THERAPY', 'COACHING', 'MOTIVATIONAL', 'TOPIC', 'INTRO'] as const;
type VideoTypeOption = typeof VIDEO_TYPES[number];
const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

type TopicLite = { id: string; name: string; category?: { name?: string } };

export default function CoachUpload() {
  const dialog = useDialog();
  const { data: topics } = useAllTopics();
  const create = useCreateCoachVideo();
  const uploadToyAudio = useUploadToyAudio();
  const uploadVideo = useUploadVideo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [pickedVideo, setPickedVideo] = useState<PickedVideoFile | null>(null);
  const [toyDescription, setToyDescription] = useState('');
  const [toyAudio, setToyAudio] = useState<ToyAudioClip | null>(null);
  const [duration, setDuration] = useState('');
  const [type, setType] = useState<VideoTypeOption>('THERAPY');
  const [isPremium, setIsPremium] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);

  const topicList: TopicLite[] = Array.isArray(topics) ? topics : [];
  const isBusy = create.isPending || uploadToyAudio.isPending || uploadVideo.isPending;

  async function uploadPickedVideo(video: PickedVideoFile) {
    setPickedVideo(video);
    const durationSec = durationMsToSeconds(video.durationMs);
    if (durationSec) setDuration(String(durationSec));
    try {
      const uploaded = await uploadVideo.mutateAsync({
        uri: video.uri,
        mimeType: video.mimeType,
        sizeBytes: video.sizeBytes,
        fileName: video.fileName,
      });
      setUrl(uploaded.url);
      if (uploaded.thumbnailUrl) setThumbnailUrl(uploaded.thumbnailUrl);
    } catch (err: unknown) {
      void dialog.alert('Could not upload video', getReadableErrorMessage(err, 'Choose another video and try again.'));
    }
  }

  async function chooseFileVideo() {
    try {
      const video = await pickVideoFromFiles();
      if (video) await uploadPickedVideo(video);
    } catch (err: unknown) {
      void dialog.alert('Could not choose video', getReadableErrorMessage(err, 'Choose another video and try again.'));
    }
  }

  async function submit() {
    if (uploadVideo.isPending) {
      void dialog.alert('Upload in progress', 'Wait for the selected video to finish uploading before publishing.');
      return;
    }
    if (!title.trim() || !description.trim() || !url.trim()) {
      void dialog.alert('Missing details', 'Title, description, and a video file or URL are required.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      void dialog.alert('Check the URL', 'Enter a full video URL starting with http(s)://');
      return;
    }
    const parsedDurationSec = duration.trim() ? parseInt(duration.trim(), 10) || 0 : 0;
    const durationSec = parsedDurationSec > 0 ? parsedDurationSec : undefined;
    try {
      const toyAudioUrl = toyAudio
        ? (await uploadToyAudio.mutateAsync({ uri: toyAudio.uri, durationMs: toyAudio.durationMs })).url
        : undefined;
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        toyDescription: toyDescription.trim() || undefined,
        toyAudioUrl,
        type,
        isPremium,
        topicId: topicId || undefined,
        durationSec,
      });
      void dialog.alert('Published', 'Your video has been added to the library.');
      setTitle(''); setDescription(''); setUrl(''); setThumbnailUrl(''); setPickedVideo(null); setToyDescription(''); setToyAudio(null); setDuration('');
      setType('THERAPY'); setIsPremium(false); setTopicId(null);
    } catch (err: unknown) {
      void dialog.alert('Could not publish', getReadableErrorMessage(err, 'Please check the fields and try again.'));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>NEW CONTENT</Text>
          <Text style={styles.title}>Add a{'\n'}<Text style={styles.titleItalic}>video.</Text></Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Three breaths for an anxious day" placeholderTextColor={colors.muted} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What this video helps with…" placeholderTextColor={colors.muted} multiline />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Choose video</Text>
            <View style={styles.videoPicker}>
              <View style={styles.videoPickerActions}>
                <TouchableOpacity style={[styles.pickButton, isBusy && styles.pickButtonDisabled]} onPress={chooseFileVideo} disabled={isBusy} activeOpacity={0.85}>
                  <Text style={styles.pickButtonText}>Choose video file</Text>
                </TouchableOpacity>
              </View>
              {pickedVideo ? (
                <View style={styles.selectedVideo}>
                  <Text style={styles.selectedVideoName} numberOfLines={1}>{pickedVideo.fileName}</Text>
                  <Text style={styles.selectedVideoMeta}>
                    {uploadVideo.isPending ? 'Uploading video...' : url.trim() ? 'Uploaded' : 'Selected'}
                    {formatBytes(pickedVideo.sizeBytes) ? ` - ${formatBytes(pickedVideo.sizeBytes)}` : ''}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.pasteLabel}>or paste a URL</Text>
              <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://.../video.mp4" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Thumbnail URL (optional)</Text>
            <TextInput style={styles.input} value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="https://…/thumb.jpg" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Toy description (optional)</Text>
            <TextInput style={[styles.input, styles.multiline]} value={toyDescription} onChangeText={setToyDescription} placeholder="What the toy should say for this video..." placeholderTextColor={colors.muted} multiline />
          </View>

          <View style={styles.field}>
            <ToyAudioRecorder value={toyAudio} onChange={setToyAudio} disabled={isBusy} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Duration in seconds (optional)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="480" placeholderTextColor={colors.muted} keyboardType="number-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.chips}>
              {VIDEO_TYPES.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)} activeOpacity={0.85}>
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Topic (optional)</Text>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Premium</Text>
              <Text style={styles.premiumHint}>Only premium members can watch.</Text>
            </View>
            <Switch value={isPremium} onValueChange={setIsPremium} trackColor={{ true: colors.pink, false: colors.line }} thumbColor={colors.paper} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 18 }}>
            <Button label={isBusy ? 'Publishing...' : 'Publish video'} onPress={submit} loading={isBusy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 40 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 26, color: colors.ink, letterSpacing: -0.5, lineHeight: 28, marginTop: 2, marginBottom: 18 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  field: { gap: 6, marginBottom: 14 },
  label: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13, fontFamily: fontFamilies.dmSans, fontSize: 14, color: colors.ink },
  multiline: { height: 84, textAlignVertical: 'top' },
  videoPicker: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, gap: 10 },
  videoPickerActions: { flexDirection: 'row', gap: 8 },
  pickButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 12, backgroundColor: colors.ink },
  pickButtonDisabled: { opacity: 0.55 },
  pickButtonText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  selectedVideo: { borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, padding: 10 },
  selectedVideoName: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  selectedVideoMeta: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 2 },
  pasteLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
  premiumRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginTop: 4 },
  premiumHint: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 2 },
});
