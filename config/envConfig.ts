import Constants from 'expo-constants';
import { Platform } from 'react-native';

type AppEnv = 'development' | 'production';

interface AppEnvConfig {
  apiUrl: string;
  appEnv: AppEnv;
}

const rawApi =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.API_URL ||
  '';

const normalizedApi = (() => {
  if (!rawApi) return '';
  if (
    Platform.OS === 'android' &&
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(rawApi)
  ) {
    return rawApi.replace(
      /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i,
      'http://10.0.2.2'
    );
  }
  return rawApi;
})();

const extra = Constants.expoConfig?.extra as { appEnv?: AppEnv } | undefined;

export const Env: AppEnvConfig = {
  apiUrl: normalizedApi,
  appEnv: (extra?.appEnv as AppEnv) || (process.env.APP_ENV as AppEnv) || 'development',
};
