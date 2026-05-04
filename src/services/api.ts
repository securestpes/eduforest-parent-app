import axios, { type AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Env } from '../../config/envConfig';
import { localStorageKeys } from '../../common/constants';

const baseUrl = Env.apiUrl;
if (!baseUrl) {
  console.warn('[parent-app] API_URL is empty — set env/.env.development');
} else if (__DEV__) {
  // Confirms which host the running app calls (change env → restart Metro / rebuild native if needed).
  console.log('[parent-app] API baseURL:', baseUrl);
}

export const api: AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

async function readAccessToken(): Promise<string | null> {
  let token = await AsyncStorage.getItem(localStorageKeys.ACCESS_TOKEN);
  if (!token) {
    const leg = await AsyncStorage.getItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
    if (leg) {
      await AsyncStorage.setItem(localStorageKeys.ACCESS_TOKEN, leg);
      await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
      token = leg;
    }
  }
  return token;
}

api.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? {};

  const hasAuth =
    typeof config.headers.Authorization === 'string' && config.headers.Authorization.length > 0;
  if (!hasAuth) {
    const token = await readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        const { AuthService } = await import('../../features/login/services/AuthService');
        await AuthService.firebaseSignOut();
        await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
        await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
        const { store } = await import('../../redux/store');
        const { logout } = await import('../../features/login/slices/authSlice');
        store.dispatch(logout());
      } catch (e) {
        console.error('[api] 401 logout failed', e);
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiEnvelope {
  status: boolean;
  message: string;
  data?: unknown;
}
