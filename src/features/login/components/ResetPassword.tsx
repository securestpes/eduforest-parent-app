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
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppLanguage, useAppTheme, localStorageKeys } from '../../../common';
import { createStyles, getLoginColors, LOGIN_GRADIENT, LOGIN_GRADIENT_DARK } from '../styles';
import { AuthService } from '../services';
import { logout, passwordResetCompleted } from '../slices/authSlice';
import type { RootState } from '../../../redux/store';
import { AuthScreenShell } from './AuthScreenShell';

export const ResetPassword: React.FC = () => {
  const { t } = useAppLanguage();
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme);
  const loginColors = getLoginColors(isDark);
  const loginGradient = isDark ? LOGIN_GRADIENT_DARK : LOGIN_GRADIENT;
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (password !== confirm) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    if (user?.mobile && password === user.mobile) {
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
      const response = await AuthService.changePassword(password);
      if (!response.status) {
        setError(response.message || t('auth.couldNotSavePassword'));
        return;
      }
      await AsyncStorage.removeItem(localStorageKeys.MUST_RESET_PASSWORD);
      dispatch(passwordResetCompleted());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.couldNotSavePassword'));
    } finally {
      setIsLoading(false);
    }
  };

  const useDifferentNumber = async () => {
    await AuthService.clearLocalSession();
    dispatch(logout());
  };

  return (
    <AuthScreenShell>
      <Text style={styles.welcome}>{t('auth.setPasswordTitle')}</Text>
      <Text style={styles.cardSubtitle}>{t('auth.setPasswordBody')}</Text>

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
        style={styles.loginBtn}
        onPress={() => void submit()}
        disabled={isLoading || password.length < 6 || confirm.length < 6}
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
            <Text style={styles.loginBtnText}>{t('auth.savePassword')}</Text>
          )}
        </LinearGradient>
      </Pressable>

      <Pressable style={styles.ghostBtn} onPress={() => void useDifferentNumber()}>
        <Text style={styles.ghostBtnText}>{t('auth.useDifferentNumber')}</Text>
      </Pressable>
    </AuthScreenShell>
  );
};
