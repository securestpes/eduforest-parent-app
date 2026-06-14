import type { AppTheme } from '../theme';

export function attendanceStripeColor(status: string, theme: AppTheme): string {
  const s = status.toLowerCase();
  if (s.includes('present')) return theme.colors.success;
  if (s.includes('absent')) return theme.colors.error;
  if (s.includes('late')) return theme.colors.warning;
  if (s.includes('leave') || s.includes('excus')) return '#7C3AED';
  if (s.includes('half')) return '#EA580C';
  return theme.colors.primary;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 13) % 360;
  return h;
}
