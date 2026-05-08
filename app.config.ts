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
const appBuildNumber = process.env.APP_BUILD_NUMBER || '103';

const config: ExpoConfig = {
  name: 'EduForest Parent',
  slug: 'eduforest-parent',
  version: appVersion,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0d47a1',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'in.co.eduforest.parent',
    buildNumber: appBuildNumber,
  },
  android: {
    package: 'in.co.eduforest.parent',
    versionCode: Number(appBuildNumber),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0d47a1',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.API_URL,
    appEnv: process.env.APP_ENV || APP_ENV,
  },
};

export default config;
