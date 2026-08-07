import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

type AppEnv = 'development' | 'production';

interface AppEnvConfig {
  apiUrl: string;
  appEnv: AppEnv;
  disableFirebase: boolean;
}

const rawApi =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.API_URL ||
  '';

/** Same as gentrack: resolve Metro/Expo host so physical phones hit the PC, not phone-localhost. */
const getExpoDevHost = () => {
  const candidates = [
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost,
    (
      Constants as {
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost,
    (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode
      ?.scriptURL,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    try {
      if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
        const parsed = new URL(candidate);
        if (parsed.hostname) return parsed.hostname;
      }
      const host = candidate.split('/')[0]?.split(':')[0];
      if (host) return host;
    } catch {
      // ignore
    }
  }
  return '';
};

const replaceLocalhostHost = (value: string, host: string) => {
  if (!host) return value;
  return value.replace(
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i,
    (_, protocol) => `${protocol || 'http://'}${host}`
  );
};

const normalizedApi = (() => {
  if (!rawApi) return '';
  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(rawApi)) {
    const expoDevHost = getExpoDevHost();
    if (
      expoDevHost &&
      !['localhost', '127.0.0.1', '10.0.2.2'].includes(expoDevHost)
    ) {
      return replaceLocalhostHost(rawApi, expoDevHost);
    }
    if (Platform.OS === 'android') {
      return replaceLocalhostHost(rawApi, '10.0.2.2');
    }
  }
  return rawApi;
})();

const extra = Constants.expoConfig?.extra as
  | { appEnv?: AppEnv; disableFirebase?: boolean | string }
  | undefined;

export const Env: AppEnvConfig = {
  apiUrl: normalizedApi,
  appEnv:
    (extra?.appEnv as AppEnv) ||
    (process.env.APP_ENV as AppEnv) ||
    'development',
  disableFirebase:
    extra?.disableFirebase === true ||
    extra?.disableFirebase === 'true' ||
    process.env.EXPO_PUBLIC_DISABLE_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_DISABLE_FIREBASE === '1',
};
