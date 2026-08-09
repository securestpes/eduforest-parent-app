/**
 * Expo Go / no-native-Firebase mode (stubs RNFB + skips FCM).
 * Set EXPO_PUBLIC_DISABLE_FIREBASE=true then restart Metro.
 * For phone login on/off, use FIREBASE_LOGIN=true|false instead (see config/firebaseLogin.ts).
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { disableFirebase?: boolean | string }
  | undefined;

const fromExtra = extra?.disableFirebase;
const fromProcess = process.env.EXPO_PUBLIC_DISABLE_FIREBASE;

export const isFirebaseDisabled =
  fromExtra === true ||
  fromExtra === 'true' ||
  fromProcess === 'true' ||
  fromProcess === '1';
