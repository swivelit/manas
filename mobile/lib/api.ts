import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (cfg) => {
  const token = await SecureStore.getItemAsync('manas_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
