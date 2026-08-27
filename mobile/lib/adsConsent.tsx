import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { AdsConsentInfo } from 'react-native-google-mobile-ads';

type AdsModule = typeof import('react-native-google-mobile-ads');

export type AdsConsentContextValue = {
  consentLoading: boolean;
  canRequestAds: boolean;
  adsInitialized: boolean;
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
};

const AdsConsentContext = createContext<AdsConsentContextValue | null>(null);

// This process-level promise prevents duplicate native initialization when
// React remounts the provider during development or navigation setup.
let mobileAdsInitialization: Promise<void> | null = null;

function getAdsModule(): AdsModule {
  return require('react-native-google-mobile-ads') as AdsModule;
}

function initializeMobileAdsOnce(): Promise<void> {
  if (mobileAdsInitialization) return mobileAdsInitialization;

  mobileAdsInitialization = (async () => {
    const ads = getAdsModule();
    const requestConfiguration: Parameters<ReturnType<AdsModule['default']>['setRequestConfiguration']>[0] = {
      maxAdContentRating: ads.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    };

    if (__DEV__) {
      requestConfiguration.testDeviceIdentifiers = ['EMULATOR'];
    }

    await ads.default().setRequestConfiguration(requestConfiguration);
    await ads.default().initialize();
  })();

  return mobileAdsInitialization;
}

export function AdsConsentProvider({ children }: { children: React.ReactNode }) {
  const [consentLoading, setConsentLoading] = useState(Platform.OS === 'android');
  const [consentInfo, setConsentInfo] = useState<AdsConsentInfo | null>(null);
  const [adsInitialized, setAdsInitialized] = useState(false);

  const initializeIfPermitted = useCallback(async (info: AdsConsentInfo) => {
    if (!info.canRequestAds) return;

    try {
      await initializeMobileAdsOnce();
      setAdsInitialized(true);
    } catch (error) {
      if (__DEV__) console.warn('[admob] SDK initialization failed:', error);
    }
  }, []);

  const refreshConsentInfo = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    setConsentLoading(true);
    try {
      const updatedInfo = await getAdsModule().AdsConsent.requestInfoUpdate();
      setConsentInfo(updatedInfo);

      const formInfo = await getAdsModule().AdsConsent.loadAndShowConsentFormIfRequired();
      setConsentInfo(formInfo);
      await initializeIfPermitted(formInfo);
    } catch (error) {
      if (__DEV__) console.warn('[admob] consent gathering failed:', error);

      // UMP keeps its prior status. Only its explicit canRequestAds value may
      // allow initialization after a failed refresh; no separate status is stored.
      try {
        const previousInfo = await getAdsModule().AdsConsent.getConsentInfo();
        setConsentInfo(previousInfo);
        await initializeIfPermitted(previousInfo);
      } catch (fallbackError) {
        if (__DEV__) console.warn('[admob] stored consent status unavailable:', fallbackError);
      }
    } finally {
      setConsentLoading(false);
    }
  }, [initializeIfPermitted]);

  useEffect(() => {
    void refreshConsentInfo();
  }, [refreshConsentInfo]);

  const openPrivacyOptions = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    const result = await getAdsModule().AdsConsent.showPrivacyOptionsForm();
    setConsentInfo(result);

    // Refresh from UMP after the form closes so Profile reflects the current requirement.
    const refreshedInfo = await getAdsModule().AdsConsent.getConsentInfo();
    setConsentInfo(refreshedInfo);
    await initializeIfPermitted(refreshedInfo);
  }, [initializeIfPermitted]);

  const value = useMemo<AdsConsentContextValue>(() => ({
    consentLoading,
    canRequestAds: consentInfo?.canRequestAds === true,
    adsInitialized,
    privacyOptionsRequired: consentInfo?.privacyOptionsRequirementStatus === 'REQUIRED',
    openPrivacyOptions,
  }), [adsInitialized, consentInfo, consentLoading, openPrivacyOptions]);

  return <AdsConsentContext.Provider value={value}>{children}</AdsConsentContext.Provider>;
}

export function useAdsConsent(): AdsConsentContextValue {
  const value = useContext(AdsConsentContext);
  if (!value) throw new Error('useAdsConsent must be used inside AdsConsentProvider');
  return value;
}
