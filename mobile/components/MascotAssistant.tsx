import React, { useEffect, useRef, useState } from 'react';
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

type AssistantLanguageCode = 'en' | 'hi';

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
  hi: {
    label: 'हिन्दी',
    guideLabel: 'MANAS · मार्गदर्शक',
    readAloudLabel: 'आवाज़ में पढ़ें',
    voiceOn: 'आवाज़ चालू',
    voiceOff: 'आवाज़ बंद',
    toggleVoiceLabel: 'आवाज़ मार्गदर्शन बदलें',
    gotIt: '✿ समझ गया',
    maybeLater: 'बाद में',
    messages: {
      '/': 'नमस्ते! मैं Manas हूं, आपका मार्गदर्शक. Emotional Healing, Coaching, या Library से शुरू करें, फिर मैं अगला कदम बताऊंगा.',
      '/onboarding': 'यह स्वागत स्क्रीन है. साइन इन करें या खाता बनाएं ताकि आपके सत्र, प्रगति और पसंद सेव हो सकें.',
      '/(auth)': 'इस स्क्रीन पर ईमेल कोड से साइन इन करें.',
      '/(auth)/login': 'यहां साइन इन करें. अपना ईमेल डालकर OTP मांगें, फिर कोड सत्यापित करके आगे बढ़ें.',
      '/(auth)/register': 'यहां अपना MANAS खाता बनाएं. नाम और ईमेल जोड़ें, OTP सत्यापित करें, फिर होम टैब पर जाएं.',
      '/(tabs)': 'यह Home है. अपना mood prompt देखें, Emotional Healing या Coaching चुनें, demo book करें, या आने वाला session खोलें.',
      '/(tabs)/topics': 'ये Emotional Healing topics हैं. कोई feeling खोजें, topic खोलें, फिर coach और booking time चुनें.',
      '/topics/emotional-healing-list': 'ये Emotional Healing topics हैं. जो विषय आपकी जरूरत से मेल खाता है उसे चुनें, फिर coach चुनें.',
      '/coaching': 'यह Coaching है. Growth topic चुनें, detail page देखें, फिर available coach के साथ demo book करें.',
      '/topics': 'यह topic page focus area समझाता है. Save करने के लिए heart इस्तेमाल करें, coach options देखें, या demo book करें.',
      '/booking': 'यह booking page आपके timezone में coach availability दिखाता है. Confirm करने से पहले date, time slot, और video, audio, या chat session चुनें.',
      '/(tabs)/videos': 'Library में free और premium videos हैं. Public videos बिना sign in खुलते हैं; bookmarks और progress sign in के बाद save होते हैं.',
      '/video': 'इस video page पर आप sign in के बाद watch, resume progress, bookmark, और like कर सकते हैं. Premium access admin संभालता है.',
      '/(tabs)/sessions': 'आपके sessions यहां हैं. Upcoming या past bookings देखें, फिर confirmed video और audio sessions join window में join करें.',
      '/session': 'यह session detail coach, topic, time, और session type दिखाता है. Chat sessions यहां in-app message thread खोलते हैं.',
      '/(tabs)/profile': 'यह Profile है. अपनी saved journey, session history, और account actions देखें.',
      '/mood': 'यह mood page आज आपकी feeling record करता है. सबसे करीबी option चुनें और जरूरत हो तो note जोड़ें.',
    },
  },
};

const VOICE_PREF_KEY = 'manas_voice_enabled';
const LANGUAGE_PREF_KEY = 'manas_assistant_language';
const DEFAULT_LANGUAGE: AssistantLanguageCode = 'en';
const ASSISTANT_LANGUAGES: AssistantLanguageCode[] = ['en', 'hi'];
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
  return value === 'en' || value === 'hi';
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
  return (
    <View collapsable={false} style={styles.tapSurface}>
      {children}
    </View>
  );
}

export function MascotAssistant() {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [languageCode, setLanguageCode] = useState<AssistantLanguageCode>(DEFAULT_LANGUAGE);
  const [speaking, setSpeaking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const pathname = usePathname();
  const copy = assistantDictionaries[languageCode];
  const message = getContextMessage(pathname, languageCode);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const placedInitialPosition = useRef(false);
  const blinkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  async function handleSpeak() {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
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
      setSpeaking(false);
    }
  }

  async function selectLanguage(nextLanguageCode: AssistantLanguageCode) {
    setLanguageCode(nextLanguageCode);
    await SecureStore.setItemAsync(LANGUAGE_PREF_KEY, nextLanguageCode);
    if (speaking) {
      await Speech.stop();
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
