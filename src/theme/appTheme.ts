/**
 * New parent-app visual system (Homework / Study shell).
 * Previous Paper theme remains at ../theme.ts and in src-backup/.
 */
export const colors = {
  primary: '#6B5CE7',
  primaryDark: '#4F45C8',
  primarySoft: '#EEEBFE',
  primaryMuted: '#C9C4F5',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  text: '#2D3142',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFF4E0',
  danger: '#E11D48',
  dangerSoft: '#FFE4E8',
  headerOn: '#FFFFFF',
  overlay: 'rgba(255,255,255,0.18)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  section: { fontSize: 16, fontWeight: '700' as const },
  cardTitle: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  meta: { fontSize: 12, fontWeight: '500' as const },
  badge: { fontSize: 11, fontWeight: '700' as const },
} as const;

export const shadows = {
  card: {
    shadowColor: '#2D3142',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  tab: {
    shadowColor: '#1E1B3A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;

export const cardChrome = {
  backgroundColor: colors.surface,
  borderRadius: 20,
  ...shadows.card,
} as const;

export const theme = { colors, spacing, radius, typography, shadows } as const;
export type DesignTheme = typeof theme;
