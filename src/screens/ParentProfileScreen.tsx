import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getMe, getMyStudents, type ParentStudent } from '../services/parent';
import type { RootState } from '../redux/store';
import type { RootStackParamList } from '../navigation/Navigation';
import { useSelectionStore } from '../store/selectionStore';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import { shadows, spacing, useAppColors } from '../theme/appTheme';
import { useAppLanguage } from '../common';

const HERO_BG = require('../assets/hero-bg.png');

function classLine(
  student: ParentStudent,
  classWord: string,
  sectionWord: string
): string {
  const parts: string[] = [];
  if (student.className?.trim()) {
    const v = student.className.trim();
    parts.push(new RegExp(`^${classWord}\\b`, 'i').test(v) ? v : `${classWord} ${v}`);
  }
  if (student.sectionName?.trim()) {
    const v = student.sectionName.trim();
    parts.push(
      new RegExp(`^${sectionWord}\\b`, 'i').test(v) ? v : `${sectionWord} ${v}`
    );
  }
  return parts.join(' · ');
}

export function ParentProfileScreen() {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useSelector((s: RootState) => s.auth.user);
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [openPanel, setOpenPanel] = useState<'info' | 'students' | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const [meRes, stRes] = await Promise.all([getMe(), getMyStudents()]);
          if (cancelled) return;
          if (meRes.status && meRes.data && typeof meRes.data === 'object') {
            const d = meRes.data as {
              firstName?: string;
              name?: string;
              mobile?: string;
              email?: string;
            };
            setDisplayName(d.firstName || d.name || user?.name || t('common.parent'));
            setMobile(d.mobile ?? user?.mobile ?? '');
            setEmail(d.email ?? user?.email ?? '');
          }
          if (stRes.status && Array.isArray(stRes.data)) {
            setStudents(stRes.data);
          }
        } catch {
          if (!cancelled) {
            setDisplayName(user?.name ?? t('common.parent'));
            setMobile(user?.mobile ?? '');
            setEmail(user?.email ?? '');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.name, user?.mobile, user?.email, t])
  );

  const name = displayName || t('common.parent');
  const first = name.trim().split(/\s+/)[0] || name;
  const hue = avatarHue(name);
  const screenW = Dimensions.get('window').width;

  const openHelp = () => {
    navigation.navigate('HelpAndSupport');
  };

  const selectStudent = (id: number) => {
    setSelectedStudentId(id);
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Image
            source={HERO_BG}
            style={[styles.heroBg, { width: screenW }]}
            resizeMode="cover"
          />
          <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.lg }}>
            <View style={styles.nav}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={[styles.navBtn, { backgroundColor: colors.overlay }]}
                accessibilityLabel={t('common.close')}
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.headerOn} />
              </Pressable>
              <Text style={styles.navTitle}>{t('profile.screenTitle')}</Text>
              <View style={styles.navBtn} />
            </View>

            <View style={styles.identity}>
              <View style={[styles.avatar, { backgroundColor: `hsl(${hue} 48% 46%)` }]}>
                <Text style={styles.avatarLetters}>{initials(name)}</Text>
              </View>
              <Text style={styles.displayName}>{name}</Text>
              <Text style={styles.role}>{t('profile.roleParent')}</Text>
              {email || mobile ? (
                <View style={styles.contactRow}>
                  <MaterialCommunityIcons
                    name={email ? 'email-outline' : 'cellphone'}
                    size={16}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.contactText}>{email || mobile}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: 16 }}>
          <View style={[styles.banner, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="hand-wave-outline" size={28} color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.text }]}>
              {t('profile.welcomeBanner', { name: first })}
            </Text>
          </View>

          <MenuRow
            icon="account-outline"
            iconBg="#EEEBFE"
            iconFg={colors.primary}
            title={t('profile.personalInfo')}
            subtitle={t('profile.personalInfoSub')}
            onPress={() => setOpenPanel((v) => (v === 'info' ? null : 'info'))}
            expanded={openPanel === 'info'}
          />
          {openPanel === 'info' ? (
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PanelLine label={t('profile.nameLabel')} value={name} color={colors} />
              <PanelLine label={t('profile.mobileLabel')} value={mobile || '—'} color={colors} icon="cellphone" />
              {email ? (
                <PanelLine label={t('profile.emailLabel')} value={email} color={colors} icon="email-outline" />
              ) : null}
            </View>
          ) : null}

          <MenuRow
            icon="account-child-outline"
            iconBg="#E8F8EF"
            iconFg={colors.success}
            title={t('profile.linkedStudents')}
            subtitle={t('profile.linkedStudentsSub')}
            onPress={() => setOpenPanel((v) => (v === 'students' ? null : 'students'))}
            expanded={openPanel === 'students'}
          />
          {openPanel === 'students' ? (
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {students.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>{t('home.noStudentsTitle')}</Text>
              ) : (
                students.map((s) => {
                  const on = s.id === selectedStudentId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => selectStudent(s.id)}
                      style={[styles.studentRow, on && { backgroundColor: colors.primarySoft }]}
                    >
                      <View
                        style={[
                          styles.miniAvatar,
                          { backgroundColor: `hsl(${avatarHue(s.name)} 48% 46%)` },
                        ]}
                      >
                        <Text style={styles.miniInitials}>{initials(s.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{s.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {classLine(s, t('home.classWord'), t('home.sectionShort')) || '—'}
                        </Text>
                      </View>
                      {on ? (
                        <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          <MenuRow
            icon="headset"
            iconBg="#EEEBFE"
            iconFg={colors.primary}
            title={t('nav.helpAndSupport')}
            subtitle={t('profile.helpMenuSub')}
            onPress={openHelp}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  icon,
  iconBg,
  iconFg,
  title,
  subtitle,
  onPress,
  expanded,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  expanded?: boolean;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuCard, shadows.card, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size={22}
        color={colors.textTertiary}
      />
    </Pressable>
  );
}

function PanelLine({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: { text: string; textSecondary: string };
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  return (
    <View style={styles.panelLine}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={16} color={color.textSecondary} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: color.textSecondary, fontSize: 11 }}>{label}</Text>
        <Text style={{ color: color.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { overflow: 'hidden', paddingBottom: 24 },
  heroBg: { ...StyleSheet.absoluteFillObject, height: '100%' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  identity: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarLetters: { color: '#fff', fontSize: 32, fontWeight: '800' },
  displayName: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  role: { marginTop: 4, color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  contactText: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 15, fontWeight: '700' },
  menuSub: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  panel: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  panelLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitials: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
