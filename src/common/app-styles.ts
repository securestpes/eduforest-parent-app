import { AppTheme } from '../theme';
import { StyleSheet } from 'react-native';

export const createAppStyles = (theme: AppTheme) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    pageHPadding: {
      paddingHorizontal: theme.padding.md,
    },
    sectionHeading: {
      marginVertical: theme.margin.md,
      fontSize: theme.fontSizes.h3,
      fontWeight: 'bold',
    },
    sectionSubHeading: {
      marginBottom: theme.margin.md,
      color: theme.colors.secondaryText,
      fontSize: theme.fontSizes.md,
    },
    label: {
      marginTop: theme.margin.md,
      marginBottom: theme.margin.sm,
    },
    containerDualTone: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      // borderWidth: 1,
    },
    upperBox: {
      height: '50%',
      backgroundColor: theme.colors.background,
      // borderWidth: 1,
    },
    upperBoxContainer: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      // borderWidth: 1,
    },
    appLogo: {
      width: 150,
      height: 150,
      alignSelf: 'center',
    },
    verifyImage: {
      width: 200,
      height: 200,
      marginBottom: 20,
      alignSelf: 'center',
    },
    lowerBox: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'white',
      height: '50%',
      // borderWidth: 1,
    },
    form: {
      marginHorizontal: 16,
    },
    loginform: {
      width: '100%',
      marginTop: 20,
      // borderWidth: 1,
    },
    heading3: {
      fontSize: theme.fontSizes.h3,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    heading2: {
      fontSize: theme.fontSizes.h2,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    heading1: {
      fontSize: theme.fontSizes.h1,
      fontWeight: 'bold',
      marginBottom: 10,
      lineHeight: 36,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 100,
    },
    emptyText: {
      fontSize: 16,
      color: '#6B7280',
      marginTop: 16,
    },
    emptySubText: {
      fontSize: 14,
      color: '#9CA3AF',
      marginTop: 4,
      textAlign: 'center',
    },
  });

// export default {
//   appCreateStyles: createStyles,
// };
