export function getFirebaseErrorKey(error: unknown): string {
  if (!error) return 'verifyOtp.unexpected';
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  if (msg.includes('auth/session-expired')) {
    return 'verifyOtp.expiredOtp';
  }
  if (msg.includes('auth/invalid-phone-number')) {
    return 'verifyOtp.invalidPhone';
  }
  if (msg.includes('auth/invalid-verification-code')) {
    return 'verifyOtp.invalid';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'verifyOtp.tooManyAttempts';
  }
  return 'verifyOtp.unexpected';
}
