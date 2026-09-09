import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StackScreenProps } from '@react-navigation/stack';
import { useAppLanguage, useAppTheme } from '../../../common';
import { createStyles, LOGIN_COLORS, LOGIN_GRADIENT } from '../styles';
import { AuthService } from '../services';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { AuthScreenShell } from './AuthScreenShell';

type Props = StackScreenProps<RootStackParamList, 'ForgotPassword'>;

function digitsOf(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export const ForgotPassword: React.FC<Props> = ({ navigation }) => {
  const { t } = useAppLanguage();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const submitReset = async () => {
    if (password !== confirm) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    if (password === mobile10) {
      setError(t('auth.passwordNotMobile'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordHint'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.resetPasswordWithOtp({
        mobile: mobile10,
        otp: otp.trim(),
        newPassword: password,
      });
      if (!response.status) {
        setError(response.message || t('auth.couldNotReset'));
        return;
      }
      Alert.alert(t('auth.passwordUpdated'), '', [
        {
          text: t('common.ok'),
          onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ], { cancelable: false });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.couldNotReset'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenShell>
      <Text style={styles.welcome}>{t('auth.forgotTitle')}</Text>
      <Text style={styles.cardSubtitle}>{t('auth.forgotBody')}</Text>

      {step === 'mobile' ? (
        <>
          <View style={[styles.field, error ? styles.fieldError : null]}>
            <MaterialCommunityIcons
              name="cellphone"
              size={22}
              color={LOGIN_COLORS.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={mobile}
              onChangeText={(value) => {
                setMobile(digitsOf(value));
                if (error) setError(null);
              }}
              placeholder={t('login.mobileLabel')}
              placeholderTextColor="#9CA3AF"
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
              colors={[...LOGIN_GRADIENT]}
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
          <View style={styles.field}>
            <MaterialCommunityIcons
              name="shield-key-outline"
              size={22}
              color={LOGIN_COLORS.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={otp}
              onChangeText={(value) => {
                setOtp(value.replace(/\D/g, '').slice(0, 6));
                if (error) setError(null);
              }}
              placeholder={t('auth.otpPlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.field}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={22}
              color={LOGIN_COLORS.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError(null);
              }}
              placeholder={t('auth.newPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={hidePassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setHidePassword((v) => !v)} hitSlop={8}>
              <MaterialCommunityIcons
                name={hidePassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#9CA3AF"
              />
            </Pressable>
          </View>
          <View style={styles.field}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={22}
              color={LOGIN_COLORS.icon}
            />
            <RNTextInput
              style={styles.fieldInput}
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                if (error) setError(null);
              }}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={hidePassword}
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.hintText}>{t('auth.passwordHint')}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={styles.loginBtn}
            onPress={() => void submitReset()}
            disabled={
              isLoading ||
              otp.trim().length !== 6 ||
              password.length < 6 ||
              confirm.length < 6
            }
          >
            <LinearGradient
              colors={[...LOGIN_GRADIENT]}
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
  );
};
