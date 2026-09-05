import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager, Platform } from 'react-native';
import { localStorageKeys } from '../common/constants';
import { registerDeviceToken } from './parent';
import { isFirebaseDisabled } from '../../config/featureFlags';

function getFcmOrNull(): object | null {
  if (Platform.OS === 'web' || isFirebaseDisabled) {
    return null;
  }
  try {
    // Lazy require — top-level getApp() throws on web/Expo Go before initializeApp().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMessaging } = require('@react-native-firebase/messaging');
    return getMessaging(getApp());
  } catch (e) {
    console.warn('[push] Firebase app not initialized — skipping FCM', e);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFcmGetTokenError(e: unknown): boolean {
  const msg = String(e instanceof Error ? e.message : e).toLowerCase();
  return (
    msg.includes('service_not_available') ||
    msg.includes('service unavailable') ||
    msg.includes('messaging/unknown') ||
    msg.includes('executionexception')
  );
}

function isRetryableNetworkFailure(e: unknown): boolean {
  if (!axios.isAxiosError(e)) return false;
  if (e.response) return false;
  const code = e.code;
  const msg = (e.message || '').toLowerCase();
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    msg.includes('network error')
  );
}

/**
 * Gets native FCM token and registers it with securez-client-service.
 * Pass `accessToken` from auth store so the first request after login does not race AsyncStorage.
 * Retries on transient Axios "Network Error" (common right after cold start before the radio is ready).
 */
export async function registerParentPushToken(
  accessToken?: string | null
): Promise<void> {
  const fcm = getFcmOrNull();
  if (Platform.OS === 'web' || isFirebaseDisabled || !fcm) {
    return;
  }

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await sleep(400);

  try {
    let fcmToken: string | undefined;
    const getTokenMax = 5;
    for (let attempt = 1; attempt <= getTokenMax; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getToken } = require('@react-native-firebase/messaging');
        fcmToken = await getToken(fcm);
        break;
      } catch (e) {
        if (isRetryableFcmGetTokenError(e) && attempt < getTokenMax) {
          const delayMs = 800 * attempt;
          console.warn(
            `[push] getToken attempt ${attempt}/${getTokenMax} failed (retry in ${delayMs}ms)`,
            e
          );
          await sleep(delayMs);
          continue;
        }
        throw e;
      }
    }
    if (!fcmToken) {
      console.log('[push] FCM token empty');
      return;
    }
    console.log('[push] FCM token:', fcmToken);
    const platform =
      Platform.OS === 'ios'
        ? 'ios'
        : Platform.OS === 'android'
          ? 'android'
          : Platform.OS;

    let bearer = accessToken?.trim() || null;
    if (!bearer) {
      bearer =
        (await AsyncStorage.getItem(localStorageKeys.ACCESS_TOKEN))?.trim() ||
        null;
    }

    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await registerDeviceToken(fcmToken, platform, bearer);
        console.log('[push] Device token registered with backend');
        return;
      } catch (e) {
        if (isRetryableNetworkFailure(e) && attempt < maxAttempts) {
          const delayMs = 600 * attempt;
          console.warn(
            `[push] device-token attempt ${attempt}/${maxAttempts} failed (retry in ${delayMs}ms)`,
            axios.isAxiosError(e) ? e.code || e.message : e
          );
          await sleep(delayMs);
          continue;
        }
        if (axios.isAxiosError(e)) {
          console.warn('[push] device-token failed', {
            code: e.code,
            message: e.message,
            status: e.response?.status,
            data: e.response?.data,
          });
        } else {
          console.warn('[push] Failed to register device token', e);
        }
        return;
      }
    }
  } catch (e) {
    console.warn('[push] Failed to register device token', e);
  }
}
