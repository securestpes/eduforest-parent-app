import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperLightTheme,
} from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper/lib/typescript/types';

export interface AppTheme extends Omit<MD3Theme, 'colors'> {
  palette: typeof colorPalette;
  colors: MD3Theme['colors'] & {
    text: string;
    disabled: string;
    border: string;
    grey: string;
    darkgrey: string;
    card: string;
    secondaryText: string;
    iconHighlight: string;
    iconNotFound: string;
    success: string;
    warning: string;
    surfaceMuted: string;
    accent: string;
    hero: string;
  };
  fontSizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    h1: number;
    h2: number;
    h3: number;
  };
  spacing: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  borderWidth: {
    thin: number;
    thick: number;
  };
  padding: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  margin: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

const fontSizes = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 26,
  h1: 28,
  h2: 22,
  h3: 18,
};

const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const colorPalette = {
  appBg: '#F8F9FB',
  surface: '#FFFFFF',
  primary: '#6B5CE7',
  primaryDark: '#4F45C8',
  primarySoft: '#EEEBFE',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFF4E0',
  danger: '#E11D48',
  dangerSoft: '#FFE4E8',
  ink: '#2D3142',
  inkMuted: '#6B7280',
  outline: '#E8EAED',
  white: '#FFFFFF',
  card1_base: '#6B5CE7',
  card2_base: '#22C55E',
  card3_base: '#F59E0B',
  card4_base: '#3B82F6',
  card5_base: '#EC4899',
  card1_alpha: '#EEEBFE',
  card2_alpha: '#E8F8EE',
  card3_alpha: '#FFF4E0',
  card4_alpha: '#E8F1FE',
  card5_alpha: '#FDE8F3',
};

const borderRadius = {
  sm: 10,
  md: 16,
  lg: 20,
  full: 9999,
};

const borderWidth = {
  thin: 1,
  thick: 2,
};

const padding = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
};

const margin = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
};

const paperLight = PaperLightTheme.colors;

export const lightTheme: AppTheme = {
  ...PaperLightTheme,
  palette: colorPalette,
  colors: {
    ...paperLight,
    primary: colorPalette.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colorPalette.primarySoft,
    onPrimaryContainer: colorPalette.primaryDark,
    secondary: colorPalette.warning,
    onSecondary: '#1C1917',
    secondaryContainer: colorPalette.warningSoft,
    onSecondaryContainer: '#92400E',
    tertiary: '#0EA5E9',
    background: colorPalette.appBg,
    onBackground: colorPalette.ink,
    surface: colorPalette.surface,
    onSurface: colorPalette.ink,
    surfaceVariant: colorPalette.outline,
    onSurfaceVariant: colorPalette.inkMuted,
    outline: '#E6E8EE',
    outlineVariant: colorPalette.outline,
    error: colorPalette.danger,
    onError: '#FFFFFF',
    errorContainer: colorPalette.dangerSoft,
    onErrorContainer: '#991B1B',
    text: colorPalette.ink,
    disabled: '#94A3B8',
    border: colorPalette.outline,
    grey: '#CBD5E1',
    darkgrey: '#475569',
    card: colorPalette.surface,
    secondaryText: colorPalette.inkMuted,
    iconHighlight: colorPalette.primary,
    iconNotFound: '#CBD5E1',
    elevation: {
      ...paperLight.elevation,
      level1: '#E8EEF5',
    },
    success: colorPalette.success,
    warning: colorPalette.warning,
    surfaceMuted: colorPalette.primarySoft,
    accent: colorPalette.warning,
    hero: colorPalette.primaryDark,
  },
  fontSizes,
  spacing,
  borderRadius,
  borderWidth,
  padding,
  margin,
};

const paperDark = PaperDarkTheme.colors;

export const darkTheme: AppTheme = {
  ...PaperDarkTheme,
  palette: colorPalette,
  colors: {
    ...paperDark,
    primary: '#8B7CFF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#2A2554',
    onPrimaryContainer: '#EEEBFE',
    secondary: '#FBBF24',
    onSecondary: '#0F172A',
    secondaryContainer: '#78350F',
    onSecondaryContainer: '#FEF3C7',
    background: '#101018',
    onBackground: '#F4F3FA',
    surface: '#1A1A26',
    onSurface: '#F4F3FA',
    surfaceVariant: '#2A2A3C',
    onSurfaceVariant: '#B0ABC8',
    outline: '#2E2E42',
    outlineVariant: '#2A2A3C',
    error: '#F87171',
    onError: '#450A0A',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FECACA',
    text: '#F1F5F9',
    disabled: '#64748B',
    border: '#334155',
    grey: '#475569',
    darkgrey: '#94A3B8',
    card: '#1A1A26',
    secondaryText: '#B0ABC8',
    iconHighlight: '#8B7CFF',
    iconNotFound: '#475569',
    elevation: {
      ...paperDark.elevation,
      level1: '#0F172A',
    },
    success: '#4ADE80',
    warning: '#FBBF24',
    surfaceMuted: '#1E3A5F',
    accent: '#FBBF24',
    hero: '#4A40C4',
  },
  fontSizes,
  spacing,
  borderRadius,
  borderWidth,
  padding,
  margin,
};
