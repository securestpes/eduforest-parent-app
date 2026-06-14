import { NativeModules, Platform } from 'react-native';
import type { AppLanguage } from '../contexts/parentTranslations';

type AppLanguageModuleType = {
  setAppLanguage: (language: string) => void;
};

const nativeModule = NativeModules.AppLanguageModule as
  | AppLanguageModuleType
  | undefined;

/** Mirrors {@link localStorageKeys.APP_LANGUAGE} for Android native TTS. */
export function syncNativeAppLanguage(language: AppLanguage): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    nativeModule?.setAppLanguage?.(language);
  } catch {
    /* native module optional until rebuild */
  }
}
