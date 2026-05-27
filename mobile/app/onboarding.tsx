import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Button } from '../components/Button';

export default function Onboarding() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mascotSpot}>
        {/* Blur orbs */}
        <View style={[styles.orb, styles.orbBlue]} />
        <View style={[styles.orb, styles.orbPink]} />
        <Image source={require('../assets/mascot.jpg')} style={styles.mascotImg} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.heading}>
          Meet your{' '}
          <Text style={styles.headingItalic}>gentle</Text>
          {'\n'}companion.
        </Text>
        <Text style={styles.sub}>
          Manas walks beside you through{'\n'}emotional healing and growth.
        </Text>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <View style={styles.btnRow}>
        <Button label="Sign in" variant="ghost" onPress={() => router.push('/(auth)/login')} />
        <Button label="Begin →" variant="primary" onPress={() => router.push('/(auth)/register')} />
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
  skip: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, letterSpacing: 0.5 },
  mascotSpot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.35 },
  orbBlue: { width: 160, height: 160, backgroundColor: colors.blue, left: 30, top: 40 },
  orbPink: { width: 170, height: 170, backgroundColor: colors.pink, right: 20, top: 60 },
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
  textBlock: { paddingHorizontal: 30, alignItems: 'center', width: '100%' },
  heading: { fontFamily: fontFamilies.fraunces, fontSize: 30, color: colors.ink, textAlign: 'center', letterSpacing: -0.5, lineHeight: 33 },
  headingItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, marginTop: 10, lineHeight: 18, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 18 },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: '#D8D2C3' },
  dotActive: { width: 22, borderRadius: 3, backgroundColor: colors.ink },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 18, width: '100%' },
});
