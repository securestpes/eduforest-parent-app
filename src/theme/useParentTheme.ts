import { useAppTheme } from '../common/contexts/ThemeContext';
import { parentDarkTheme, parentLightTheme, type ParentHomeTheme } from './parentHomeTheme';

/** Resolves the Home design system to the current light/dark preference. */
export function useParentTheme(): ParentHomeTheme {
  const { isDark } = useAppTheme();
  return isDark ? parentDarkTheme : parentLightTheme;
}
