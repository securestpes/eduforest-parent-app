/**
 * Lazy-load RNFB Messaging. Avoids getApp() at import time on Expo Go / web.
 */
import { isFirebaseDisabled } from '../../config/featureFlags';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessagingFn = (() => any) | null;

let cached: MessagingFn | undefined;

export function getFirebaseMessaging(): MessagingFn {
  if (cached !== undefined) {
    return cached;
  }

  if (isFirebaseDisabled) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/messaging');
    cached = (mod.default ?? mod) as MessagingFn;
    return cached;
  } catch (e) {
    console.warn('[firebaseMessaging] native module unavailable', e);
    cached = null;
    return cached;
  }
}
