/**
 * Expo Go / no-native-Firebase mode (stubs RNFB + skips FCM).
 * Set EXPO_PUBLIC_DISABLE_FIREBASE=true then restart Metro.
 * For phone login on/off, use FIREBASE_LOGIN=true|false instead (see config/firebaseLogin.ts).
 *
 * Web and Expo Go never run native google-services init, so RNFB's
 * getApp() throws "No Firebase App '[DEFAULT]' has been created".
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as
  | { disableFirebase?: boolean | string }
  | undefined;

const fromExtra = extra?.disableFirebase;
const fromProcess = process.env.EXPO_PUBLIC_DISABLE_FIREBASE;

/** Expo Go client — native RNFB is not compiled in. */
const isExpoGo = Constants.appOwnership === 'expo';

export const isFirebaseDisabled =
  fromExtra === true ||
  fromExtra === 'true' ||
  fromProcess === 'true' ||
  fromProcess === '1' ||
  Platform.OS === 'web' ||
  isExpoGo;
