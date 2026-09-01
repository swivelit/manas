import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: BASE_URL });

export function apiErrorMessage(err: unknown, fallback: string): string {
  const responseError = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof responseError === 'string' && responseError.trim().length > 0 ? responseError : fallback;
}

let authRedirectInProgress = false;

api.interceptors.request.use(async (cfg) => {
  const token = await SecureStore.getItemAsync('manas_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (response) => {
    authRedirectInProgress = false;
    return response;
  },
  async (err) => {
    const requestUrl = err?.config?.url;
    if (err?.response?.status === 401 && typeof requestUrl === 'string' && !requestUrl.startsWith('/auth') && !authRedirectInProgress) {
      authRedirectInProgress = true;
      try {
        await useAuthStore.getState().clearAuth();
        router.replace('/(auth)/login');
      } catch {
        // Preserve and rethrow the original API error if auth cleanup/navigation fails.
      }
    }
    return Promise.reject(err);
  },
);
