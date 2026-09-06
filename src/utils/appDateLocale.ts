import { format } from 'date-fns';
import { bn, enUS, hi, ta } from 'date-fns/locale';
import type { AppLanguage } from '../common/contexts/parentTranslations';

export const APP_DATE_FNS_LOCALES = { en: enUS, hi, bn, ta } as const;

export function dateFnsLocale(language: AppLanguage) {
  return APP_DATE_FNS_LOCALES[language] ?? enUS;
}

export function appBcp47Locale(language: AppLanguage): string {
  if (language === 'hi') return 'hi-IN';
  if (language === 'bn') return 'bn-IN';
  if (language === 'ta') return 'ta-IN';
  return 'en-IN';
}

export function formatAppDate(
  date: Date | number,
  pattern: string,
  language: AppLanguage
): string {
  return format(date, pattern, { locale: dateFnsLocale(language) });
}

function labelsFromAnchor(
  anchor: Date,
  pattern: string,
  language: AppLanguage
): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + i);
    return formatAppDate(day, pattern, language);
  });
}

/** Narrow weekday letters, Monday-first (attendance calendar). */
export function weekdayNarrowLabelsMondayFirst(language: AppLanguage): string[] {
  return labelsFromAnchor(new Date(2024, 0, 8), 'EEEEE', language);
}

/** Narrow weekday letters, Sunday-first (school calendar). */
export function weekdayNarrowLabelsSundayFirst(language: AppLanguage): string[] {
  return labelsFromAnchor(new Date(2024, 0, 7), 'EEEEE', language);
}

/** Short weekday names, Monday-first (leave picker). */
export function weekdayShortLabelsMondayFirst(language: AppLanguage): string[] {
  return labelsFromAnchor(new Date(2024, 0, 8), 'EEE', language);
}
