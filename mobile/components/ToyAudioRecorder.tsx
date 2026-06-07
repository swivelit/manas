import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

const MAX_RECORDING_MS = 60_000;

export type ToyAudioClip = {
  uri: string;
  durationMs: number;
};

type Props = {
  value: ToyAudioClip | null;
  onChange: (clip: ToyAudioClip | null) => void;
  disabled?: boolean;
};

function formatSeconds(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}

export function ToyAudioRecorder({ value, onChange, disabled }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recordingRef = useRef(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;
  }

  function unloadPlayer(updateState = true) {
    playerSubscriptionRef.current?.remove();
    playerSubscriptionRef.current = null;
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }
    if (updateState) setPlaying(false);
  }

  async function stopRecording() {
    if (!recordingRef.current) return;

    clearTimers();
    recordingRef.current = false;
    setRecording(false);

    try {
      const statusBeforeStop = recorder.getStatus();
      await recorder.stop();
      const statusAfterStop = recorder.getStatus();
      const uri = recorder.uri ?? statusAfterStop.url;
      if (!uri) {
        Alert.alert('Recording unavailable', 'Try recording the clip again.');
        return;
      }
      onChange({
        uri,
        durationMs: Math.min(statusBeforeStop.durationMillis || elapsedMs, MAX_RECORDING_MS),
      });
    } catch {
      Alert.alert('Could not save recording', 'Try recording the clip again.');
    } finally {
      setElapsedMs(0);
    }
  }

  async function startRecording() {
    if (disabled || recordingRef.current) return;

    try {
      unloadPlayer();
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone required', 'Allow microphone access to record a toy briefing.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      onChange(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      setRecording(true);
      setElapsedMs(0);

      tickRef.current = setInterval(() => {
        if (!recordingRef.current) return;
        const status = recorder.getStatus();
        if (status.isRecording) setElapsedMs(Math.min(status.durationMillis, MAX_RECORDING_MS));
      }, 250);

      stopTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
    } catch {
      clearTimers();
      recordingRef.current = false;
      setRecording(false);
      Alert.alert('Could not start recording', 'Check microphone permissions and try again.');
    }
  }

  async function playClip() {
    if (!value || disabled) return;

    if (playing) {
      unloadPlayer();
      return;
    }

    unloadPlayer();
    const player = createAudioPlayer({ uri: value.uri });
    playerSubscriptionRef.current = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish || status.error) unloadPlayer();
    });
    playerRef.current = player;
    setPlaying(true);
    player.play();
  }

  function clearClip() {
    unloadPlayer();
    onChange(null);
  }

  useEffect(() => {
    return () => {
      clearTimers();
      if (recordingRef.current) {
        recorder.stop().catch(() => {});
      }
      unloadPlayer(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingMs = MAX_RECORDING_MS - elapsedMs;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Voice briefing</Text>
          <Text style={styles.hint}>Optional audio for the toy, max 60 seconds.</Text>
        </View>
        <Text style={[styles.countdown, recording && styles.countdownActive]}>
          {recording ? formatSeconds(remainingMs) : '60s'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={recording ? () => { void stopRecording(); } : () => { void startRecording(); }}
          disabled={disabled}
          style={[styles.primaryBtn, recording && styles.stopBtn, disabled && styles.disabledBtn]}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>{recording ? 'Stop' : value ? 'Re-record' : 'Record'}</Text>
        </TouchableOpacity>

        {value && !recording && (
          <>
            <TouchableOpacity onPress={() => { void playClip(); }} disabled={disabled} style={styles.secondaryBtn} activeOpacity={0.85}>
              <Text style={styles.secondaryText}>{playing ? 'Stop playback' : 'Play clip'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearClip} disabled={disabled} style={styles.secondaryBtn} activeOpacity={0.85}>
              <Text style={styles.secondaryText}>Clear</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {value && !recording && (
        <Text style={styles.savedText}>Saved clip · {formatSeconds(value.durationMs)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  hint: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, marginTop: 2 },
  countdown: { fontFamily: fontFamilies.dmSansBold, fontSize: 13, color: colors.muted },
  countdownActive: { color: colors.pink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: { backgroundColor: colors.ink, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 14 },
  stopBtn: { backgroundColor: colors.pink },
  disabledBtn: { opacity: 0.5 },
  primaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  secondaryBtn: { backgroundColor: colors.cream, borderRadius: 99, borderWidth: 1, borderColor: colors.line, paddingVertical: 9, paddingHorizontal: 14 },
  secondaryText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.ink },
  savedText: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted },
});
