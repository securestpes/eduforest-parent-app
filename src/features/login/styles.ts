import { StyleSheet } from 'react-native';
import { AppTheme } from '../../theme';

const LOGIN_LIGHT = {
  sky: '#5B67F0',
  edu: '#C8F25A',
  forest: '#FFFFFF',
  heading: '#1A237E',
  parents: '#3D5AFE',
  body: '#6B7280',
  field: '#F0F3FA',
  fieldText: '#1F2937',
  placeholder: '#9CA3AF',
  icon: '#5B5CE6',
  link: '#3D5AFE',
  googleBorder: '#E5E7EB',
  leaf: '#8DC63F',
  screen: '#FFFFFF',
  card: '#FFFFFF',
  modal: '#FFFFFF',
  schoolActive: '#E0E7FF',
  error: '#DC2626',
};

const LOGIN_DARK = {
  sky: '#3D3A8C',
  edu: '#C8F25A',
  forest: '#FFFFFF',
  heading: '#F4F3FA',
  parents: '#A78BFA',
  body: '#B0ABC8',
  field: '#222232',
  fieldText: '#F4F3FA',
  placeholder: '#7E7A98',
  icon: '#8B7CFF',
  link: '#A78BFA',
  googleBorder: '#2E2E42',
  leaf: '#86C44A',
  screen: '#101018',
  card: '#1A1A26',
  modal: '#1A1A26',
  schoolActive: '#2A2554',
  error: '#F87171',
};

export type LoginColors = typeof LOGIN_LIGHT;

export function getLoginColors(isDark: boolean): LoginColors {
  return isDark ? LOGIN_DARK : LOGIN_LIGHT;
}

/** Light palette kept for screens that have not switched to `getLoginColors`. */
export const LOGIN_COLORS = LOGIN_LIGHT;

export const LOGIN_GRADIENT = ['#4F86FF', '#7B5CFF'] as const;
export const LOGIN_GRADIENT_DARK = ['#5B4FE0', '#7C6CFF'] as const;

export const createStyles = (theme: AppTheme) => {
  const c = getLoginColors(Boolean(theme.dark));
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      borderWidth: 1,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      borderWidth: 1,
    },
    loginHeading: {
      fontSize: theme.fontSizes.h1,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
    },
    loginSubHeading: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginBottom: 10,
    },
    mobileNumberContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    mobileNumberText: {
      fontWeight: 'bold',
      marginRight: 10,
      fontSize: theme.fontSizes.md,
    },
    verifyLoginHeading: {
      fontSize: theme.fontSizes.h1,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
    },
    verifyLoginSubHeading: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginBottom: 10,
    },
    changeMobiletext: {
      fontSize: theme.fontSizes.md,
    },
    screen: {
      flex: 1,
      backgroundColor: c.screen,
    },
    keyboardWrap: {
      flex: 1,
      backgroundColor: c.screen,
    },
    hero: {
      overflow: 'hidden',
      backgroundColor: c.sky,
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    heroSafe: {
      flex: 1,
      paddingHorizontal: 18,
      justifyContent: 'flex-start',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandLogoWrap: {
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.92)',
    },
    brandLogo: {
      width: '160%',
      height: '160%',
    },
    brandCopy: {
      flex: 1,
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    brandEdu: {
      color: c.edu,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 0.2,
      textShadowColor: 'rgba(30, 40, 120, 0.28)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    brandForest: {
      color: c.forest,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 0.2,
      textShadowColor: 'rgba(30, 40, 120, 0.28)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    brandApp: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginTop: 2,
      textShadowColor: 'rgba(30, 40, 120, 0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    brandRule: {
      marginTop: 6,
      width: 96,
      height: 1.5,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    brandTagline: {
      marginTop: 6,
      color: 'rgba(255,255,255,0.96)',
      fontSize: 12.5,
      fontWeight: '500',
      textShadowColor: 'rgba(30, 40, 120, 0.22)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderTopLeftRadius: 48,
      borderTopRightRadius: 48,
      paddingHorizontal: 24,
      paddingTop: 28,
    },
    cardScroll: {
      flexGrow: 1,
    },
    welcomeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
    },
    welcome: {
      fontSize: 24,
      fontWeight: '800',
      color: c.heading,
    },
    welcomeParents: {
      fontSize: 24,
      fontWeight: '800',
      color: c.parents,
    },
    cardSubtitle: {
      marginTop: 8,
      marginBottom: 24,
      fontSize: 14,
      lineHeight: 21,
      color: c.body,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.field,
      borderRadius: 16,
      minHeight: 54,
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    fieldError: {
      borderWidth: 1,
      borderColor: c.error,
    },
    fieldInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: c.fieldText,
      paddingVertical: 12,
    },
    fieldText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: c.fieldText,
      paddingVertical: 16,
    },
    fieldPlaceholder: {
      color: c.placeholder,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.modal,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.heading,
      marginBottom: 12,
    },
    schoolOption: {
      minHeight: 48,
      borderRadius: 14,
      paddingHorizontal: 14,
      justifyContent: 'center',
      marginBottom: 8,
      backgroundColor: c.field,
    },
    schoolOptionActive: {
      backgroundColor: c.schoolActive,
    },
    schoolOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.fieldText,
    },
    errorText: {
      color: c.error,
      fontSize: 12,
      marginTop: -6,
      marginBottom: 8,
      marginLeft: 4,
    },
    formError: {
      color: c.error,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
      textAlign: 'center',
    },
    forgot: {
      alignSelf: 'flex-end',
      marginBottom: 18,
      marginTop: -2,
    },
    forgotText: {
      color: c.link,
      fontSize: 14,
      fontWeight: '700',
    },
    loginBtn: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    loginBtnDisabled: {
      opacity: 0.72,
    },
    loginBtnInner: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loginBtnText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
    },
    orRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
      gap: 12,
    },
    orLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: '#D1D5DB',
    },
    orText: {
      color: '#9CA3AF',
      fontSize: 13,
    },
    googleBtn: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.googleBorder,
      backgroundColor: c.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    googleMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleMarkText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#4285F4',
    },
    googleText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.fieldText,
    },
    footer: {
      marginTop: 26,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerMuted: {
      fontSize: 14,
      color: c.body,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '800',
      color: c.link,
    },
    legal: {
      marginTop: 16,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      color: c.body,
    },
    legalLink: {
      color: c.link,
      textDecorationLine: 'underline',
    },
    hintText: {
      marginTop: -4,
      marginBottom: 14,
      fontSize: 12,
      lineHeight: 17,
      color: c.body,
    },
    ghostBtn: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    ghostBtnText: {
      color: c.link,
      fontSize: 14,
      fontWeight: '700',
    },
    leafBl: {
      position: 'absolute',
      left: 4,
      bottom: 8,
      opacity: 0.55,
      transform: [{ rotate: '-25deg' }],
    },
    leafBr: {
      position: 'absolute',
      right: 4,
      bottom: 8,
      opacity: 0.55,
      transform: [{ rotate: '25deg' }],
    },
  });
};
