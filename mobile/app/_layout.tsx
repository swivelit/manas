import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppFonts } from '../theme/fonts';
import { useAuthStore } from '../lib/auth';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const loadAuth = useAuthStore(s => s.loadAuth);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (fontError) console.warn('[fonts] failed to load, using system fallbacks:', fontError);
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Once signed in, request push permission + persist the Expo token. Tapping a
  // notification opens the app (handled by expo-notifications by default).
  useEffect(() => {
    if (!token) return;
    void registerForPushNotificationsAsync();
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // Future: deep-link to /(tabs)/sessions when type === 'BOOKING_CONFIRMED' etc.
    });
    return () => sub.remove();
  }, [token]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
