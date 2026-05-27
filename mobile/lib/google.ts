import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { api } from './api';

WebBrowser.maybeCompleteAuthSession();

// Configure these in app.json `extra` or via env. See mobile/BUILD.md for the GCP steps.
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
  ((Constants.expoConfig?.extra as { googleClientIdWeb?: string } | undefined)?.googleClientIdWeb);
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
  ((Constants.expoConfig?.extra as { googleClientIdAndroid?: string } | undefined)?.googleClientIdAndroid);
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
  ((Constants.expoConfig?.extra as { googleClientIdIos?: string } | undefined)?.googleClientIdIos);

export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID);
}

export function useGoogleAuth() {
  return Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

export async function exchangeGoogleIdToken(idToken: string) {
  const { data } = await api.post('/auth/google', { idToken });
  return data as { token: string; user: { id: string; email: string; name: string; role: string; avatarUrl: string | null; timezone: string } };
}
