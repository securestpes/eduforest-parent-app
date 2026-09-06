import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ParentStudent } from '../../services/parent';
import { useAppLanguage } from '../../common';
import { normalizeUploadUrl } from '../../common/helpers/normalizeUploadUrl';
import { initials, avatarHue } from '../../utils/attendanceVisuals';
import { shadows, spacing, useAppColors } from '../../theme/appTheme';
import { TabHeaderActions } from '../TabHeaderActions';

const MODULE_HERO_BG = require('../../assets/hero-bg.png');

type Props = {
  title: string;
  subtitle?: string;
  student?: ParentStudent | null;
  cardName?: string;
  cardMeta?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  rightAction?: React.ReactNode;
  heroIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  showNotifications?: boolean;
  children?: React.ReactNode;
};

function withPrefix(value: string | null | undefined, word: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return new RegExp(`^${word}\\b`, 'i').test(v) ? v : `${word} ${v}`;
}

export function StudentModuleHero({
  title,
  subtitle,
  student,
  cardName,
  cardMeta,
  onBack,
  backAccessibilityLabel,
  rightAction,
  heroIcon = 'school-outline',
  showNotifications = true,
  children,
}: Props) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const [photoFailed, setPhotoFailed] = useState(false);
  const name = student?.name || cardName || t('common.student');
  const hue = avatarHue(name);
  const photoUri = normalizeUploadUrl(student?.profilePicUrl);
  const showPhoto = Boolean(photoUri) && !photoFailed;
  const screenW = Dimensions.get('window').width;

  const classLine = student
    ? [
        withPrefix(student.className, t('home.classWord')),
        withPrefix(student.sectionName, t('home.sectionShort')),
      ]
        .filter(Boolean)
        .join(' • ')
    : cardMeta || '';

  const showCard = Boolean(student || cardName);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Image
          source={MODULE_HERO_BG}
          style={[styles.heroBg, { width: screenW }]}
          resizeMode="cover"
        />
        <View
          style={{
            paddingTop: insets.top + 4,
            paddingHorizontal: spacing.lg,
            paddingBottom: showCard ? 48 : 20,
          }}
        >
          <View style={styles.nav}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={8}
                style={[styles.navBtn, { backgroundColor: colors.overlay }]}
                accessibilityLabel={backAccessibilityLabel || t('attendance.backHome')}
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.headerOn} />
              </Pressable>
            ) : (
              <View style={styles.navLeft} />
            )}
            <View style={styles.navRight}>
              {rightAction}
              {!onBack && showNotifications ? <TabHeaderActions /> : null}
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.overlay }]}>
              <MaterialCommunityIcons name={heroIcon} size={22} color={colors.headerOn} />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.heroTitle}>{title}</Text>
              {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      {showCard ? (
        <View style={[styles.studentCard, { backgroundColor: colors.surface }]}>
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
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {classLine ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {classLine}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 8,
    zIndex: 2,
  },
  hero: {
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
  },
  navLeft: {
    width: 8,
    height: 40,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  studentCard: {
    marginTop: -28,
    marginHorizontal: spacing.base,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
    zIndex: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
});
