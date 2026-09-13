import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  StatusPopup,
  useAppLanguage,
  useAppTheme,
  type IApiResponse,
  type StatusPopupVariant,
} from '../../../common';
import { createStyles, getLoginColors, LOGIN_GRADIENT, LOGIN_GRADIENT_DARK } from '../styles';
import { AuthService } from '../services';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { AuthScreenShell } from './AuthScreenShell';

type Props = StackScreenProps<RootStackParamList, 'ForgotPassword'>;

function digitsOf(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function isApiSuccess(response: IApiResponse | null | undefined): boolean {
  return response?.status === true;
}

function messageFromApi(response: unknown, fallback: string): string {
  if (!response || typeof response !== 'object') {
    return fallback;
  }
  const rec = response as Record<string, unknown>;
  if (typeof rec.message === 'string' && rec.message.trim()) {
    return rec.message.trim();
  }
  const nested = rec.data;
  if (nested && typeof nested === 'object') {
    const data = nested as Record<string, unknown>;
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
  }
  return fallback;
}

function messageFromUnknown(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    const data = (rec.response as { data?: unknown } | undefined)?.data;
    const fromBody = messageFromApi(data, '');
    if (fromBody) {
      return fromBody;
    }
    if (typeof rec.message === 'string' && rec.message.trim()) {
      return rec.message.trim();
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

function looksLikeOtpError(message: string): boolean {
  return /otp/i.test(message);
}

export const ForgotPassword: React.FC<Props> = ({ navigation }) => {
  const { t } = useAppLanguage();
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme);
  const loginColors = getLoginColors(isDark);
  const loginGradient = isDark ? LOGIN_GRADIENT_DARK : LOGIN_GRADIENT;
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpFieldError, setOtpFieldError] = useState(false);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
    message?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mobile10 = digitsOf(mobile);

  const sendOtp = async () => {
    if (mobile10.length !== 10) {
      setError(t('login.mobileInvalid'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.requestForgotPasswordOtp(mobile10);
      if (!response.status) {
        setError(response.message || t('auth.couldNotSendOtp'));
        return;
      }
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.couldNotSendOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  const showError = (title: string, otpInvalid = false) => {
    setError(title);
    setOtpFieldError(otpInvalid);
    setStatus({ variant: 'error', title });
  };

  const goToLogin = () => {
    setStatus(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const submitReset = async () => {
    const otpDigits = otp.trim();
    if (otpDigits.length !== 6) {
      showError(t('auth.otpRequired'), true);
      return;
    }
    if (password !== confirm) {
      showError(t('auth.passwordsMismatch'));
      return;
    }
    if (password === mobile10) {
      showError(t('auth.passwordNotMobile'));
      return;
    }
    if (password.length < 6) {
      showError(t('auth.passwordHint'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setOtpFieldError(false);
    try {
      const response = await AuthService.resetPasswordWithOtp({
        mobile: mobile10,
        otp: otpDigits,
        newPassword: password,
      });
      if (!isApiSuccess(response)) {
        const apiMessage = messageFromApi(response, t('auth.couldNotReset'));
        const otpInvalid = looksLikeOtpError(apiMessage);
        showError(otpInvalid ? t('auth.invalidOtp') : apiMessage, otpInvalid);
        return;
      }
      setStatus({
        variant: 'success',
        title: t('auth.passwordUpdatedTitle'),
        message: t('auth.passwordUpdatedBody'),
      });
    } catch (err: unknown) {
      const apiMessage = messageFromUnknown(err, t('auth.couldNotReset'));
      const otpInvalid = looksLikeOtpError(apiMessage);
      showError(otpInvalid ? t('auth.invalidOtp') : apiMessage, otpInvalid);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <AuthScreenShell>
      <Text style={styles.welcome}>{t('auth.forgotTitle')}</Text>
      <Text style={styles.cardSubtitle}>{t('auth.forgotBody')}</Text>

      {step === 'mobile' ? (
        <>
          <View style={[styles.field, error ? styles.fieldError : null]}>
            <MaterialCommunityIcons
              name="cellphone"
              size={22}
              color={loginColors.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={mobile}
              onChangeText={(value) => {
                setMobile(digitsOf(value));
                if (error) setError(null);
              }}
              placeholder={t('login.mobileLabel')}
              placeholderTextColor={loginColors.placeholder}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={styles.loginBtn}
            onPress={() => void sendOtp()}
            disabled={isLoading || mobile10.length !== 10}
          >
            <LinearGradient
              colors={[...loginGradient]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.loginBtnInner}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>{t('auth.sendOtp')}</Text>
              )}
            </LinearGradient>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hintText}>{t('auth.otpSentTo', { mobile: mobile10 })}</Text>
          <View style={[styles.field, otpFieldError ? styles.fieldError : null]}>
            <MaterialCommunityIcons
              name="shield-key-outline"
              size={22}
              color={loginColors.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={otp}
              onChangeText={(value) => {
                setOtp(value.replace(/\D/g, '').slice(0, 6));
                if (error) setError(null);
                if (otpFieldError) setOtpFieldError(false);
              }}
              placeholder={t('auth.otpPlaceholder')}
              placeholderTextColor={loginColors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.field}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={22}
              color={loginColors.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError(null);
              }}
              placeholder={t('auth.newPassword')}
              placeholderTextColor={loginColors.placeholder}
              secureTextEntry={hidePassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setHidePassword((v) => !v)} hitSlop={8}>
              <MaterialCommunityIcons
                name={hidePassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={loginColors.placeholder}
              />
            </Pressable>
          </View>
          <View style={styles.field}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={22}
              color={loginColors.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                if (error) setError(null);
              }}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={loginColors.placeholder}
              secureTextEntry={hidePassword}
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.hintText}>{t('auth.passwordHint')}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.loginBtn, isLoading ? { opacity: 0.7 } : null]}
            onPress={() => void submitReset()}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[...loginGradient]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.loginBtnInner}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>{t('auth.resetPassword')}</Text>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={() => {
              setStep('mobile');
              setOtp('');
              setError(null);
              setOtpFieldError(false);
              setStatus(null);
            }}
          >
            <Text style={styles.ghostBtnText}>{t('auth.changeNumber')}</Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.ghostBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.ghostBtnText}>{t('auth.backSignIn')}</Text>
      </Pressable>
    </AuthScreenShell>
    <StatusPopup
      visible={status != null}
      variant={status?.variant}
      title={status?.title ?? ''}
      message={status?.message}
      onDismiss={() => {
        if (status?.variant === 'success') {
          goToLogin();
          return;
        }
        setStatus(null);
      }}
    />
    </>
  );
};
