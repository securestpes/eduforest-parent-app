const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

// Load env/.env.<APP_ENV> the same way app.config.ts does
const APP_ENV = process.env.APP_ENV || 'development';
const envFile = path.resolve(__dirname, 'env', `.env.${APP_ENV}`);
try {
  require('dotenv').config({ path: envFile });
} catch {
  /* optional */
}

const disableFirebase =
  process.env.EXPO_PUBLIC_DISABLE_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_DISABLE_FIREBASE === '1';

const config = getDefaultConfig(__dirname);

if (disableFirebase) {
  const rnfbStub = path.resolve(__dirname, 'src/shims/rnfbStub.js');
  const notifeeStub = path.resolve(__dirname, 'src/shims/notifeeStub.js');
  const aliases = {
    '@react-native-firebase/app': rnfbStub,
    '@react-native-firebase/auth': rnfbStub,
    '@react-native-firebase/messaging': rnfbStub,
    '@notifee/react-native': notifeeStub,
  };

  const previousResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (aliases[moduleName]) {
      return { type: 'sourceFile', filePath: aliases[moduleName] };
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  console.log(
    '[metro] EXPO_PUBLIC_DISABLE_FIREBASE=true — RNFB + Notifee stubbed for Expo Go'
  );
}

module.exports = config;
