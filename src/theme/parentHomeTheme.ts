/**
 * Home-screen design system (light + dark).
 *
 * Use in new screens:
 *   import { useParentTheme } from '../theme';
 *   const theme = useParentTheme();
 *
 * Follows AppThemeProvider / isDark so the existing dark-mode toggle applies.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';

export type ModuleAccent = {
  icon: string;
  onIcon: string;
  well: string;
  card: string;
  metric: string;
};

export type ParentHomeColors = {
  scheme: ColorSchemeName;

  primary: string;
  primaryDark: string;
  primarySoft: string;

  headerGradient: readonly [string, string];
  headerOn: string;
  headerMuted: string;
  headerIconWell: string;

  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderSubtle: string;
  divider: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  success: string;
  successSoft: string;
  successOn: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  selectedBorder: string;
  paginationActive: string;
  paginationIdle: string;
  timeline: string;
  overlay: string;
  scrim: string;

  modules: {
    attendance: ModuleAccent;
    fees: ModuleAccent;
    homework: ModuleAccent;
    exams: ModuleAccent;
    transport: ModuleAccent;
    announcements: ModuleAccent;
  };
};

const modulesLight = {
  attendance: {
    icon: '#22C55E',
    onIcon: '#FFFFFF',
    well: '#DCFCE7',
    card: '#F0FDF4',
    metric: '#16A34A',
  },
  fees: {
    icon: '#F59E0B',
    onIcon: '#FFFFFF',
    well: '#FFEDD5',
    card: '#FFF7ED',
    metric: '#EA580C',
  },
  homework: {
    icon: '#7C3AED',
    onIcon: '#FFFFFF',
    well: '#EDE9FE',
    card: '#F5F3FF',
    metric: '#6D28D9',
  },
  exams: {
    icon: '#3B82F6',
    onIcon: '#FFFFFF',
    well: '#DBEAFE',
    card: '#EFF6FF',
    metric: '#2563EB',
  },
  transport: {
    icon: '#EC4899',
    onIcon: '#FFFFFF',
    well: '#FCE7F3',
    card: '#FFF1F2',
    metric: '#DB2777',
  },
  announcements: {
    icon: '#14B8A6',
    onIcon: '#FFFFFF',
    well: '#CCFBF1',
    card: '#F0FDFA',
    metric: '#0D9488',
  },
} as const satisfies ParentHomeColors['modules'];

const modulesDark = {
  attendance: {
    icon: '#4ADE80',
    onIcon: '#052E16',
    well: '#163022',
    card: '#163022',
    metric: '#86EFAC',
  },
  fees: {
    icon: '#FBBF24',
    onIcon: '#422006',
    well: '#3A2A12',
    card: '#3A2A12',
    metric: '#FCD34D',
  },
  homework: {
    icon: '#A99BFF',
    onIcon: '#1E1654',
    well: '#2A2554',
    card: '#2A2554',
    metric: '#C4B5FD',
  },
  exams: {
    icon: '#60A5FA',
    onIcon: '#0B2447',
    well: '#163154',
    card: '#163154',
    metric: '#93C5FD',
  },
  transport: {
    icon: '#F472B6',
    onIcon: '#4A1233',
    well: '#3D1A2E',
    card: '#3D1A2E',
    metric: '#F9A8D4',
  },
  announcements: {
    icon: '#2DD4BF',
    onIcon: '#042F2E',
    well: '#123834',
    card: '#123834',
    metric: '#5EEAD4',
  },
} as const satisfies ParentHomeColors['modules'];

export const lightColors: ParentHomeColors = {
  scheme: 'light',
  primary: '#6B5CE7',
  primaryDark: '#4F45C8',
  primarySoft: '#EEEBFE',
  headerGradient: ['#6B5CE7', '#6950FA'],
  headerOn: '#FFFFFF',
  headerMuted: 'rgba(255,255,255,0.82)',
  headerIconWell: 'rgba(255,255,255,0.18)',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E8EAED',
  borderSubtle: '#F0F1F4',
  divider: '#EEF0F3',
  text: '#2D3142',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  success: '#28A745',
  successSoft: '#E8F8EE',
  successOn: '#FFFFFF',
  warning: '#FF9800',
  warningSoft: '#FFF4E0',
  danger: '#E53935',
  dangerSoft: '#FDECEC',
  info: '#2196F3',
  infoSoft: '#E8F4FE',
  selectedBorder: '#86EFAC',
  paginationActive: '#28A745',
  paginationIdle: '#D1D5DB',
  timeline: '#E5E7EB',
  overlay: 'rgba(255,255,255,0.18)',
  scrim: 'rgba(26,24,48,0.45)',
  modules: modulesLight,
};

export const darkColors: ParentHomeColors = {
  scheme: 'dark',
  primary: '#8B7CFF',
  primaryDark: '#6B5CE7',
  primarySoft: '#2A2554',
  headerGradient: ['#4F45C8', '#6950FA'],
  headerOn: '#FFFFFF',
  headerMuted: 'rgba(255,255,255,0.78)',
  headerIconWell: 'rgba(255,255,255,0.14)',
  background: '#101018',
  surface: '#1A1A26',
  surfaceRaised: '#222232',
  border: '#2E2E42',
  borderSubtle: '#262636',
  divider: '#2A2A3C',
  text: '#F4F3FA',
  textSecondary: '#B0ABC8',
  textTertiary: '#7E7A98',
  textInverse: '#FFFFFF',
  success: '#4ADE80',
  successSoft: '#163022',
  successOn: '#052E16',
  warning: '#FBBF24',
  warningSoft: '#3A2A12',
  danger: '#F87171',
  dangerSoft: '#3A1A1A',
  info: '#60A5FA',
  infoSoft: '#163154',
  selectedBorder: '#4ADE80',
  paginationActive: '#4ADE80',
  paginationIdle: '#3A3A50',
  timeline: '#34344A',
  overlay: 'rgba(255,255,255,0.12)',
  scrim: 'rgba(0,0,0,0.55)',
  modules: modulesDark,
};

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  sheet: 28,
  full: 999,
} as const;

export const typography = {
  greeting: { fontSize: 15, fontWeight: '500', letterSpacing: 0.1 } satisfies TextStyle,
  hero: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 } satisfies TextStyle,
  section: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 } satisfies TextStyle,
  cardTitle: { fontSize: 15, fontWeight: '700' } satisfies TextStyle,
  metric: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 } satisfies TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } satisfies TextStyle,
  meta: { fontSize: 12, fontWeight: '500' } satisfies TextStyle,
  badge: { fontSize: 11, fontWeight: '700' } satisfies TextStyle,
  time: { fontSize: 11, fontWeight: '600' } satisfies TextStyle,
} as const;

function cardShadow(scheme: ColorSchemeName): ViewStyle {
  if (scheme === 'dark') {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 4,
    };
  }
  return {
    shadowColor: '#2D3142',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  };
}

export type ParentHomeTheme = {
  colors: ParentHomeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: {
    card: ViewStyle;
    header: ViewStyle;
  };
};

export function createParentHomeTheme(scheme: ColorSchemeName): ParentHomeTheme {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return {
    colors,
    spacing,
    radius,
    typography,
    shadows: {
      card: cardShadow(scheme),
      header: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: scheme === 'dark' ? 0.4 : 0.22,
        shadowRadius: 18,
        elevation: 8,
      },
    },
  };
}

export const parentLightTheme = createParentHomeTheme('light');
export const parentDarkTheme = createParentHomeTheme('dark');
