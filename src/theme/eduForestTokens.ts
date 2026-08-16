/** Mirror of gentrack EduSchool/theme/eduForestTheme — keep parent cards visually consistent. */
export const EduForestColors = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryStrong: '#1D4ED8',
  secondary: '#06B6D4',
  secondaryLight: '#ECFEFF',
  secondaryStrong: '#0E7490',
  success: '#22C55E',
  successLight: '#F0FDF4',
  successStrong: '#15803D',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningStrong: '#B45309',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerStrong: '#B91C1C',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
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
