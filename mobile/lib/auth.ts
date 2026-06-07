import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  timezone: string;
  isPremium: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('manas_token', token);
    await SecureStore.setItemAsync('manas_user', JSON.stringify(user));
    set({ token, user });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('manas_token');
    await SecureStore.deleteItemAsync('manas_user');
    set({ token: null, user: null });
  },

  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('manas_token');
      const userStr = await SecureStore.getItemAsync('manas_user');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) });
      }
    } catch {
      // silently ignore
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Landing route by role: ADMIN → admin area, COACH → coach area, USER → tabs.
export function routeForRole(role?: string | null): '/(tabs)' | '/(coach)/appointments' | '/(admin)/dashboard' {
  if (role === 'ADMIN') return '/(admin)/dashboard';
  if (role === 'COACH') return '/(coach)/appointments';
  return '/(tabs)';
}
