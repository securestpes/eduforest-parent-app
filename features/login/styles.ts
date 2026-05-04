import { StyleSheet } from 'react-native';
import { AppTheme } from '../../theme';

export const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
  });
