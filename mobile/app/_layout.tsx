import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
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
import { CrisisDisclaimerModal } from '../components/CrisisDisclaimerModal';
import { MascotAssistant, MascotTapSurface } from '../components/MascotAssistant';
import { DialogProvider } from '../components/AppDialog';
import { hasAckedCrisis, setCrisisAck } from '../lib/crisis';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const loadAuth = useAuthStore(s => s.loadAuth);
  const token = useAuthStore(s => s.token);
  const pathname = usePathname();
  const showAssistant = Boolean(token) && pathname !== '/onboarding' && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/(auth)');

  // Crisis disclaimer gate. `null` = still checking SecureStore; once resolved,
  // `true` means we must show the one-time mandatory mental-health disclaimer.
  const [showCrisis, setShowCrisis] = useState<boolean | null>(null);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    hasAckedCrisis().then(acked => setShowCrisis(!acked));
  }, []);

  useEffect(() => {
    if (fontError) console.warn('[fonts] failed to load, using system fallbacks:', fontError);
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Once signed in, request push permission + persist the Expo token. Tapping a
  // notification opens the app (handled by expo-notifications by default).
  useEffect(() => {
    if (!token) return;
    void registerForPushNotificationsAsync();
    try {
      const sub = Notifications.addNotificationResponseReceivedListener(() => {
        // Future: deep-link to /(tabs)/sessions when type === 'BOOKING_CONFIRMED' etc.
      });
      return () => sub.remove();
    } catch (err) {
      console.warn('[push] notification listener unavailable:', err);
      return undefined;
    }
  }, [token]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <DialogProvider>
              <MascotTapSurface>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }} />
                {showAssistant ? <MascotAssistant /> : null}
                <CrisisDisclaimerModal
                  visible={showCrisis === true}
                  onAcknowledge={() => { setShowCrisis(false); void setCrisisAck(); }}
                />
              </MascotTapSurface>
            </DialogProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
