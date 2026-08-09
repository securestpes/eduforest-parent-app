import { Env } from './envConfig';
import { isFirebaseDisabled } from './featureFlags';

/** Same as gentrack: env FIREBASE_LOGIN=true enables Firebase phone login (Android). */
export const isFirebaseLoginEnabled = () => {
  return Env.firebaseLoginEnabled && !isFirebaseDisabled;
};

/** When true, logs verification session / token steps to Metro (no secrets on screen). */
export const SHOW_FIREBASE_OTP_VERIFY_DEBUG = false;
