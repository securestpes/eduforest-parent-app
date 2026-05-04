/** Minimal stand-in for gentrack GlobalToastService (no global alert slice in parent app). */
export const GlobalToastService = {
  showServerError(message?: string): void {
    console.warn('[GlobalToastService] Server unavailable', message ?? '');
  },
};
