import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
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
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import { radius, shadows, spacing, typography, useAppColors } from '../theme/appTheme';
import {
  ConfirmationPopup,
  StatusPopup,
  useAppLanguage,
  useAppTheme,
  useNetworkError,
  type StatusPopupVariant,
} from '../common';
import { NotificationPreferencesSection } from '../components/NotificationPreferencesSection';

const APP_LOGO = require('../assets/logo.png');

type ProfileVariant = 'all' | 'profile' | 'settings';

export function ProfileScreen({ variant = 'all' }: { variant?: ProfileVariant }) {
  const colors = useAppColors();
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
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
  } | null>(null);

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

  const showIdentity = variant !== 'settings';
  const showSettings = variant !== 'profile';
  const tabHero = variant === 'profile' || variant === 'settings';

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
        setStatus({ variant: 'error', title: t('settings.deleteAccount.offline') });
        return;
      }
      setDeleteAccountLoading(true);
      try {
        const res = await ParentProfileService.deleteMyAccount();
        if (!res?.status) {
          setStatus({ variant: 'error', title: res?.message || t('settings.deleteAccount.failed') });
          return;
        }
        setDeleteAccountModalVisible(false);
        await AuthService.firebaseSignOut();
        await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
        await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
        dispatch(logout());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus({
          variant: 'error',
          title: msg.includes('Delete account') ? msg : t('settings.deleteAccount.failed'),
        });
      } finally {
        setDeleteAccountLoading(false);
      }
    })();
  };

  return (
    <ScreenDecor>
      {tabHero ? (
        <StudentModuleHero
          title={variant === 'settings' ? t('nav.settings') : t('nav.profile')}
          subtitle={
            variant === 'settings'
              ? t('tabs.settingsSubtitle')
              : t('tabs.profileSubtitle')
          }
          heroIcon={variant === 'settings' ? 'cog-outline' : 'account-outline'}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={styles.root}
        showsVerticalScrollIndicator={false}
      >
        {showIdentity ? (
        <>
        <View
          style={[
            styles.heroCard,
            shadows.card,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarLetters}>{initials(nameForAvatar)}</Text>
          </View>
          <Text style={[styles.identityName, { color: colors.text }]}>
            {displayName || user?.name || t('common.parent')}
          </Text>
          <View style={[styles.mobileRow, { backgroundColor: colors.surfaceMuted }]}>
            <MaterialCommunityIcons name="cellphone" size={18} color={colors.primary} />
            <Text style={[styles.mobileText, { color: colors.text }]}>
              {mobile || user?.mobile || '—'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.infoCard,
            shadows.card,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.infoIcon, { backgroundColor: colors.successSoft }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t('profile.signedInTitle')}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
              {t('profile.signedInBody')}
            </Text>
          </View>
        </View>
        </>
        ) : null}

        {showSettings ? (
        <>
        <View
          style={[
            styles.groupCard,
            shadows.card,
            styles.accountCard,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="cellphone" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {displayName || user?.name || t('common.parent')}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
              {t('profile.mobileLabel')}: {mobile || user?.mobile || '—'}
            </Text>
            <Text style={[styles.accountHint, { color: colors.textTertiary }]}>
              {t('profile.mobileChangeHint')}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.text },
          ]}
        >
          {t('profile.sectionNotifications')}
        </Text>
        <View style={[styles.groupCard, shadows.card, { backgroundColor: colors.surface }]}>
          <View style={styles.introRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {t('profile.attendanceAlertsTitle')}
              </Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {t('profile.attendanceAlertsBody')}
              </Text>
            </View>
          </View>
          <NotificationPreferencesSection />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {t('settings.sectionApp')}
        </Text>
        <View style={[styles.groupCard, shadows.card, { backgroundColor: colors.surface }]}>
          <SettingToggle
            icon="volume-high"
            iconBg={colors.primarySoft}
            iconFg={colors.primary}
            title={t('profile.voiceAnnouncementsTitle')}
            subtitle={t('profile.voiceAnnouncementsBody')}
            value={voiceAnnouncementsEnabled}
            onValueChange={(value) => void onToggleVoiceAnnouncements(value)}
            colors={colors}
          />
          <SettingToggle
            icon="theme-light-dark"
            iconBg={colors.warningSoft}
            iconFg={colors.warning}
            title={t('settings.darkMode')}
            subtitle={t('settings.darkModeBody')}
            value={isDark}
            onValueChange={() => toggleTheme()}
            colors={colors}
          />
          <View style={[styles.languageBlock, { borderTopColor: colors.divider }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t('settings.language.title')}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary, marginBottom: 12 }]}>
              {t('settings.language.subtitle')}
            </Text>
            <View style={styles.languageGrid}>
              {supportedLanguages.map((option) => {
                const isSelected = option.code === language;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => void setLanguage(option.code)}
                    style={[
                      styles.languageChip,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primarySoft : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {t('profile.legalHelpSection')}
        </Text>
        <View style={[styles.groupCard, shadows.card, { backgroundColor: colors.surface }]}>
          <NavRow
            icon="shield-lock-outline"
            iconBg={colors.primarySoft}
            iconFg={colors.primary}
            title={t('profile.privacyTitle')}
            subtitle={t('profile.privacySubtitle')}
            onPress={() => openLegalScreen('PrivacyPolicy')}
            colors={colors}
          />
          <NavRow
            icon="file-document-outline"
            iconBg={colors.warningSoft}
            iconFg={colors.warning}
            title={t('profile.termsTitle')}
            subtitle={t('profile.termsSubtitle')}
            onPress={() => openLegalScreen('TermsAndConditions')}
            colors={colors}
          />
          <NavRow
            icon="help-circle-outline"
            iconBg={colors.primarySoft}
            iconFg={colors.primary}
            title={t('profile.helpTitle')}
            subtitle={t('profile.helpSubtitle')}
            onPress={() => openLegalScreen('HelpAndSupport')}
            colors={colors}
            last
          />
        </View>

        <Pressable
          onPress={() => {
            if (isConnected === false) {
              setStatus({ variant: 'error', title: t('settings.deleteAccount.offline') });
              return;
            }
            setDeleteAccountModalVisible(true);
          }}
          style={[styles.groupCard, shadows.card, { backgroundColor: colors.surface, marginTop: spacing.lg }]}
        >
          <View style={styles.navRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.dangerSoft }]}>
              <MaterialCommunityIcons name="account-remove-outline" size={22} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.danger }]}>
                {t('settings.deleteAccount.title')}
              </Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {t('settings.deleteAccount.subtitle')}
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => void onLogout()}
          style={[styles.signOut, { backgroundColor: colors.primarySoft }]}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.primaryDark} />
          <Text style={[styles.signOutText, { color: colors.primaryDark }]}>
            {t('profile.signOut')}
          </Text>
        </Pressable>

        <View style={styles.brandFooter}>
          <Image source={APP_LOGO} style={styles.footerLogo} resizeMode="contain" />
          <Text style={[styles.footerTitle, { color: colors.text }]}>{t('branding.appTitle')}</Text>
          <Text style={[styles.footerTag, { color: colors.textTertiary }]}>
            {t('branding.tagline')}
          </Text>
        </View>
        </>
        ) : null}

        <ConfirmationPopup
          isVisible={deleteAccountModalVisible}
          title={t('settings.deleteAccount.confirmTitle')}
          message={t('settings.deleteAccount.confirmMessage')}
          confirmText={t('settings.deleteAccount.confirmButton')}
          confirmButtonColor={colors.danger}
          confirmLoading={deleteAccountLoading}
          onCancel={() => {
            setDeleteAccountModalVisible(false);
            setDeleteAccountLoading(false);
          }}
          onConfirm={handleConfirmDeleteAccount}
        />

        <StatusPopup
          visible={status != null}
          variant={status?.variant}
          title={status?.title ?? ''}
          onDismiss={() => setStatus(null)}
        />

        {showIdentity ? (
        <Button
          mode="outlined"
          onPress={() => void onLogout()}
          style={[styles.logout, { borderColor: colors.danger }]}
          labelStyle={{ color: colors.danger, fontWeight: '700' }}
          textColor={colors.danger}
          icon="logout"
        >
          {t('profile.logout')}
        </Button>
        ) : null}
      </ScrollView>
    </ScreenDecor>
  );
}

function SettingToggle({
  icon,
  iconBg,
  iconFg,
  title,
  subtitle,
  value,
  onValueChange,
  colors,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  return (
    <View style={[styles.navRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconFg} />
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function NavRow({
  icon,
  iconBg,
  iconFg,
  title,
  subtitle,
  onPress,
  colors,
  last,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppColors>;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.navRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 128,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetters: { color: '#fff', fontSize: 32, fontWeight: '800' },
  identityName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  mobileText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  sectionLabel: {
    ...typography.section,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabelFirst: {
    marginTop: spacing.sm,
  },
  groupCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  accountHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.base,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  languageBlock: {
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: '46%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipText: {
    fontWeight: '700',
    fontSize: 14,
  },
  logout: { marginTop: 28, borderRadius: 14 },
  signOut: {
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { fontSize: 16, fontWeight: '700' },
  brandFooter: { alignItems: 'center', marginTop: 28, gap: 4 },
  footerLogo: { width: 48, height: 48, marginBottom: 4 },
  footerTitle: { fontSize: 14, fontWeight: '800' },
  footerTag: { fontSize: 12 },
});
