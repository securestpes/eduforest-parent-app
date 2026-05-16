/** Same keys as gentrack-app `common/constants` (parent app aligns auth + storage). */
export const localStorageKeys = {
  ACCESS_TOKEN: 'access_token',
  /** Legacy key from early parent builds — migrated to ACCESS_TOKEN on read. */
  LEGACY_ACCESS_TOKEN: 'eduforest_parent_access_token',
  APP_LANGUAGE: 'app_language',
  VOICE_ANNOUNCEMENTS_ENABLED: 'voice_announcements_enabled',
  /** First-launch Terms & Privacy acceptance (same flow as gentrack-app). */
  LEGAL_CONSENT_ACCEPTED: 'legal_consent_accepted',
} as const;
