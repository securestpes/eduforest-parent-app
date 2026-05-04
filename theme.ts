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
  appBg: '#F4F7FC',
  surface: '#FFFFFF',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primarySoft: '#DBEAFE',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  ink: '#1E293B',
  inkMuted: '#64748B',
  outline: '#E2E8F0',
  white: '#FFFFFF',
  card1_base: '#3B82F6',
  card2_base: '#22C55E',
  card3_base: '#F59E0B',
  card4_base: '#8B5CF6',
  card5_base: '#EC4899',
  card1_alpha: '#EFF6FF',
  card2_alpha: '#DCFCE7',
  card3_alpha: '#FEF3C7',
  card4_alpha: '#F5F3FF',
  card5_alpha: '#FDF2F8',
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
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
    outline: '#CBD5E1',
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
    primary: '#60A5FA',
    onPrimary: '#0F172A',
    primaryContainer: '#1E3A5F',
    onPrimaryContainer: '#DBEAFE',
    secondary: '#FBBF24',
    onSecondary: '#0F172A',
    secondaryContainer: '#78350F',
    onSecondaryContainer: '#FEF3C7',
    background: '#0F172A',
    onBackground: '#F1F5F9',
    surface: '#1E293B',
    onSurface: '#F1F5F9',
    surfaceVariant: '#334155',
    onSurfaceVariant: '#94A3B8',
    outline: '#475569',
    outlineVariant: '#334155',
    error: '#F87171',
    onError: '#450A0A',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FECACA',
    text: '#F1F5F9',
    disabled: '#64748B',
    border: '#334155',
    grey: '#475569',
    darkgrey: '#94A3B8',
    card: '#1E293B',
    secondaryText: '#94A3B8',
    iconHighlight: '#60A5FA',
    iconNotFound: '#475569',
    elevation: {
      ...paperDark.elevation,
      level1: '#0F172A',
    },
    success: '#4ADE80',
    warning: '#FBBF24',
    surfaceMuted: '#1E3A5F',
    accent: '#FBBF24',
    hero: '#1D4ED8',
  },
  fontSizes,
  spacing,
  borderRadius,
  borderWidth,
  padding,
  margin,
};
