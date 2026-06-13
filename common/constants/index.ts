/** Public legal pages on eduforest.co.in (Parent app — use `?app=parent` on legal pages). */
export const LEGAL_WEB_BASE_URL = 'https://eduforest.co.in';

export const legalWebUrls = {
  privacyPolicy: `${LEGAL_WEB_BASE_URL}/privacy-policy?app=parent`,
  termsAndConditions: `${LEGAL_WEB_BASE_URL}/terms-and-conditions?app=parent`,
  helpAndSupport: `${LEGAL_WEB_BASE_URL}/help-and-support?app=parent`,
  deleteAccount: `${LEGAL_WEB_BASE_URL}/delete-account?app=parent`,
} as const;

/** Same keys as gentrack-app `common/constants` (parent app aligns auth + storage). */
export const localStorageKeys = {
  ACCESS_TOKEN: 'access_token',
  /** Legacy key from early parent builds — migrated to ACCESS_TOKEN on read. */
  LEGACY_ACCESS_TOKEN: 'eduforest_parent_access_token',
  APP_LANGUAGE: 'app_language',
  VOICE_ANNOUNCEMENTS_ENABLED: 'voice_announcements_enabled',
  /** First-launch Terms & Privacy acceptance (same flow as gentrack-app). */
  LEGAL_CONSENT_ACCEPTED: 'legal_consent_accepted',
  DARK_MODE_ENABLED: 'dark_mode_enabled',
  PARENT_ONBOARDING_COMPLETED: 'parent_onboarding_completed',
} as const;
