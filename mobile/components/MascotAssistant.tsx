import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

const contextMessages: Record<string, string> = {
  '/': "Welcome! I'm Manas, your guide. Start with Emotional Healing, Coaching, or the Library, then I can point you to the next step.",
  '/onboarding': 'This is the welcome screen. Continue to sign in or create an account so your sessions, progress, and preferences can be saved.',
  '/(auth)': 'Use this auth screen to sign in with email, Google, or mobile OTP where available. If a provider is not configured yet, use email OTP for testing.',
  '/(auth)/login': 'Sign in here. Enter your email to request an OTP, or use Google when production credentials are configured.',
  '/(auth)/register': 'Create your MANAS account here. Add your name and email, verify the OTP, then continue to the home tabs.',
  '/(auth)/phone': 'Use mobile OTP here. Enter your phone number, request the code, then verify it to continue.',
  '/(tabs)': 'This is Home. Review your mood prompt, choose Emotional Healing or Coaching, book a free demo, or open your upcoming session.',
  '/(tabs)/topics': 'These are Emotional Healing topics. Search a feeling, open a topic, then choose a coach and booking time.',
  '/topics/emotional-healing-list': 'These are the Emotional Healing topics. Pick the topic that fits what you want to work through, then choose a coach.',
  '/coaching': 'This is Coaching. Pick a growth topic, review the detail page, then book a demo with an available coach.',
  '/topics': 'This topic page explains the focus area. Use the heart to save it, review coach options, or book a free demo.',
  '/booking': 'This booking page shows coach availability in your timezone. Select a date, time slot, and video, audio, or chat session before confirming.',
  '/(tabs)/videos': 'The Library has free and premium videos. Public videos open without signing in; bookmarks and progress are saved after you sign in.',
  '/video': 'This video page lets you watch, resume progress, and bookmark after signing in. Premium videos show a safe upgrade prompt.',
  '/(tabs)/sessions': 'Your sessions live here. Review upcoming or past bookings, then join confirmed sessions inside the join window.',
  '/session': 'This session detail shows the coach, topic, time, session type, and meeting link when it is ready.',
  '/(tabs)/profile': "This is Profile. Review your saved journey, session history, and account actions.",
  '/mood': "This mood page records how you're feeling today. Pick the closest option and add a note if it helps.",
};

const VOICE_PREF_KEY = 'manas_voice_enabled';
const MASCOT_SIZE = 82;
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

type MascotTapHandler = ((absoluteX: number, absoluteY: number) => void) | null;

let mascotTapHandler: MascotTapHandler = null;

function getContextMessage(path: string): string {
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

function emitMascotTap(absoluteX: number, absoluteY: number) {
  mascotTapHandler?.(absoluteX, absoluteY);
}

export function MascotTapSurface({ children }: { children: React.ReactNode }) {
  const tapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDistance(24)
      .runOnJS(true)
      .cancelsTouchesInView(false)
      .onEnd((event, success) => {
        if (success) {
          emitMascotTap(event.absoluteX, event.absoluteY);
        }
      });
  }, []);

  return (
    <GestureDetector gesture={tapGesture}>
      <View collapsable={false} style={styles.tapSurface}>
        {children}
      </View>
    </GestureDetector>
  );
}

export function MascotAssistant() {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const pathname = usePathname();
  const message = getContextMessage(pathname);
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

  const moveToTap = useCallback((absoluteX: number, absoluteY: number) => {
    const minX = EDGE_PADDING;
    const maxX = width - MASCOT_SIZE - EDGE_PADDING;
    const minY = insets.top + MIN_TOP_CLEARANCE;
    const maxY = height - MASCOT_SIZE - SHADOW_HEIGHT - insets.bottom - TAB_BAR_CLEARANCE;
    const startX = translateX.value;
    const startY = translateY.value;
    const nextX = clampValue(absoluteX - MASCOT_SIZE / 2, minX, maxX);
    const nextY = clampValue(absoluteY - MASCOT_SIZE / 2, minY, maxY);
    const distance = Math.hypot(nextX - startX, nextY - startY);

    const shouldFlip = Math.abs(nextX - startX) > 2;
    const nextFacingSign = nextX < startX ? -1 : 1;

    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(walkProgress);
    cancelAnimation(walkIntensity);

    if (shouldFlip) {
      cancelAnimation(facingSign);
      if (reducedMotion) {
        facingSign.value = nextFacingSign;
      } else {
        facingSign.value = withTiming(nextFacingSign, {
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        });
      }
    }

    if (reducedMotion || distance < 3) {
      translateX.value = nextX;
      translateY.value = nextY;
      walkProgress.value = 0;
      walkIntensity.value = 0;
      return;
    }

    const duration = clampValue(distance * 2.4, 360, 1200);
    const travelConfig = {
      duration,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    };

    walkProgress.value = 0;
    walkIntensity.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
    walkProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      false
    );

    translateX.value = withTiming(nextX, travelConfig);
    translateY.value = withTiming(nextY, travelConfig, finished => {
      if (finished) {
        walkProgress.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.quad),
          reduceMotion: ReduceMotion.System,
        });
        walkIntensity.value = withTiming(0, {
          duration: 260,
          easing: Easing.out(Easing.quad),
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  }, [facingSign, height, insets.bottom, insets.top, reducedMotion, translateX, translateY, walkIntensity, walkProgress, width]);

  useEffect(() => {
    const handler = (absoluteX: number, absoluteY: number) => {
      if (!open) {
        moveToTap(absoluteX, absoluteY);
      }
    };

    mascotTapHandler = handler;
    return () => {
      if (mascotTapHandler === handler) {
        mascotTapHandler = null;
      }
    };
  }, [moveToTap, open]);

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
                <Text style={styles.guideLabel}>MANAS · GUIDE</Text>
                <TouchableOpacity onPress={handleSpeak} hitSlop={8} style={styles.speakerBtn} accessibilityLabel="Read aloud">
                  <Text style={[styles.speakerGlyph, speaking && styles.speakerGlyphActive]}>
                    {speaking ? '⏹' : '♪'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleVoicePref} hitSlop={8} style={styles.voiceToggle} accessibilityLabel="Toggle voice guidance">
                  <Text style={[styles.voiceToggleText, voiceEnabled && styles.voiceToggleActive]}>
                    Voice {voiceEnabled ? 'on' : 'off'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                <Button label="✿ Got it" variant="pill-dark" onPress={() => setOpen(false)} />
                <Button label="Maybe later" variant="pill-light" onPress={() => setOpen(false)} />
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
  message: { fontFamily: fontFamilies.fraunces, fontSize: 12, color: colors.ink, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
