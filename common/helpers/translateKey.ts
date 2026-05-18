import {
  type AppLanguage,
  parentTranslations,
  type TranslationKey,
} from '../contexts/parentTranslations';

type TranslationParams = Record<string, string | number | undefined>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value ?? ''));
  }, template);
}

/** Resolve a translation key for a specific app language (no React context). */
export function translateKey(
  language: AppLanguage,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const dictionary = parentTranslations[language] ?? parentTranslations.en;
  const fallback = parentTranslations.en[key];
  const template = dictionary[key] ?? fallback ?? String(key);
  return interpolate(template, params);
}
