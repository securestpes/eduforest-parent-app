import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  useAppLanguage,
  useAppTheme,
  useNetworkError,
  getNetworkErrorMessage,
  localStorageKeys,
} from '../../../common';
import { createStyles, LOGIN_COLORS, LOGIN_GRADIENT } from '../styles';
import { AuthService } from '../services';
import { completeParentLogin } from '../services/completeParentLogin';
import type { ILoginFormState } from '../interfaces';
import type { RootStackParamList } from '../../../navigation/Navigation';
import type { AppDispatch } from '../../../redux/store';
import { AuthScreenShell } from './AuthScreenShell';

const initialLoginState: ILoginFormState = {
  mobileNumber: {
    value: '',
    isValid: true,
    error: '',
  },
};

type ParentSchoolOption = {
  schoolId: number;
  schoolName: string;
};

type Props = StackScreenProps<RootStackParamList, 'Login'>;

function digitsOf(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function parseSchools(raw: unknown): ParentSchoolOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ParentSchoolOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const r = item as Record<string, unknown>;
    const schoolId = Number(r.schoolId ?? r.clientId ?? 0);
    const schoolName =
      typeof r.schoolName === 'string'
        ? r.schoolName.trim()
        : typeof r.clientName === 'string'
          ? r.clientName.trim()
          : '';
    if (schoolId > 0 && schoolName) {
      rows.push({ schoolId, schoolName });
    }
  }
  return rows;
}

export const Login: React.FC<Props> = ({ navigation }) => {
  const { t } = useAppLanguage();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const dispatch = useDispatch<AppDispatch>();
  const [formState, setFormState] = useState<ILoginFormState>(initialLoginState);
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [nwError, setNwError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<ParentSchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<ParentSchoolOption | null>(
    null
  );
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);

  const { isConnected } = useNetworkError(nwError);

  useEffect(() => {
    if (isConnected === true && nwError) {
      setNwError(null);
    }
  }, [isConnected, nwError]);

  useEffect(() => {
    const digits = digitsOf(formState.mobileNumber.value);
    if (digits.length !== 10) {
      setSchools([]);
      setSelectedSchool(null);
      setSchoolError(null);
      setSchoolsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setSchoolsLoading(true);
        setSchoolError(null);
        try {
          const response = await AuthService.listSchoolsForMobile(digits);
          if (cancelled) {
            return;
          }
          const list = parseSchools(response.data);
          setSchools(list);
          if (list.length === 0) {
            setSelectedSchool(null);
            setSchoolError(response.message || t('login.noSchools'));
            return;
          }
          const lastRaw = await AsyncStorage.getItem(
            localStorageKeys.PARENT_LAST_SCHOOL_ID
          );
          const lastId = lastRaw ? Number(lastRaw) : NaN;
          const preferred =
            list.find((s) => s.schoolId === lastId) ??
            (list.length === 1 ? list[0] : null);
          setSelectedSchool(preferred);
        } catch (err: unknown) {
          if (cancelled) {
            return;
          }
          setSchools([]);
          setSelectedSchool(null);
          const message = err instanceof Error ? err.message : String(err);
          setSchoolError(message.replace(/^Could not load schools:\s*/, ''));
        } finally {
          if (!cancelled) {
            setSchoolsLoading(false);
          }
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formState.mobileNumber.value, t]);

  const validateMobileNumber = (value: string) => {
    const digits = digitsOf(value);
    if (!digits) {
      return {
        value,
        isValid: false,
        error: t('login.mobileRequired'),
      };
    }
    if (!/^\d{10}$/.test(digits)) {
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

  const handleIdentifierChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      mobileNumber: {
        value,
        isValid: true,
        error: '',
        isDirty: prev.mobileNumber.isDirty,
      },
    }));
    if (error) {
      setError(null);
    }
  };

  const handleLogin = async () => {
    const validationResult = validateMobileNumber(formState.mobileNumber.value);
    setFormState((prev) => ({
      ...prev,
      mobileNumber: { ...validationResult, isDirty: true },
    }));
    if (!validationResult.isValid) {
      return;
    }
    if (schoolsLoading) {
      return;
    }
    if (!selectedSchool) {
      if (schools.length > 1) {
        setSchoolError(t('login.schoolRequired'));
      }
      return;
    }
    if (!password.trim()) {
      setPasswordError(t('login.passwordRequired'));
      return;
    }
    setPasswordError(null);
    setSchoolError(null);

    const netInfoState = await NetInfo.fetch();
    const hasInternet =
      netInfoState.isConnected && netInfoState.isInternetReachable !== false;

    if (!hasInternet) {
      setNwError(getNetworkErrorMessage());
      return;
    }

    setIsLoading(true);
    const tenDigit = digitsOf(formState.mobileNumber.value);

    try {
      const response = await AuthService.passwordLogin(
        tenDigit,
        password.trim(),
        selectedSchool.schoolId
      );
      const result = await completeParentLogin(dispatch, response);
      if (!result.ok) {
        setError(result.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('No Internet Connection')) {
        setNwError(getNetworkErrorMessage());
      } else {
        setError(message.replace(/^Login failed:\s*/, '') || t('login.sendOtpFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fieldError = !formState.mobileNumber.isValid
    ? formState.mobileNumber.error
    : error;
  const schoolLabel = selectedSchool?.schoolName || t('login.schoolPlaceholder');
  const showSchoolPicker = schools.length > 1;

  return (
    <AuthScreenShell>
      <View style={styles.welcomeRow}>
        <Text style={styles.welcome}>{t('login.welcome')} </Text>
        <Text style={styles.welcomeParents}>{t('login.welcomeParents')}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{t('login.cardSubtitle')}</Text>

      <View style={[styles.field, fieldError ? styles.fieldError : null]}>
        <MaterialCommunityIcons
          name="email-outline"
          size={22}
          color={LOGIN_COLORS.icon}
        />
        <RNTextInput
          style={styles.fieldInput}
          value={formState.mobileNumber.value}
          onChangeText={handleIdentifierChange}
          placeholder={t('login.identifierPlaceholder')}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>
      {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}

      {showSchoolPicker ? (
        <Pressable
          style={[styles.field, schoolError ? styles.fieldError : null]}
          onPress={() => setSchoolPickerOpen(true)}
        >
          <MaterialCommunityIcons
            name="school-outline"
            size={22}
            color={LOGIN_COLORS.icon}
          />
          <Text
            style={[
              styles.fieldText,
              selectedSchool ? null : styles.fieldPlaceholder,
            ]}
            numberOfLines={1}
          >
            {schoolLabel}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={22}
            color="#9CA3AF"
          />
        </Pressable>
      ) : null}
      {schoolError ? <Text style={styles.errorText}>{schoolError}</Text> : null}

      <View style={[styles.field, passwordError ? styles.fieldError : null]}>
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
            if (passwordError) setPasswordError(null);
            if (error) setError(null);
          }}
          placeholder={t('login.passwordPlaceholder')}
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
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      <Pressable
        style={styles.forgot}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
      </Pressable>

      <Pressable
        style={styles.loginBtn}
        onPress={() => void handleLogin()}
        disabled={isLoading}
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
            <>
              <Text style={styles.loginBtnText}>{t('login.continue')}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </Pressable>

      <Modal
        visible={schoolPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSchoolPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSchoolPickerOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t('login.schoolPickerTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {schools.map((school) => {
                const active = selectedSchool?.schoolId === school.schoolId;
                return (
                  <Pressable
                    key={school.schoolId}
                    style={[
                      styles.schoolOption,
                      active ? styles.schoolOptionActive : null,
                    ]}
                    onPress={() => {
                      setSelectedSchool(school);
                      setSchoolError(null);
                      setSchoolPickerOpen(false);
                    }}
                  >
                    <Text style={styles.schoolOptionText}>{school.schoolName}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </AuthScreenShell>
  );
};
