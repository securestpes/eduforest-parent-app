import { isNetworkError, isServerError } from '../../common/helpers/networkHelper';
import type { TranslationKey } from '../../common';

const TECHNICAL = /axios|econn|etimedout|enetunreach|status code|request failed|err_network/i;

function rawMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? '');
}

export function friendlyAuthError(
  error: unknown,
  t: (key: TranslationKey) => string
): string {
  if (isNetworkError(error) || isNetworkError(rawMessage(error))) {
    return t('login.networkError');
  }
  if (isServerError(error)) {
    return t('login.serverError');
  }

  const cleaned = rawMessage(error)
    .replace(/^\[Request failed\]:\s*/i, '')
    .replace(/^Login failed:\s*/i, '')
    .replace(/^Could not load schools:\s*/i, '')
    .replace(/^AxiosError:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  if (!cleaned || /^network error$/i.test(cleaned) || TECHNICAL.test(cleaned)) {
    return t('login.networkError');
  }

  return cleaned;
}
