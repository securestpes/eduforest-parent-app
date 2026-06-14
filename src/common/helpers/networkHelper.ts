/**
 * Network / server error helpers (aligned with gentrack-app).
 */

export const NETWORK_ERROR_MESSAGE =
  'You are currently offline. Please check your internet connection and try again.';

export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;

  const err = error as Record<string, unknown>;
  const errorMessage =
    typeof error === 'string' ? error : String(err.message || err.toString?.() || '');
  const errorCode = String(err.code || '');

  const networkErrorPatterns = [
    'network',
    'internet',
    'connection',
    'ENOTFOUND',
    'ETIMEDOUT',
    'timeout',
    'fetch failed',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION_TIMED_OUT',
    'ERR_NAME_NOT_RESOLVED',
  ];

  const messageMatch = networkErrorPatterns.some((pattern) =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
  const codeMatch = networkErrorPatterns.some((pattern) =>
    errorCode.toLowerCase().includes(pattern.toLowerCase())
  );

  const isConnectionRefused =
    errorCode === 'ECONNREFUSED' || errorCode === 'ERR_CONNECTION_REFUSED';

  const isAxiosNetworkError =
    err.isAxiosError === true &&
    !err.response &&
    err.request &&
    !isConnectionRefused;

  return messageMatch || codeMatch || Boolean(isAxiosNetworkError);
};

export const getNetworkErrorMessage = (): string => NETWORK_ERROR_MESSAGE;

export const isServerError = (error: unknown): boolean => {
  if (!error) return false;
  const err = error as Record<string, unknown>;
  const status = (err.response as { status?: number } | undefined)?.status || err.status;
  if (typeof status === 'number') {
    return status >= 500 && status < 600;
  }

  const errorCode = String(err.code || '');
  if (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ERR_CONNECTION_REFUSED' ||
    errorCode === 'ECONNRESET'
  ) {
    return true;
  }

  const errorMessage = String(err.message || '');
  const serverErrorPatterns = [
    'server error',
    'service unavailable',
    'econnrefused',
    'connection refused',
    'econnreset',
  ];
  if (serverErrorPatterns.some((p) => errorMessage.toLowerCase().includes(p))) {
    return true;
  }

  if (err.isAxiosError && !err.response && err.request) {
    if (
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ERR_CONNECTION_REFUSED' ||
      errorCode === 'ECONNRESET'
    ) {
      return true;
    }
  }

  return false;
};
