import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

const PROJECT_ID =
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

// Foreground display behaviour. Default: show as banner + play sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for push permission (if not yet asked), grab the Expo token, send it
 * to the backend. Returns the token on success, or null if denied / unsupported
 * (e.g. simulator). Idempotent — safe to call after every login.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators can't receive real pushes — no point asking for permission.
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MANAS',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#F25BB0',
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync(
      PROJECT_ID ? { projectId: PROJECT_ID } : undefined
    )).data;
    if (token) {
      await api.post('/me/push-token', { token }).catch(() => {/* surface later if needed */});
    }
    return token;
  } catch (err) {
    // E.g. project not linked to EAS yet — log and return null. The app still works.
    console.warn('[push] getExpoPushTokenAsync failed:', err);
    return null;
  }
}

export async function clearPushToken(): Promise<void> {
  await api.post('/me/push-token', { token: null }).catch(() => {});
}
