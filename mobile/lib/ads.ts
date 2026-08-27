import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const PRODUCTION_BANNER_AD_UNIT_ID = 'ca-app-pub-9649241407302744/9035398208';

export function getAndroidBannerAdUnitId(): string | null {
  if (Platform.OS !== 'android') return null;
  return __DEV__ ? TestIds.ADAPTIVE_BANNER : PRODUCTION_BANNER_AD_UNIT_ID;
}
