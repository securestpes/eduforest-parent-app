import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Keyboard,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  createAppStyles,
  Link,
  useAppTheme,
  useAppLanguage,
  localStorageKeys,
  StyledButton,
  useNetworkError,
  getFirebaseErrorKey,
} from '../../../common';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { createStyles } from '../styles';
import { OtpTimer } from './OtpTimer';
import {
  AuthService,
  firebasePhoneMatchesIndiaLocal,
  subscribeFirebasePhoneAutoOtp,
} from '../services';
import auth from '@react-native-firebase/auth';
import { loginSuccess } from '../slices/authSlice';
import {
  mapParentMeToUser,
  ParentProfileService,
} from '../../profile/services/ParentProfileService';
import { registerParentPushToken } from '../../../services/push';
import { SHOW_FIREBASE_OTP_VERIFY_DEBUG } from '../../../../config/firebaseLogin';

const LocalOTPInputs = React.forwardRef(
  (
    {
      value,
      onChangeOTP,
      autoFocus,
      length = 6,
      gap = 8,
    }: {
      value: string;
      onChangeOTP: (v: string) => void;
      autoFocus?: boolean;
      length?: number;
      gap?: number;
    },
    ref: React.Ref<{ reset: () => void }>
  ) => {
    const [containerWidth, setContainerWidth] = React.useState<number>(
      Dimensions.get('window').width
    );
    const { theme } = useAppTheme();
    const inputsRef = React.useRef<Array<TextInput | null>>([]);
    const digits = value ? value.split('').slice(0, length) : [];

    React.useImperativeHandle(ref, () => ({
      reset: () => {
        onChangeOTP('');
        inputsRef.current.forEach((input) => input && input.clear());
        if (inputsRef.current[0]) inputsRef.current[0].focus();
      },
    }));

    const handleChange = (text: string, idx: number) => {
      const char = text.slice(-1).replace(/[^0-9]/g, '');
      const arr = new Array(length).fill('');
      for (let i = 0; i < length; i++) {
        arr[i] = digits[i] || '';
      }
      arr[idx] = char;
      if (text.length > 1) {
        const remaining = text.replace(/[^0-9]/g, '').split('');
        for (let j = 0; j < remaining.length && idx + j < length; j++) {
          arr[idx + j] = remaining[j];
        }
      }
      const newVal = arr.join('');
      onChangeOTP(newVal);
      const nextIndex = idx + (char ? 1 : 0);
      if (char && nextIndex < length && inputsRef.current[nextIndex]) {
        inputsRef.current[nextIndex]!.focus();
      }
    };

    const handleKeyPress = (
      { nativeEvent }: { nativeEvent: { key: string } },
      idx: number
    ) => {
      if (nativeEvent.key === 'Backspace') {
        if (!digits[idx] && idx > 0 && inputsRef.current[idx - 1]) {
          inputsRef.current[idx - 1]!.focus();
        }
      }
    };

    const available = containerWidth;
    const totalGaps = gap * (length - 1);
    const boxWidth = Math.max(36, Math.floor((available - totalGaps) / length));

    return (
      <View
        style={{ width: '100%', marginBottom: theme.margin.sm }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {new Array(length).fill(0).map((_, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={digits[i] || ''}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              maxLength={length === 1 ? 1 : 1}
              style={{
                width: boxWidth,
                height: 48,
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: theme.borderRadius.md,
                textAlign: 'center',
                fontSize: 18,
                padding: 0,
                marginRight: i === length - 1 ? 0 : gap,
                backgroundColor: theme.colors.surface,
              }}
              autoFocus={Boolean(autoFocus && i === 0)}
              returnKeyType="done"
              importantForAutofill="no"
            />
          ))}
        </View>
      </View>
    );
  }
);

LocalOTPInputs.displayName = 'LocalOTPInputs';

type Props = StackScreenProps<RootStackParamList, 'VerifyLogin'>;

export const VerifyLogin: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useAppLanguage();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState<string>(() => route.params.prefilledOtp ?? '');
  const { theme } = useAppTheme();
  const appStyles = createAppStyles(theme);
  const styles = createStyles(theme);
  const [canResend, setCanResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpResending, setIsOtpResending] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string>(
    () => route.params.verificationId ?? ''
  );
  const [afterResend, setAfterResend] = useState(false);

  const loginCompletedRef = useRef(false);
  const manualVerifyStartedRef = useRef(false);

  const { isConnected } = useNetworkError(networkError);

  useEffect(() => {
    if (isConnected === true && networkError) {
      setNetworkError(null);
    }
  }, [isConnected, networkError]);

  useEffect(() => {
    if (route.params.verificationId) {
      setVerificationId(route.params.verificationId);
    }
  }, [route.params.verificationId]);

  useEffect(() => {
    const p = route.params.prefilledOtp?.replace(/\D/g, '') ?? '';
    if (p.length === 6) {
      setOtp(p);
    }
  }, [route.params.prefilledOtp]);

  useEffect(() => {
    const mobile = route.params.mobileNumber ?? '';
    const unsub = subscribeFirebasePhoneAutoOtp(({ code, mobile: m }) => {
      if (m !== mobile) {
        return;
      }
      const digits = code.replace(/\D/g, '');
      if (digits.length === 6) {
        setOtp(digits);
      }
    });
    return unsub;
  }, [route.params.mobileNumber]);

  const finalizeBackendFromFirebaseUser = useCallback(async () => {
    if (loginCompletedRef.current) {
      return;
    }
    loginCompletedRef.current = true;

    const mobile = route.params.mobileNumber ?? '';

    try {
      const user = auth().currentUser;
      if (!user) {
        loginCompletedRef.current = false;
        setErrorMessage(t('verifyOtp.unexpected'));
        return;
      }
      const idToken = await user.getIdToken(true);
      if (!idToken) {
        loginCompletedRef.current = false;
        setErrorMessage(t('verifyOtp.unexpected'));
        return;
      }

      if (SHOW_FIREBASE_OTP_VERIFY_DEBUG) {
        console.log('[VerifyLogin] parent verify-otp', {
          mobile,
          hasToken: Boolean(idToken),
        });
      }

      const response = await AuthService.verifyOtp({
        mobile,
        firebaseIdToken: idToken,
      });

      if (
        response.status &&
        response.data &&
        typeof response.data === 'object'
      ) {
        const data = response.data as { accessToken?: string };
        if (data.accessToken) {
          await AsyncStorage.setItem(
            localStorageKeys.ACCESS_TOKEN,
            data.accessToken
          );
          await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
          const userResponse = await ParentProfileService.getUser();
          if (userResponse?.status && userResponse.data) {
            dispatch(
              loginSuccess(
                mapParentMeToUser(userResponse.data as Record<string, unknown>)
              )
            );
            await registerParentPushToken(data.accessToken);
          } else {
            loginCompletedRef.current = false;
            setErrorMessage(userResponse?.message || t('verifyOtp.unexpected'));
          }
        } else {
          loginCompletedRef.current = false;
          setErrorMessage(t('verifyOtp.failed'));
        }
      } else {
        loginCompletedRef.current = false;
        setErrorMessage(response.message || t('verifyOtp.failed'));
      }
    } catch (error: unknown) {
      loginCompletedRef.current = false;
      if (SHOW_FIREBASE_OTP_VERIFY_DEBUG) {
        console.log(
          '[VerifyLogin] finalize error',
          error instanceof Error ? error.message : error
        );
      }
      const key = getFirebaseErrorKey(error) as Parameters<typeof t>[0];
      setErrorMessage(t(key));
      if (key === 'verifyOtp.unexpected') {
        setNetworkError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [dispatch, route.params.mobileNumber, t]);

  const completePhoneAuthWithLoading = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await finalizeBackendFromFirebaseUser();
    } finally {
      setIsLoading(false);
    }
  }, [finalizeBackendFromFirebaseUser]);

  useEffect(() => {
    if (route.params.phoneAuthMethodHint !== 'instant' || afterResend) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < 25; i++) {
        if (cancelled) {
          return;
        }
        const user = auth().currentUser;
        if (
          user &&
          firebasePhoneMatchesIndiaLocal(
            user.phoneNumber,
            route.params.mobileNumber
          )
        ) {
          await completePhoneAuthWithLoading();
          return;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    afterResend,
    completePhoneAuthWithLoading,
    route.params.mobileNumber,
    route.params.phoneAuthMethodHint,
  ]);

  useEffect(() => {
    if (route.params.phoneAuthMethodHint === 'instant' && !afterResend) {
      return () => {};
    }
    const unsub = auth().onAuthStateChanged((user) => {
      if (loginCompletedRef.current || manualVerifyStartedRef.current) {
        return;
      }
      if (!user?.phoneNumber) {
        return;
      }
      if (
        !firebasePhoneMatchesIndiaLocal(
          user.phoneNumber,
          route.params.mobileNumber
        )
      ) {
        return;
      }
      void completePhoneAuthWithLoading();
    });
    return unsub;
  }, [
    afterResend,
    completePhoneAuthWithLoading,
    route.params.mobileNumber,
    route.params.phoneAuthMethodHint,
  ]);

  const otpInputRef = useRef<{ reset: () => void } | null>(null);

  const onPressOtpVerification = async () => {
    if (otp.length < 6) {
      setErrorMessage(t('verifyOtp.invalid'));
      return;
    }

    if (!verificationId) {
      setErrorMessage(t('verifyOtp.expiredOtp'));
      return;
    }

    manualVerifyStartedRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    if (SHOW_FIREBASE_OTP_VERIFY_DEBUG) {
      console.log('[VerifyLogin] manual verify', {
        mobile: route.params.mobileNumber,
        verificationId,
        smsCodeLength: otp.length,
      });
    }

    try {
      const fbResponse = await AuthService.firebaseVerifyOtp(
        verificationId,
        otp
      );

      if (!fbResponse.status) {
        manualVerifyStartedRef.current = false;
        setErrorMessage(fbResponse.message || t('verifyOtp.failed'));
        resetOtpFields();
        return;
      }

      await finalizeBackendFromFirebaseUser();
    } catch (error: unknown) {
      manualVerifyStartedRef.current = false;
      const key = getFirebaseErrorKey(error) as Parameters<typeof t>[0];
      setErrorMessage(t(key));
      if (key === 'verifyOtp.unexpected') {
        setNetworkError(error instanceof Error ? error.message : String(error));
      }
      resetOtpFields();
    } finally {
      setIsLoading(false);
    }
  };

  const resetOtpFields = () => {
    setOtp('');
    if (otpInputRef.current) {
      otpInputRef.current.reset();
    }
  };

  const onChangeOTP = (next: string) => {
    setOtp(next);
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const onPressChangeMobileNumber = () => {
    navigation.pop();
    resetOtpFields();
  };

  const onPressResendOtp = async () => {
    if (!canResend) return;

    setIsOtpResending(true);
    setErrorMessage(null);

    try {
      const confirmation = await AuthService.firebaseLoginWithMobile(
        route.params.mobileNumber,
        true
      );

      if (confirmation?.verificationId) {
        setAfterResend(true);
        setVerificationId(confirmation.verificationId);
        resetOtpFields();
        setCanResend(false);
        setSuccessMessage(t('verifyOtp.resentSuccess'));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(t('verifyOtp.resentFailed'));
      }
    } catch (error: unknown) {
      setErrorMessage(t('verifyOtp.resentError'));
      setNetworkError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsOtpResending(false);
    }
  };

  const resetCountDown = useCallback(() => {
    setCanResend(true);
  }, []);

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
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[appStyles.pageHPadding, { marginTop: 60 }]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={appStyles.appLogo}
              />
              <View style={{ marginTop: 60 }}>
                <Text style={styles.verifyLoginHeading}>
                  {t('verifyOtp.title')}
                </Text>
                <Text style={styles.verifyLoginSubHeading}>
                  {t('verifyOtp.subtitle')}
                </Text>
              </View>
              <View style={styles.mobileNumberContainer}>
                <Text style={styles.mobileNumberText}>
                  +91-{route.params.mobileNumber}
                </Text>
                <Link
                  onPress={onPressChangeMobileNumber}
                  style={styles.changeMobiletext}
                >
                  {t('common.change')}
                </Link>
              </View>

              <View style={[{ ...appStyles.form }, { marginTop: 20 }]}>
                <LocalOTPInputs
                  ref={otpInputRef}
                  onChangeOTP={onChangeOTP}
                  value={otp}
                  autoFocus
                />
                {errorMessage ? (
                  <Text style={{ color: theme.colors.error, marginBottom: 10 }}>
                    {errorMessage}
                  </Text>
                ) : null}
                {successMessage ? (
                  <Text
                    style={{ color: theme.colors.success, marginBottom: 10 }}
                  >
                    {successMessage}
                  </Text>
                ) : null}

                <StyledButton
                  mode="contained"
                  onPress={() => void onPressOtpVerification()}
                  disabled={isLoading}
                  loading={isLoading}
                  style={{ marginTop: theme.margin.md }}
                >
                  {t('verifyOtp.verify')}
                </StyledButton>

                <Link
                  style={{
                    alignSelf: 'flex-end',
                    marginTop: 10,
                    textDecorationLine: 'none',
                  }}
                  onPress={() => void onPressResendOtp()}
                  disabled={!canResend || isOtpResending}
                >
                  {canResend ? (
                    <Text>{t('verifyOtp.resend')}</Text>
                  ) : (
                    <Text>
                      {t('verifyOtp.resendIn')}{' '}
                      <OtpTimer initial={20} onCountdownEnd={resetCountDown} />{' '}
                      s
                    </Text>
                  )}
                </Link>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
