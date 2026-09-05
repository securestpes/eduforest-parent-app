/** Mirror of gentrack EduSchool/theme/eduForestTheme — keep parent cards visually consistent. */
export const EduForestColors = {
  primary: '#6B5CE7',
  primaryLight: '#EEEBFE',
  primaryStrong: '#4F45C8',
  secondary: '#14B8A6',
  secondaryLight: '#E6FAF7',
  secondaryStrong: '#0D9488',
  success: '#059669',
  successLight: '#ECFDF5',
  successStrong: '#047857',
  warning: '#F59E0B',
  warningLight: '#FFF4E0',
  warningStrong: '#B45309',
  danger: '#E11D48',
  dangerLight: '#FFE4E8',
  dangerStrong: '#BE123C',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  border: '#E8EAED',
  borderLight: '#F0F1F4',
  textPrimary: '#2D3142',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
} as const;

export const EduForestSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
} as const;

export const EduForestRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const EduForestShadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;

export const EduForestTypography = {
  h2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  bodySemiBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  smallSemiBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
} as const;

/** Shared bordered surface card shell (gentrack QuickActions / DashboardStats). */
export const eduForestCardShell = {
  backgroundColor: EduForestColors.surface,
  borderRadius: EduForestRadius.lg,
  borderWidth: 1,
  borderColor: EduForestColors.border,
  ...EduForestShadow.sm,
} as const;
