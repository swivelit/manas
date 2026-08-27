import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAndroidBannerAdUnitId } from '../lib/ads';
import { useAdsConsent } from '../lib/adsConsent';
import { colors } from '../theme/colors';

type AdsModule = typeof import('react-native-google-mobile-ads');

function getAdsModule(): AdsModule {
  return require('react-native-google-mobile-ads') as AdsModule;
}

export function GlobalBannerAd() {
  const insets = useSafeAreaInsets();
  const { canRequestAds, adsInitialized } = useAdsConsent();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (Platform.OS !== 'android' || !canRequestAds || !adsInitialized) return null;

  const unitId = getAndroidBannerAdUnitId();
  if (!unitId) return null;

  const ads = getAdsModule();
  const banner = React.createElement(ads.BannerAd, {
    unitId,
    size: ads.BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER,
    // Do not send MANAS wellness, account, route, or other user data to AdMob.
    onAdFailedToLoad: (error: Error) => {
      if (__DEV__) console.warn('[admob] banner failed to load:', error.message);
    },
  });

  return (
    <View
      pointerEvents={keyboardVisible ? 'none' : 'auto'}
      accessibilityElementsHidden={keyboardVisible}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
        keyboardVisible && styles.keyboardHidden,
      ]}
    >
      {banner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  keyboardHidden: {
    borderTopWidth: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    paddingBottom: 0,
    paddingTop: 0,
  },
});
