import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import { useAppLanguage, useAppTheme } from '../../../common';
import type { AppTheme } from '../../../theme';

export const AppInfoFooter = () => {
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();
  const styles = createStyles(theme);
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const versionText = `${t('footer.versionLabel')} ${version}`;

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{versionText}</Text>
      <Text style={styles.footerText}>{t('footer.copyright')}</Text>
      <Text
        style={styles.footerLink}
        onPress={() => Linking.openURL('https://eduforest.co.in')}
      >
        {t('footer.visitWebsite')}
      </Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    footer: {
      alignItems: 'center',
      marginTop: theme.margin.xl,
      marginBottom: theme.margin.lg,
      gap: 6,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
    footerLink: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });
