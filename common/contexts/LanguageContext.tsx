import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type AppLanguage = 'en';

type TranslationParams = Record<string, string | number | undefined>;

/** English copy aligned with gentrack-app `en` keys used on login / verify OTP. */
const en: Record<string, string> = {
  'common.change': 'Change',
  'login.title': 'Login with Mobile Number',
  'login.subtitle': 'We will send an SMS code to verify this number (Firebase)',
  'login.mobileLabel': 'Mobile Number',
  'login.continue': 'Continue',
  'login.mobileRequired': 'Mobile number is required',
  'login.mobileInvalid': 'Please enter a valid 10-digit mobile number',
  'login.sendOtpFailed': 'Failed to send OTP',
  'verifyOtp.title': 'OTP Verification',
  'verifyOtp.subtitle': 'Enter the OTP sent to your mobile number',
  'verifyOtp.verify': 'Verify OTP',
  'verifyOtp.resend': 'Resend OTP',
  'verifyOtp.resendIn': 'Resend in',
  'verifyOtp.resentSuccess': 'OTP resent successfully.',
  'verifyOtp.resentFailed': 'Failed to resend OTP.',
  'verifyOtp.resentError': 'Unable to resend OTP. Please try again later.',
  'verifyOtp.invalid': 'Please enter a valid 6-digit OTP.',
  'verifyOtp.unexpected': 'An unexpected error occurred. Please try again.',
  'verifyOtp.failed': 'OTP verification failed.',
  'verifyOtp.expiredOtp': 'This code has expired. Request a new one.',
  'verifyOtp.invalidPhone': 'Invalid phone number.',
  'verifyOtp.tooManyAttempts': 'Too many attempts. Try again later.',
};

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(params[key] ?? '')
  );
}

type TranslationKey = keyof typeof en | (string & {});

type LanguageContextValue = {
  language: AppLanguage;
  isReady: boolean;
  supportedLanguages: AppLanguage[];
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  isReady: true,
  supportedLanguages: ['en'],
  setLanguage: async () => {},
  t: (key) => en[key] ?? String(key),
});

export const AppLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language] = useState<AppLanguage>('en');
  const [isReady] = useState(true);

  const setLanguage = useCallback(async (_next: AppLanguage) => {
    /* Parent app is English-only for now; hook matches gentrack shape. */
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const raw = en[key] ?? key;
      return interpolate(raw, params);
    },
    []
  );

  const value = useMemo(
    () => ({
      language,
      isReady,
      supportedLanguages: ['en'] as AppLanguage[],
      setLanguage,
      t,
    }),
    [language, isReady, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useAppLanguage = () => useContext(LanguageContext);
