import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import {
  Button,
  Switch,
  Text,
  useTheme,
  TouchableRipple,
  Card,
  Icon,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../services/parent';
import { ParentProfileService } from '../features/profile/services/ParentProfileService';
import { logout } from '../features/login/slices/authSlice';
import { AuthService } from '../features/login/services/AuthService';
import { localStorageKeys } from '../common/constants';
import type { RootState } from '../redux/store';
import type { RootStackParamList } from '../navigation/Navigation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScreenDecor } from '../components/ScreenDecor';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import type { AppTheme } from '../theme';
import {
  ConfirmationPopup,
  useAppLanguage,
  useAppTheme,
  useNetworkError,
} from '../common';
import { NotificationPreferencesSection } from '../components/NotificationPreferencesSection';

export function ProfileScreen() {
  const theme = useTheme() as AppTheme;
  const { t, language, setLanguage, supportedLanguages } = useAppLanguage();
  const { isDark, toggleTheme } = useAppTheme();
  const { isConnected } = useNetworkError(null);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const user = useSelector((s: RootState) => s.auth.user);
  const [displayName, setDisplayName] = useState('');
  const [mobile, setMobile] = useState('');
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] =
    useState(true);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await getMe();
          const savedVoiceToggle = await AsyncStorage.getItem(
            localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED
          );
          if (!cancelled && savedVoiceToggle !== null) {
            setVoiceAnnouncementsEnabled(savedVoiceToggle === 'true');
          }
          if (cancelled) return;
          if (res.status && res.data && typeof res.data === 'object') {
            const d = res.data as { mobile?: string; firstName?: string };
            setDisplayName(d.firstName ?? user?.name ?? t('common.parent'));
            setMobile(d.mobile ?? user?.mobile ?? '');
          }
        } catch {
          if (!cancelled) {
            setDisplayName(user?.name ?? t('common.parent'));
            setMobile(user?.mobile ?? '');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.name, user?.mobile, t])
  );

  const onLogout = async () => {
    await AuthService.firebaseSignOut();
    await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
    await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
    dispatch(logout());
  };

  const onToggleVoiceAnnouncements = async (value: boolean) => {
    setVoiceAnnouncementsEnabled(value);
    await AsyncStorage.setItem(
      localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED,
      String(value)
    );
  };

  const nameForAvatar = displayName || user?.name || t('common.parent');
  const hue = avatarHue(nameForAvatar);
  const avatarBg = `hsl(${hue} 42% 42%)`;

  const openLegalScreen = (
    screen: keyof Pick<
      RootStackParamList,
      'PrivacyPolicy' | 'TermsAndConditions' | 'HelpAndSupport'
    >
  ) => {
    navigation
      .getParent<NavigationProp<RootStackParamList>>()
      ?.navigate(screen);
  };

  const handleConfirmDeleteAccount = () => {
    void (async () => {
      if (isConnected === false) {
        Alert.alert('', t('settings.deleteAccount.offline'));
        return;
      }
      setDeleteAccountLoading(true);
      try {
        const res = await ParentProfileService.deleteMyAccount();
        if (!res?.status) {
          Alert.alert('', res?.message || t('settings.deleteAccount.failed'));
          return;
        }
        setDeleteAccountModalVisible(false);
        await AuthService.firebaseSignOut();
        await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
        await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
        dispatch(logout());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert(
          '',
          msg.includes('Delete account')
            ? msg
            : t('settings.deleteAccount.failed')
        );
      } finally {
        setDeleteAccountLoading(false);
      }
    })();
  };

  return (
    <ScreenDecor>
      <ScrollView
        contentContainerStyle={styles.root}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarLetters}>{initials(nameForAvatar)}</Text>
          </View>
          <Text
            variant="headlineSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 12,
            }}
          >
            {displayName || user?.name || t('common.parent')}
          </Text>
          <View
            style={[
              styles.mobileRow,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <MaterialCommunityIcons
              name="cellphone"
              size={18}
              color={theme.colors.primary}
            />
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurface,
                marginLeft: 8,
                fontWeight: '600',
              }}
            >
              {mobile || user?.mobile || '—'}
            </Text>
          </View>
        </View>

        <Text
          variant="titleMedium"
          style={{
            color: theme.colors.onBackground,
            fontWeight: '700',
            marginTop: 8,
          }}
        >
          {t('profile.sectionNotifications')}
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="bell-ring-outline"
              size={24}
              color={theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('profile.attendanceAlertsTitle')}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {t('profile.attendanceAlertsBody')}
            </Text>
          </View>
        </View>

        <NotificationPreferencesSection />

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: theme.colors.tertiaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="volume-high"
              size={24}
              color={theme.colors.tertiary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('profile.voiceAnnouncementsTitle')}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {t('profile.voiceAnnouncementsBody')}
            </Text>
          </View>
          <Switch
            value={voiceAnnouncementsEnabled}
            onValueChange={(value) => void onToggleVoiceAnnouncements(value)}
          />
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('settings.darkMode')}
            </Text>
          </View>
          <Switch value={isDark} onValueChange={() => toggleTheme()} />
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('profile.signedInTitle')}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {t('profile.signedInBody')}
            </Text>
          </View>
        </View>

        <Card
          style={[
            styles.languageCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.languageTitle, { color: theme.colors.onSurface }]}
            >
              {t('settings.language.title')}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.languageSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t('settings.language.subtitle')}
            </Text>
            <View style={styles.languageOptionsRow}>
              {supportedLanguages.map((option) => {
                const isSelected = option.code === language;
                return (
                  <TouchableRipple
                    key={option.code}
                    onPress={() => {
                      console.log('Selected language:', option.code);
                      void setLanguage(option.code);
                    }}
                    style={[
                      styles.languageOption,
                      { borderColor: theme.colors.outlineVariant },
                      isSelected && {
                        backgroundColor: `${theme.colors.primary}15`,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    borderless={false}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        { color: theme.colors.onSurface },
                        isSelected && { color: theme.colors.primary },
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </TouchableRipple>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        <Text
          variant="titleMedium"
          style={{
            color: theme.colors.onBackground,
            fontWeight: '700',
            marginTop: 8,
          }}
        >
          {t('profile.legalHelpSection')}
        </Text>

        <Pressable onPress={() => openLegalScreen('PrivacyPolicy')}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {t('profile.privacyTitle')}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {t('profile.privacySubtitle')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </Pressable>

        <Pressable onPress={() => openLegalScreen('TermsAndConditions')}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={22}
                color={theme.colors.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {t('profile.termsTitle')}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {t('profile.termsSubtitle')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </Pressable>

        <Pressable onPress={() => openLegalScreen('HelpAndSupport')}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.tertiaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={22}
                color={theme.colors.tertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {t('profile.helpTitle')}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {t('profile.helpSubtitle')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </Pressable>

        <View style={styles.deleteAccountSection}>
          <TouchableRipple
            onPress={() => {
              if (isConnected === false) {
                Alert.alert('', t('settings.deleteAccount.offline'));
                return;
              }
              setDeleteAccountModalVisible(true);
            }}
            style={styles.deleteAccountButton}
            rippleColor="rgba(0, 0, 0, 0.08)"
          >
            <Card
              style={[
                styles.deleteAccountCard,
                {
                  borderColor: theme.colors.outlineVariant,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              elevation={1}
            >
              <Card.Content style={styles.deleteAccountContent}>
                <View
                  style={[
                    styles.deleteAccountIconContainer,
                    { backgroundColor: `${theme.colors.error}12` },
                  ]}
                >
                  <Icon
                    source="account-remove-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                </View>
                <View style={styles.deleteAccountTextContainer}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.deleteAccountTitle,
                      { color: theme.colors.error },
                    ]}
                  >
                    {t('settings.deleteAccount.title')}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.deleteAccountSubtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t('settings.deleteAccount.subtitle')}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableRipple>
        </View>

        <ConfirmationPopup
          isVisible={deleteAccountModalVisible}
          title={t('settings.deleteAccount.confirmTitle')}
          message={t('settings.deleteAccount.confirmMessage')}
          confirmText={t('settings.deleteAccount.confirmButton')}
          confirmButtonColor={theme.colors.error}
          confirmLoading={deleteAccountLoading}
          onCancel={() => {
            setDeleteAccountModalVisible(false);
            setDeleteAccountLoading(false);
          }}
          onConfirm={handleConfirmDeleteAccount}
        />

        <Button
          mode="outlined"
          onPress={() => void onLogout()}
          style={[styles.logout, { borderColor: theme.colors.error }]}
          labelStyle={{ color: theme.colors.error, fontWeight: '700' }}
          textColor={theme.colors.error}
          icon="logout"
        >
          {t('profile.logout')}
        </Button>
      </ScrollView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  heroCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetters: { color: '#fff', fontSize: 32, fontWeight: '800' },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  languageTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  languageSubtitle: {
    marginBottom: 14,
    lineHeight: 20,
  },
  languageOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageOption: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  languageOptionText: {
    fontWeight: '600',
  },
  logout: { marginTop: 28, borderRadius: 14 },
  deleteAccountSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  deleteAccountButton: {
    borderRadius: 16,
  },
  deleteAccountCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteAccountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deleteAccountTextContainer: {
    flex: 1,
  },
  deleteAccountTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  deleteAccountSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
});
