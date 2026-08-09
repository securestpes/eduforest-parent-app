import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Same pattern as gentrack-app: env/.env.<APP_ENV>
const APP_ENV = process.env.APP_ENV || 'development';
const envFile = path.resolve(__dirname, 'env', `.env.${APP_ENV}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

import type { ExpoConfig } from '@expo/config-types';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
);
const appVersion = process.env.APP_VERSION || packageJson.version || '1.0.0';
/** Android versionCode / iOS build number; bump each store release. */
const appBuildNumber = process.env.APP_BUILD_NUMBER || '7';

const config: ExpoConfig = {
  name: 'EduForest Parent',
  slug: 'eduforest-parent',
  version: appVersion,
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './src/assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'in.co.eduforest.parent',
    buildNumber: appBuildNumber,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'EduForest uses your location to show you near your child’s school bus on the map.',
    },
  },
  android: {
    package: 'in.co.eduforest.parent',
    versionCode: Number(appBuildNumber),
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
  },
  web: {
    favicon: './src/assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.API_URL,
    appEnv: process.env.APP_ENV || APP_ENV,
    /** Same as gentrack: phone login via Firebase when true (Android). */
    FIREBASE_LOGIN: process.env.FIREBASE_LOGIN === 'true',
    /** Expo Go / no-native-Firebase: stub RNFB + skip FCM init. */
    disableFirebase:
      process.env.EXPO_PUBLIC_DISABLE_FIREBASE === 'true' ||
      process.env.EXPO_PUBLIC_DISABLE_FIREBASE === '1',
  },
};

export default config;
