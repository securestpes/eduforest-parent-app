import React, { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, listMySchools, switchParentSchool, type ParentSchoolOption } from '../services/parent';
import { ParentProfileService } from '../features/profile/services/ParentProfileService';
import { logout } from '../features/login/slices/authSlice';
import { AuthService } from '../features/login/services/AuthService';
import { completeParentLogin } from '../features/login/services/completeParentLogin';
import { localStorageKeys } from '../common/constants';
import type { RootState } from '../redux/store';
import type { AppDispatch } from '../redux/store';
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
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../services/notificationPreferences';

const APP_LOGO = require('../assets/icon.png');

type ProfileVariant = 'all' | 'profile' | 'settings';

export function ProfileScreen({ variant = 'all' }: { variant?: ProfileVariant }) {
  const colors = useAppColors();
  const { t, language, setLanguage, supportedLanguages } = useAppLanguage();
  const { isDark, toggleTheme } = useAppTheme();
  const { isConnected } = useNetworkError(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const user = useSelector((s: RootState) => s.auth.user);
  const [displayName, setDisplayName] = useState('');
  const [mobile, setMobile] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schools, setSchools] = useState<ParentSchoolOption[]>([]);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [switchingSchool, setSwitchingSchool] = useState(false);
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] =
    useState(false);
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
          const schoolRes = await listMySchools();
          const prefs = await getNotificationPreferences();
          if (!cancelled) {
            setVoiceAnnouncementsEnabled(prefs.voiceAnnouncementsEnabled);
          }
          if (cancelled) return;
          if (res.status && res.data && typeof res.data === 'object') {
            const d = res.data as {
              mobile?: string;
              firstName?: string;
              lastName?: string;
              name?: string;
              clientName?: string;
              instituteName?: string;
            };
            const first = d.firstName?.trim();
            const last = d.lastName?.trim();
            const full = d.name?.trim();
            setDisplayName(
              (first && last ? `${first} ${last}` : full || first) ||
                user?.name ||
                t('common.parent')
            );
            setMobile(d.mobile ?? user?.mobile ?? '');
            setSchoolName(
              d.instituteName?.trim() ||
                d.clientName?.trim() ||
                user?.clientName ||
                ''
            );
          }
          if (schoolRes.status && Array.isArray(schoolRes.data)) {
            setSchools(schoolRes.data);
          }
        } catch {
          if (!cancelled) {
            setDisplayName(user?.name ?? t('common.parent'));
            setMobile(user?.mobile ?? '');
            setSchoolName(user?.clientName ?? '');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.name, user?.mobile, t])
  );

  const onLogout = async () => {
    await AuthService.clearLocalSession();
    dispatch(logout());
  };

  const onSwitchSchool = async (schoolId: number) => {
    if (schoolId === user?.clientId || switchingSchool) {
      setSchoolPickerOpen(false);
      return;
    }
    setSwitchingSchool(true);
    try {
      const response = await switchParentSchool(schoolId);
      const result = await completeParentLogin(dispatch, {
        status: response.status,
        message: response.message,
        data: response.data,
      });
      setSchoolPickerOpen(false);
      if (!result.ok) {
        setStatus({ variant: 'error', title: result.message });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.switchingSchool');
      setStatus({ variant: 'error', title: message });
    } finally {
      setSwitchingSchool(false);
    }
  };

  const onToggleVoiceAnnouncements = async (value: boolean) => {
    setVoiceAnnouncementsEnabled(value);
    await saveNotificationPreferences({ voiceAnnouncementsEnabled: value });
    await AsyncStorage.setItem(
      localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED,
      String(value)
    );
  };

  const nameForAvatar = displayName || user?.name || t('common.parent');
  const hue = avatarHue(nameForAvatar);
  const avatarBg = `hsl(${hue} 48% 46%)`;
  const parentName = displayName || user?.name || t('common.parent');
  const parentMobile = mobile || user?.mobile || '—';
  const parentSchool = user?.clientName || schoolName || '—';

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
        await AuthService.clearLocalSession();
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
            styles.accountCard,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.accountHeader}>
            <View style={[styles.accountAvatar, { backgroundColor: avatarBg }]}>
              <Text style={styles.accountAvatarLetters}>{initials(nameForAvatar)}</Text>
            </View>
            <View style={styles.accountIdentity}>
              <Text
                style={[styles.accountName, { color: colors.text }]}
                numberOfLines={2}
              >
                {parentName}
              </Text>
              <View style={[styles.rolePill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.rolePillText, { color: colors.primary }]}>
                  {t('profile.roleParent')}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.accountDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.accountMeta}>
            <View style={styles.accountMetaRow}>
              <View style={[styles.accountMetaIcon, { backgroundColor: colors.primarySoft }]}>
                <MaterialCommunityIcons name="cellphone" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.accountMetaLabel, { color: colors.textTertiary }]}>
                  {t('profile.mobileLabel')}
                </Text>
                <Text
                  style={[styles.accountMetaValue, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {parentMobile}
                </Text>
              </View>
            </View>
            <View style={styles.accountMetaRow}>
              <View style={[styles.accountMetaIcon, { backgroundColor: colors.successSoft }]}>
                <MaterialCommunityIcons name="school-outline" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.accountMetaLabel, { color: colors.textTertiary }]}>
                  {t('profile.schoolLabel')}
                </Text>
                <Text
                  style={[styles.accountMetaValue, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {parentSchool}
                </Text>
                {schools.length > 1 ? (
                  <Pressable
                    onPress={() => setSchoolPickerOpen(true)}
                    hitSlop={6}
                    style={[styles.switchSchoolBtn, { backgroundColor: colors.primarySoft }]}
                  >
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={[styles.switchSchoolText, { color: colors.primary }]}>
                      {switchingSchool
                        ? t('profile.switchingSchool')
                        : t('profile.switchSchool')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.accountNote, { backgroundColor: colors.surfaceMuted }]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={colors.textTertiary}
              style={{ marginTop: 1 }}
            />
            <Text style={[styles.accountHint, { color: colors.textSecondary }]}>
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
          <View style={styles.footerLogoWell}>
            <Image source={APP_LOGO} style={styles.footerLogo} resizeMode="cover" />
          </View>
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

        <Modal
          visible={schoolPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSchoolPickerOpen(false)}
        >
          <Pressable
            style={styles.schoolModalBackdrop}
            onPress={() => setSchoolPickerOpen(false)}
          >
            <Pressable style={[styles.schoolModalSheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
              <Text style={[styles.rowTitle, { color: colors.text, marginBottom: 12 }]}>
                {t('profile.switchSchool')}
              </Text>
              {schools.map((school) => {
                const active = school.schoolId === user?.clientId;
                return (
                  <Pressable
                    key={school.schoolId}
                    onPress={() => void onSwitchSchool(school.schoolId)}
                    disabled={switchingSchool}
                    style={[
                      styles.schoolOption,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                      {school.schoolName}
                    </Text>
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

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
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarLetters: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  accountIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  rolePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  accountMeta: {
    gap: 14,
  },
  accountMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accountMetaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  accountMetaValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 20,
  },
  switchSchoolBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchSchoolText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
  brandFooter: { alignItems: 'center', marginTop: 28, gap: 8 },
  footerLogoWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  footerLogo: { width: 92, height: 92 },
  footerTitle: { fontSize: 14, fontWeight: '800' },
  footerTag: { fontSize: 12 },
  schoolModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  schoolModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  schoolOption: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 8,
  },
});
