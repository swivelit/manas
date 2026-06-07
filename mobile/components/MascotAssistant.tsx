import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePathname } from 'expo-router';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Button } from './Button';
import { HeartMascot, HeartMascotShadow } from './HeartMascot';

type AssistantLanguageCode = 'en' | 'ta';

export type MascotBriefingOverride = {
  text: string;
  audioUrl?: string | null;
};

type MascotBriefingController = {
  briefingOverride: MascotBriefingOverride | null;
  setBriefingOverride: (override: MascotBriefingOverride) => void;
  clearBriefingOverride: () => void;
};

let mascotBriefingListener: ((override: MascotBriefingOverride | null) => void) | null = null;

export function setMascotBriefingOverride(override: MascotBriefingOverride) {
  mascotBriefingListener?.(override);
}

export function clearMascotBriefingOverride() {
  mascotBriefingListener?.(null);
}

export const MascotBriefingContext = React.createContext<MascotBriefingController>({
  briefingOverride: null,
  setBriefingOverride: setMascotBriefingOverride,
  clearBriefingOverride: clearMascotBriefingOverride,
});

type AssistantDictionary = {
  label: string;
  guideLabel: string;
  readAloudLabel: string;
  voiceOn: string;
  voiceOff: string;
  toggleVoiceLabel: string;
  gotIt: string;
  maybeLater: string;
  messages: Record<string, string>;
};

const assistantDictionaries: Record<AssistantLanguageCode, AssistantDictionary> = {
  en: {
    label: 'English',
    guideLabel: 'MANAS · GUIDE',
    readAloudLabel: 'Read aloud',
    voiceOn: 'Voice on',
    voiceOff: 'Voice off',
    toggleVoiceLabel: 'Toggle voice guidance',
    gotIt: '✿ Got it',
    maybeLater: 'Maybe later',
    messages: {
      '/': "Welcome! I'm Manas, your guide. Start with Emotional Healing, Coaching, or the Library, then I can point you to the next step.",
      '/onboarding': 'This is the welcome screen. Continue to sign in or create an account so your sessions, progress, and preferences can be saved.',
      '/(auth)': 'Use this auth screen to sign in with an email code.',
      '/(auth)/login': 'Sign in here. Enter your email to request an OTP, then verify the code to continue.',
      '/(auth)/register': 'Create your MANAS account here. Add your name and email, verify the OTP, then continue to the home tabs.',
      '/(tabs)': 'This is Home. Review your mood prompt, choose Emotional Healing or Coaching, book a free demo, or open your upcoming session.',
      '/(tabs)/topics': 'These are Emotional Healing topics. Search a feeling, open a topic, then choose a coach and booking time.',
      '/topics/emotional-healing-list': 'These are the Emotional Healing topics. Pick the topic that fits what you want to work through, then choose a coach.',
      '/coaching': 'This is Coaching. Pick a growth topic, review the detail page, then book a demo with an available coach.',
      '/topics': 'This topic page explains the focus area. Use the heart to save it, review coach options, or book a free demo.',
      '/booking': 'This booking page shows coach availability in your timezone. Select a date, time slot, and video, audio, or chat session before confirming.',
      '/(tabs)/videos': 'The Library has free and premium videos. Public videos open without signing in; bookmarks and progress are saved after you sign in.',
      '/video': 'This video page lets you watch, resume progress, bookmark, and like after signing in. Premium access is managed by an admin.',
      '/(tabs)/sessions': 'Your sessions live here. Review upcoming or past bookings, then join confirmed video and audio sessions inside the join window.',
      '/session': 'This session detail shows the coach, topic, time, and session type. Chat sessions open an in-app message thread here.',
      '/(tabs)/profile': "This is Profile. Review your saved journey, session history, and account actions.",
      '/mood': "This mood page records how you're feeling today. Pick the closest option and add a note if it helps.",
    },
  },
  ta: {
    label: 'தமிழ்',
    guideLabel: 'MANAS · வழிகாட்டி',
    readAloudLabel: 'ஒலியாக வாசிக்க',
    voiceOn: 'குரல் இயக்கம்',
    voiceOff: 'குரல் நிறுத்தம்',
    toggleVoiceLabel: 'குரல் வழிகாட்டலை மாற்று',
    gotIt: '✿ புரிந்தது',
    maybeLater: 'பிறகு பார்க்கலாம்',
    messages: {
      '/': 'வரவேற்கிறோம்! நான் Manas, உங்கள் வழிகாட்டி. Emotional Healing, Coaching அல்லது Library-யில் தொடங்குங்கள்; அடுத்த படியை நான் காட்டுவேன்.',
      '/onboarding': 'இது வரவேற்பு திரை. உங்கள் sessions, progress, preferences சேமிக்க sign in செய்யவும் அல்லது account உருவாக்கவும்.',
      '/(auth)': 'இந்த auth திரையில் email code மூலம் sign in செய்யலாம்.',
      '/(auth)/login': 'இங்கே sign in செய்யுங்கள். Email உள்ளிட்டு OTP கேட்டு, code verify செய்து தொடருங்கள்.',
      '/(auth)/register': 'இங்கே உங்கள் MANAS account உருவாக்குங்கள். பெயர், email சேர்த்து, OTP verify செய்து home tabs-க்கு செல்லுங்கள்.',
      '/(tabs)': 'இது Home. Mood prompt பார்க்கவும், Emotional Healing அல்லது Coaching தேர்வு செய்யவும், free demo book செய்யவும், அல்லது upcoming session திறக்கவும்.',
      '/(tabs)/topics': 'இவை Emotional Healing topics. ஒரு feeling தேடி, topic திறந்து, coach மற்றும் booking time தேர்வு செய்யுங்கள்.',
      '/topics/emotional-healing-list': 'இவை Emotional Healing topics. உங்களுக்கு பொருந்தும் topic-ஐ தேர்வு செய்து, பிறகு coach தேர்வு செய்யுங்கள்.',
      '/coaching': 'இது Coaching. Growth topic தேர்வு செய்து, detail page பார்த்து, available coach உடன் demo book செய்யுங்கள்.',
      '/topics': 'இந்த topic page focus area-வை விளக்குகிறது. Save செய்ய heart பயன்படுத்தவும், coach options பார்க்கவும், அல்லது demo book செய்யவும்.',
      '/booking': 'இந்த booking page உங்கள் timezone-ல் coach availability காட்டுகிறது. Confirm செய்வதற்கு முன் date, time slot, video, audio அல்லது chat session தேர்வு செய்யுங்கள்.',
      '/(tabs)/videos': 'Library-யில் free மற்றும் premium videos உள்ளன. Public videos sign in இல்லாமலே திறக்கும்; bookmarks மற்றும் progress sign in பிறகு save ஆகும்.',
      '/video': 'இந்த video page-ல் sign in பிறகு watch, resume progress, bookmark மற்றும் like செய்யலாம். Premium access admin மூலம் நிர்வகிக்கப்படுகிறது.',
      '/(tabs)/sessions': 'உங்கள் sessions இங்கே இருக்கும். Upcoming அல்லது past bookings பாருங்கள்; confirmed video மற்றும் audio sessions-ஐ join window-ல் join செய்யுங்கள்.',
      '/session': 'இந்த session detail coach, topic, time மற்றும் session type காட்டுகிறது. Chat sessions இங்கே in-app message thread திறக்கும்.',
      '/(tabs)/profile': 'இது Profile. உங்கள் saved journey, session history மற்றும் account actions பார்க்கலாம்.',
      '/mood': 'இந்த mood page இன்று நீங்கள் எப்படி உணர்கிறீர்கள் என்பதை பதிவு செய்கிறது. அருகிலான option தேர்வு செய்து, உதவினால் note சேர்க்கவும்.',
    },
  },
};

const VOICE_PREF_KEY = 'manas_voice_enabled';
const LANGUAGE_PREF_KEY = 'manas_assistant_language';
const DEFAULT_LANGUAGE: AssistantLanguageCode = 'en';
const ASSISTANT_LANGUAGES: AssistantLanguageCode[] = ['en', 'ta'];
const MASCOT_SIZE = 64;
const SHADOW_HEIGHT = Math.round(MASCOT_SIZE * 0.22);
const EDGE_PADDING = 12;
const DEFAULT_RIGHT = 18;
const TAB_BAR_CLEARANCE = 90;
const MIN_TOP_CLEARANCE = 8;
const BLINK_MIN_DELAY_MS = 2500;
const BLINK_MAX_DELAY_MS = 6000;
const BLINK_DURATION_MS = 120;
const DOUBLE_BLINK_PAUSE_MS = 110;
const DOUBLE_BLINK_CHANCE = 0.2;

function isAssistantLanguageCode(value: string | null): value is AssistantLanguageCode {
  return value === 'en' || value === 'ta';
}

function getContextMessage(path: string, languageCode: AssistantLanguageCode): string {
  const contextMessages = assistantDictionaries[languageCode].messages;
  if (contextMessages[path]) return contextMessages[path];

  const prefix = Object.keys(contextMessages)
    .filter(key => key !== '/' && path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return prefix ? contextMessages[prefix] : contextMessages['/'];
}

function clampValue(value: number, min: number, max: number) {
  if (max <= min) return min;
  return Math.min(Math.max(value, min), max);
}

export function MascotTapSurface({ children }: { children: React.ReactNode }) {
  const [briefingOverride, setBriefingOverrideState] = useState<MascotBriefingOverride | null>(null);
  const controller = useMemo<MascotBriefingController>(() => ({
    briefingOverride,
    setBriefingOverride: setBriefingOverrideState,
    clearBriefingOverride: () => setBriefingOverrideState(null),
  }), [briefingOverride]);

  useEffect(() => {
    mascotBriefingListener = setBriefingOverrideState;
    return () => {
      mascotBriefingListener = null;
    };
  }, []);

  return (
    <MascotBriefingContext.Provider value={controller}>
      <View collapsable={false} style={styles.tapSurface}>
        {children}
      </View>
    </MascotBriefingContext.Provider>
  );
}

export function MascotAssistant() {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [languageCode, setLanguageCode] = useState<AssistantLanguageCode>(DEFAULT_LANGUAGE);
  const [speaking, setSpeaking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const { briefingOverride } = useContext(MascotBriefingContext);
  const pathname = usePathname();
  const copy = assistantDictionaries[languageCode];
  const message = briefingOverride?.text || getContextMessage(pathname, languageCode);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const placedInitialPosition = useRef(false);
  const blinkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPlayerSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const bobProgress = useSharedValue(0);
  const breathProgress = useSharedValue(0);
  const walkProgress = useSharedValue(0);
  const walkIntensity = useSharedValue(0);
  const facingSign = useSharedValue(1);

  useEffect(() => {
    SecureStore.getItemAsync(VOICE_PREF_KEY).then(v => setVoiceEnabled(v === '1'));
    SecureStore.getItemAsync(LANGUAGE_PREF_KEY).then(v => {
      if (isAssistantLanguageCode(v)) setLanguageCode(v);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReducedMotion(enabled);
    }).catch(() => {});

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      setReducedMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const minX = EDGE_PADDING;
    const maxX = width - MASCOT_SIZE - EDGE_PADDING;
    const minY = insets.top + MIN_TOP_CLEARANCE;
    const maxY = height - MASCOT_SIZE - SHADOW_HEIGHT - insets.bottom - TAB_BAR_CLEARANCE;

    if (!placedInitialPosition.current) {
      translateX.value = clampValue(width - MASCOT_SIZE - DEFAULT_RIGHT, minX, maxX);
      translateY.value = clampValue(maxY, minY, maxY);
      placedInitialPosition.current = true;
      return;
    }

    translateX.value = clampValue(translateX.value, minX, maxX);
    translateY.value = clampValue(translateY.value, minY, maxY);
  }, [height, insets.bottom, insets.top, translateX, translateY, width]);

  useEffect(() => {
    cancelAnimation(bobProgress);
    cancelAnimation(breathProgress);

    if (reducedMotion) {
      bobProgress.value = 0;
      breathProgress.value = 0;
      return undefined;
    }

    bobProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      false
    );

    breathProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(bobProgress);
      cancelAnimation(breathProgress);
    };
  }, [bobProgress, breathProgress, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(walkProgress);
      walkProgress.value = 0;
      cancelAnimation(walkIntensity);
      walkIntensity.value = 0;
    }
  }, [reducedMotion, walkIntensity, walkProgress]);

  useEffect(() => {
    function clearBlinkTimers() {
      blinkTimers.current.forEach(timer => clearTimeout(timer));
      blinkTimers.current = [];
    }

    clearBlinkTimers();
    setEyesClosed(false);

    if (reducedMotion) {
      return clearBlinkTimers;
    }

    let cancelled = false;

    const scheduleTimer = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        blinkTimers.current = blinkTimers.current.filter(activeTimer => activeTimer !== timer);
        callback();
      }, delay);
      blinkTimers.current.push(timer);
    };

    const randomDelay = () => BLINK_MIN_DELAY_MS + Math.random() * (BLINK_MAX_DELAY_MS - BLINK_MIN_DELAY_MS);

    const scheduleNextBlink = () => {
      scheduleTimer(() => {
        if (cancelled) return;
        setEyesClosed(true);
        const shouldDoubleBlink = Math.random() < DOUBLE_BLINK_CHANCE;

        scheduleTimer(() => {
          if (cancelled) return;
          setEyesClosed(false);

          if (!shouldDoubleBlink) {
            scheduleNextBlink();
            return;
          }

          scheduleTimer(() => {
            if (cancelled) return;
            setEyesClosed(true);

            scheduleTimer(() => {
              if (cancelled) return;
              setEyesClosed(false);
              scheduleNextBlink();
            }, BLINK_DURATION_MS);
          }, DOUBLE_BLINK_PAUSE_MS);
        }, BLINK_DURATION_MS);
      }, randomDelay());
    };

    scheduleNextBlink();

    return () => {
      cancelled = true;
      clearBlinkTimers();
    };
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {});
      stopAudioPlayback();
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(bobProgress);
      cancelAnimation(breathProgress);
      cancelAnimation(walkProgress);
      cancelAnimation(walkIntensity);
      cancelAnimation(facingSign);
    };
  }, [bobProgress, breathProgress, facingSign, translateX, translateY, walkIntensity, walkProgress]);

  useEffect(() => {
    if (open && voiceEnabled) {
      void handleSpeak();
    }
    return () => {
      Speech.stop().catch(() => {});
      stopAudioPlayback();
      setSpeaking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const positionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const characterStyle = useAnimatedStyle(() => {
    const walkDamping = 1 - walkIntensity.value * 0.72;
    const floatingY = bobProgress.value * -6 * walkDamping;
    const breathScale = 1 + breathProgress.value * 0.025;
    const step = walkProgress.value;

    return {
      transform: [
        { translateY: floatingY },
        { scaleX: facingSign.value * breathScale * (1 + step * 0.045) },
        { scaleY: breathScale * (1 - step * 0.04) },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const lift = bobProgress.value;
    const step = walkProgress.value;

    return {
      opacity: 1 - lift * 0.18,
      transform: [
        { scaleX: 1 - lift * 0.16 + step * 0.04 },
        { scaleY: 1 + lift * 0.06 },
      ],
    };
  });

  function stopAudioPlayback() {
    audioPlayerSubscriptionRef.current?.remove();
    audioPlayerSubscriptionRef.current = null;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.remove();
      audioPlayerRef.current = null;
    }
  }

  async function handleSpeak() {
    if (speaking) {
      await Speech.stop();
      stopAudioPlayback();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    if (briefingOverride?.audioUrl) {
      try {
        await Speech.stop();
        stopAudioPlayback();
        const player = createAudioPlayer({ uri: briefingOverride.audioUrl });
        audioPlayerSubscriptionRef.current = player.addListener('playbackStatusUpdate', status => {
          if (status.didJustFinish || status.error) {
            stopAudioPlayback();
            setSpeaking(false);
          }
        });
        audioPlayerRef.current = player;
        player.play();
      } catch {
        setSpeaking(false);
      }
      return;
    }

    Speech.speak(message, {
      language: languageCode,
      rate: 0.95,
      pitch: 1.05,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function toggleVoicePref() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    await SecureStore.setItemAsync(VOICE_PREF_KEY, next ? '1' : '0');
    if (!next) {
      await Speech.stop();
      stopAudioPlayback();
      setSpeaking(false);
    }
  }

  async function selectLanguage(nextLanguageCode: AssistantLanguageCode) {
    setLanguageCode(nextLanguageCode);
    await SecureStore.setItemAsync(LANGUAGE_PREF_KEY, nextLanguageCode);
    if (speaking) {
      await Speech.stop();
      stopAudioPlayback();
      setSpeaking(false);
    }
  }

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.floatingWrap,
          { width: MASCOT_SIZE, height: MASCOT_SIZE + SHADOW_HEIGHT },
          positionStyle,
        ]}
      >
        <Animated.View pointerEvents="none" style={[styles.shadowSlot, shadowStyle]}>
          <HeartMascotShadow size={MASCOT_SIZE} />
        </Animated.View>
        <Animated.View pointerEvents="box-none" style={[styles.characterSlot, characterStyle]}>
          <TouchableOpacity
            onPress={() => setOpen(true)}
            activeOpacity={0.85}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Open MANAS guide"
          >
            <HeartMascot size={MASCOT_SIZE} eyesClosed={eyesClosed} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.overlay} onPress={e => e.stopPropagation()}>
            <View style={styles.avatarShell}>
              <HeartMascot size={54} eyesClosed={eyesClosed} />
            </View>
            <View style={styles.bubble}>
              <View style={styles.titleRow}>
                <Text style={styles.guideLabel}>{copy.guideLabel}</Text>
                <TouchableOpacity onPress={handleSpeak} hitSlop={8} style={styles.speakerBtn} accessibilityLabel={copy.readAloudLabel}>
                  <Text style={[styles.speakerGlyph, speaking && styles.speakerGlyphActive]}>
                    {speaking ? '⏹' : '♪'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleVoicePref} hitSlop={8} style={styles.voiceToggle} accessibilityLabel={copy.toggleVoiceLabel}>
                  <Text style={[styles.voiceToggleText, voiceEnabled && styles.voiceToggleActive]}>
                    {voiceEnabled ? copy.voiceOn : copy.voiceOff}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.languageRow}>
                {ASSISTANT_LANGUAGES.map(code => {
                  const active = languageCode === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => { void selectLanguage(code); }}
                      style={[styles.languageChip, active && styles.languageChipActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>
                        {assistantDictionaries[code].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                <Button label={copy.gotIt} variant="pill-dark" onPress={() => setOpen(false)} />
                <Button label={copy.maybeLater} variant="pill-light" onPress={() => setOpen(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tapSurface: {
    flex: 1,
  },
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    elevation: 30,
  },
  floatingWrap: {
    position: 'absolute',
    zIndex: 2,
    elevation: 12,
  },
  shadowSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  characterSlot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  fab: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', padding: 18 },
  overlay: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  avatarShell: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideLabel: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink, letterSpacing: 1.5, flex: 1 },
  speakerBtn: { padding: 2 },
  speakerGlyph: { fontFamily: fontFamilies.dmSansBold, fontSize: 13, color: colors.muted },
  speakerGlyphActive: { color: colors.pink },
  voiceToggle: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.creamDeep },
  voiceToggleText: { fontFamily: fontFamilies.dmSans, fontSize: 8, color: colors.muted, letterSpacing: 0.5 },
  voiceToggleActive: { color: colors.ink, fontFamily: fontFamilies.dmSansMedium },
  languageRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  languageChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.creamDeep, borderWidth: 1, borderColor: colors.line },
  languageChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  languageChipText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 9, color: colors.inkSoft },
  languageChipTextActive: { color: colors.cream },
  message: { fontFamily: fontFamilies.fraunces, fontSize: 12, color: colors.ink, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
