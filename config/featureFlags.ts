/**
 * Temporary Expo Go / no-native-Firebase mode.
 * Set EXPO_PUBLIC_DISABLE_FIREBASE=true in env/.env.development then restart Metro.
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
