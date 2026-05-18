import React, { useEffect, useState } from 'react';
import {
  Image,
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Pressable,
  Linking,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  createAppStyles,
  TextInput,
  useAppLanguage,
  useAppTheme,
  StyledButton,
  useNetworkError,
  getNetworkErrorMessage,
  getFirebaseErrorKey,
} from '../../../common';
import { createStyles } from '../styles';
import { AuthService, firebasePhoneMatchesIndiaLocal } from '../services';
import type { ILoginFormState } from '../interfaces';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { legalWebUrls } from '../../../common/constants';

const initialLoginState: ILoginFormState = {
  mobileNumber: {
    value: '',
    isValid: true,
    error: '',
  },
};

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export const Login: React.FC<Props> = ({ navigation }) => {
  const { t } = useAppLanguage();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const appStyles = createAppStyles(theme);
  const [formState, setFormState] = useState<ILoginFormState>(initialLoginState);
  const [error, setError] = useState<string | null>(null);
  const [nwError, setNwError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected } = useNetworkError(nwError);

  useEffect(() => {
    if (isConnected === true && nwError) {
      setNwError(null);
    }
  }, [isConnected, nwError]);

  const validateMobileNumber = (value: string) => {
    if (!value) {
      return {
        value,
        isValid: false,
        error: t('login.mobileRequired'),
      };
    }
    const isValidMobile = /^\d{10}$/.test(value);
    if (!isValidMobile) {
      return {
        value,
        isValid: false,
        error: t('login.mobileInvalid'),
      };
    }
    return {
      value,
      isValid: true,
      error: '',
    };
  };

  const handleMobileChange = (value: string) => {
    const validationResult = validateMobileNumber(value);
    if (validationResult) {
      setFormState((prevFormState) => ({
        ...prevFormState,
        mobileNumber: validationResult,
      }));
      if (error) {
        setError(null);
      }
    }
  };

  const handleLogin = async () => {
    const validationResult = validateMobileNumber(formState.mobileNumber.value);
    if (validationResult) {
      setFormState((prevFormState) => ({
        ...prevFormState,
        mobileNumber: { ...validationResult, isDirty: true },
      }));
      if (validationResult.isValid) {
        const netInfoState = await NetInfo.fetch();
        const hasInternet =
          netInfoState.isConnected && netInfoState.isInternetReachable !== false;

        if (!hasInternet) {
          setNwError(getNetworkErrorMessage());
          return;
        }

        setIsLoading(true);

        try {
          const tenDigit = formState.mobileNumber.value;
          const confirmation = await AuthService.firebaseLoginWithMobile(tenDigit);
          await new Promise((r) => setTimeout(r, 50));
          const userAfterSend = auth().currentUser;
          const verificationId = confirmation?.verificationId;
          const prefilledOtp = confirmation?.prefilledOtp;
          const instantHint = confirmation?.phoneAuthMethodHint === 'instant';

          if (
            userAfterSend &&
            firebasePhoneMatchesIndiaLocal(userAfterSend.phoneNumber, tenDigit)
          ) {
            navigation.navigate('VerifyLogin', {
              mobileNumber: tenDigit,
              verificationId: verificationId ?? '',
              phoneAuthMethodHint: 'instant',
              ...(prefilledOtp ? { prefilledOtp } : {}),
            });
            return;
          }

          if (instantHint && verificationId) {
            navigation.navigate('VerifyLogin', {
              mobileNumber: tenDigit,
              verificationId,
              phoneAuthMethodHint: 'instant',
              ...(prefilledOtp ? { prefilledOtp } : {}),
            });
            return;
          }

          if (verificationId) {
            navigation.navigate('VerifyLogin', {
              mobileNumber: tenDigit,
              verificationId,
              ...(prefilledOtp ? { prefilledOtp } : {}),
            });
          } else {
            setError(t('verifyOtp.unexpected'));
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('No Internet Connection')) {
            setNwError(getNetworkErrorMessage());
          } else {
            const key = getFirebaseErrorKey(err) as Parameters<typeof t>[0];
            setError(t(key));
          }
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <SafeAreaView style={[appStyles.pageContainer]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 10}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={Keyboard.dismiss}
          accessible={false}
          disabled={Platform.OS === 'web'}
        >
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[appStyles.pageHPadding, { marginTop: 60 }]}>
              <Image source={require('../../../assets/logo.png')} style={appStyles.appLogo} />
              <View style={{ marginTop: 60 }}>
                <Text style={styles.loginHeading}>{t('login.title')}</Text>
                <Text style={styles.loginSubHeading}>{t('login.subtitle')}</Text>
              </View>

              <View style={{ ...appStyles.form, marginTop: 20 }}>
                <TextInput
                  label={t('login.mobileLabel')}
                  value={formState.mobileNumber.value}
                  onChangeText={handleMobileChange}
                  keyboardType="numeric"
                  maxLength={10}
                  mode="outlined"
                  error={!formState?.mobileNumber.isValid}
                  errorText={formState?.mobileNumber.error || (error ?? '')}
                />

                <StyledButton
                  mode="contained"
                  onPress={() => void handleLogin()}
                  style={{ marginTop: theme.margin.md }}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {t('login.continue')}
                </StyledButton>

                <Text
                  style={{
                    marginTop: theme.margin.lg,
                    fontSize: 12,
                    lineHeight: 18,
                    textAlign: 'center',
                    color: theme.colors.secondaryText,
                  }}
                >
                  {t('login.legalPrefix')}{' '}
                  <Text
                    style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                    onPress={() => void Linking.openURL(legalWebUrls.termsAndConditions)}
                  >
                    {t('legalConsent.acceptTerms.link')}
                  </Text>
                  {t('login.legalMiddle')}
                  <Text
                    style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                    onPress={() => void Linking.openURL(legalWebUrls.privacyPolicy)}
                  >
                    {t('legalConsent.acceptPrivacy.link')}
                  </Text>
                  {t('login.legalSuffix')}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
