import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from '../constants';
import { syncNativeAppLanguage } from '../helpers/syncNativeAppLanguage';
import {
  type AppLanguage,
  parentTranslations,
  supportedLanguages,
  type TranslationKey,
} from './parentTranslations';

export type { AppLanguage, TranslationKey };

type TranslationParams = Record<string, string | number | undefined>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value ?? ''));
  }, template);
}

type LanguageContextValue = {
  language: AppLanguage;
  isReady: boolean;
  supportedLanguages: typeof supportedLanguages;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  isReady: false,
  supportedLanguages,
  setLanguage: async () => {},
  t: (key, params) =>
    interpolate(parentTranslations.en[key] ?? String(key), params),
});

export const AppLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setCurrentLanguage] = useState<AppLanguage>('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(localStorageKeys.APP_LANGUAGE);
        if (
          storedLanguage === 'en' ||
          storedLanguage === 'hi' ||
          storedLanguage === 'bn' ||
          storedLanguage === 'ta'
        ) {
          setCurrentLanguage(storedLanguage);
          syncNativeAppLanguage(storedLanguage);
        }
      } finally {
        setIsReady(true);
      }
    };

    void loadLanguage();
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setCurrentLanguage(nextLanguage);
    await AsyncStorage.setItem(localStorageKeys.APP_LANGUAGE, nextLanguage);
    syncNativeAppLanguage(nextLanguage);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const dictionary = parentTranslations[language] ?? parentTranslations.en;
      const fallback = parentTranslations.en[key];
      return interpolate(dictionary[key] ?? fallback ?? String(key), params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      isReady,
      supportedLanguages,
      setLanguage,
      t,
    }),
    [isReady, language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useAppLanguage = () => useContext(LanguageContext);
