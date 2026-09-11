import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Button } from '../components/Button';

export default function Onboarding() {
  const slides = [
    {
      heading: (
        <>
          Meet your{' '}
          <Text style={styles.headingItalic}>gentle</Text>
          {'\n'}companion.
        </>
      ),
      sub: 'Manas walks beside you through\nemotional healing and growth.',
    },
    {
      heading: (
        <>
          A space to{' '}
          <Text style={styles.headingItalic}>heal.</Text>
          {'\n'}A space to grow.
        </>
      ),
      sub: 'Explore guided support for your emotional\nwell-being and personal growth.',
    },
    {
      heading: (
        <>
          Take your next{' '}
          <Text style={styles.headingItalic}>step.</Text>
        </>
      ),
      sub: 'Discover helpful guidance, sessions and\nresources designed around you.',
    },
  ];

  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);

    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {slides.map((slide, index) => (
          <View key={index} style={[styles.slide, { width }]}>
            <View style={styles.mascotSpot}>
              <View style={[styles.orb, styles.orbBlue]} />
              <View style={[styles.orb, styles.orbPink]} />
              <Image
                source={require('../assets/mascot.jpg')}
                style={styles.mascotImg}
              />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.heading}>{slide.heading}</Text>

              <Text style={styles.sub}>{slide.sub}</Text>

              <View style={styles.dots}>
                {slides.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      dotIndex === activeIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.btnRow}>
        <Button
          label="Sign in"
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
        />
        <Button
          label="Begin →"
          variant="primary"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  topBar: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  skip: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  carousel: {
    flex: 1,
    width: '100%',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotSpot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  orbBlue: {
    width: 160,
    height: 160,
    backgroundColor: colors.blue,
    left: 30,
    top: 40,
  },
  orbPink: {
    width: 170,
    height: 170,
    backgroundColor: colors.pink,
    right: 20,
    top: 60,
  },
  mascotImg: {
    width: 200,
    height: 200,
    borderRadius: 100,
    position: 'relative',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
  } as any,
  textBlock: {
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontFamily: fontFamilies.fraunces,
    fontSize: 30,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  headingItalic: {
    fontFamily: fontFamilies.frauncesItalic,
    color: colors.pink,
  },
  sub: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 12,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 18,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#D8D2C3',
  },
  dotActive: {
    width: 22,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 18,
    width: '100%',
  },
});