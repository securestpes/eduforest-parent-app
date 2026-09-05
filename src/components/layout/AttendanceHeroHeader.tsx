import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ParentStudent } from '../../services/parent';
import { useAppLanguage } from '../../common';
import { normalizeUploadUrl } from '../../common/helpers/normalizeUploadUrl';
import { initials, avatarHue } from '../../utils/attendanceVisuals';
import { colors, shadows, spacing } from '../../theme/appTheme';
import { HOME_HERO_BG } from '../../features/home/components/HomeHero';

type Stats = {
  pctPresent: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
};

type Props = {
  student: ParentStudent | null;
  stats: Stats;
  onBack: () => void;
};

function withPrefix(value: string | null | undefined, word: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return new RegExp(`^${word}\\b`, 'i').test(v) ? v : `${word} ${v}`;
}

export function AttendanceHeroHeader({ student, stats, onBack }: Props) {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [photoFailed, setPhotoFailed] = useState(false);
  const name = student?.name || t('common.student');
  const hue = avatarHue(name);
  const photoUri = normalizeUploadUrl(student?.profilePicUrl);
  const showPhoto = Boolean(photoUri) && !photoFailed;
  const isActive = !student?.status || /active/i.test(student.status);
  const screenW = Dimensions.get('window').width;

  const classLine = [
    withPrefix(student?.className, t('home.classWord')),
    withPrefix(student?.sectionName, t('home.sectionShort')),
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Image
          source={HOME_HERO_BG}
          style={[styles.heroBg, { width: screenW }]}
          resizeMode="cover"
        />
        <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.lg, paddingBottom: 36 }}>
        <View style={styles.nav}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={styles.navBtn}
            accessibilityLabel={t('attendance.backHome')}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.headerOn} />
          </Pressable>
          <Text style={styles.navTitle}>{t('nav.attendance')}</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={styles.profile}>
          {showPhoto ? (
            <Image
              source={{
                uri: photoUri,
                headers: { 'ngrok-skip-browser-warning': 'true' },
              }}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: `hsl(${hue} 48% 46%)` }]}>
              <Text style={styles.initials}>{initials(name)}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
            {classLine ? (
              <Text style={styles.meta} numberOfLines={1}>
                {classLine}
              </Text>
            ) : null}
            {isActive ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{t('home.activeStudent')}</Text>
              </View>
            ) : null}
          </View>
        </View>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.pctRow}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {`${stats.pctPresent}%`}
          </Text>
          <Text style={[styles.pctLabel, { color: colors.success }]}>
            {t('attendance.statThisMonth')}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.success }]} numberOfLines={1}>
              {String(stats.present)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.success }]} numberOfLines={1}>
              {t('attendance.statPresent')}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.danger }]} numberOfLines={1}>
              {String(stats.absent)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.danger }]} numberOfLines={1}>
              {t('attendance.statAbsent')}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.warning }]} numberOfLines={1}>
              {String(stats.late)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.warning }]} numberOfLines={1}>
              {t('attendance.statLate')}
            </Text>
          </View>
          <View style={[styles.statCell, styles.statCellLast]}>
            <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={1}>
              {String(stats.leave)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.primary }]} numberOfLines={1}>
              {t('attendance.statLeave')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingBottom: 8,
  },
  hero: {
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    zIndex: 2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  navSpacer: {
    width: 40,
    height: 40,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.headerOn,
    fontSize: 18,
    fontWeight: '700',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    zIndex: 2,
    paddingRight: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { color: colors.headerOn, fontWeight: '700', fontSize: 20 },
  info: { flex: 1, minWidth: 0 },
  name: {
    color: colors.headerOn,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  meta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#D8F5E3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  statsCard: {
    marginTop: -22,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
    zIndex: 3,
    overflow: 'hidden',
  },
  pctRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF0F3',
  },
  pctLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: 0,
    borderColor: '#EEF0F3',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  statCellLast: {
    borderRightWidth: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});
