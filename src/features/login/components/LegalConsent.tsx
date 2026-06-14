import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox, Text } from 'react-native-paper';
import {
  createAppStyles,
  StyledButton,
  useAppLanguage,
  useAppTheme,
} from '../../../common';
import { legalWebUrls, localStorageKeys } from '../../../common/constants';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { createStyles as createLoginStyles } from '../styles';

type LegalConsentNav = StackNavigationProp<RootStackParamList, 'LegalConsent'>;

interface LegalConsentProps {
  navigation: LegalConsentNav;
}

export const LegalConsent: React.FC<LegalConsentProps> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();
  const appStyles = createAppStyles(theme);
  const styles = createLoginStyles(theme);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);

  const canContinue = acceptTerms && acceptPrivacy && !saving;

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    try {
      setSaving(true);
      await AsyncStorage.setItem(
        localStorageKeys.LEGAL_CONSENT_ACCEPTED,
        'true'
      );
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={appStyles.pageContainer} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={[appStyles.pageHPadding, { marginTop: 40 }]}>
          <Text style={styles.loginHeading}>{t('legalConsent.title')}</Text>
          <Text style={styles.loginSubHeading}>
            {t('legalConsent.subtitle')}
          </Text>

          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>
              {t('legalConsent.howWeUseInfo')}
            </Text>
            <Text
              style={{ color: theme.colors.secondaryText, marginBottom: 4 }}
            >
              {'\u2022'} {t('legalConsent.point1')}
            </Text>
            <Text
              style={{ color: theme.colors.secondaryText, marginBottom: 4 }}
            >
              {'\u2022'} {t('legalConsent.point2')}
            </Text>
            <Text
              style={{ color: theme.colors.secondaryText, marginBottom: 4 }}
            >
              {'\u2022'} {t('legalConsent.point3')}
            </Text>
            <Text style={{ color: theme.colors.secondaryText }}>
              {'\u2022'} {t('legalConsent.point4')}
            </Text>
          </View>

          <View style={{ marginTop: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Checkbox
                status={acceptTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptTerms((v) => !v)}
              />
              <Text style={{ flex: 1 }}>
                {t('legalConsent.acceptTerms.prefix')}{' '}
                <Text
                  style={{
                    color: theme.colors.primary,
                    textDecorationLine: 'underline',
                  }}
                  onPress={() =>
                    void handleOpenUrl(
                      'https://eduforest.co.in/terms-and-conditions?app=parent'
                    )
                  }
                >
                  {t('legalConsent.acceptTerms.link')}
                </Text>
                {t('legalConsent.acceptTerms.suffix')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Checkbox
                status={acceptPrivacy ? 'checked' : 'unchecked'}
                onPress={() => setAcceptPrivacy((v) => !v)}
              />
              <Text style={{ flex: 1 }}>
                {t('legalConsent.acceptPrivacy.prefix')}{' '}
                <Text
                  style={{
                    color: theme.colors.primary,
                    textDecorationLine: 'underline',
                  }}
                  onPress={() => void handleOpenUrl(legalWebUrls.privacyPolicy)}
                >
                  {t('legalConsent.acceptPrivacy.link')}
                </Text>
                {t('legalConsent.acceptPrivacy.suffix')}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 32 }}>
            <StyledButton
              mode="contained"
              onPress={() => void handleContinue()}
              disabled={!canContinue}
              loading={saving}
            >
              {t('common.continue')}
            </StyledButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
