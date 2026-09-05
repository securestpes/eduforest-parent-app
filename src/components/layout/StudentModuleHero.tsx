import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ParentStudent } from '../../services/parent';
import { useAppLanguage } from '../../common';
import { normalizeUploadUrl } from '../../common/helpers/normalizeUploadUrl';
import { initials, avatarHue } from '../../utils/attendanceVisuals';
import { colors, spacing } from '../../theme/appTheme';

const MODULE_HERO_BG = require('../../assets/hero-bg.png');

type Props = {
  title: string;
  student: ParentStudent | null;
  onBack: () => void;
  backAccessibilityLabel?: string;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
};

function withPrefix(value: string | null | undefined, word: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return new RegExp(`^${word}\\b`, 'i').test(v) ? v : `${word} ${v}`;
}

export function StudentModuleHero({
  title,
  student,
  onBack,
  backAccessibilityLabel,
  rightAction,
  children,
}: Props) {
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
          source={MODULE_HERO_BG}
          style={[styles.heroBg, { width: screenW }]}
          resizeMode="cover"
        />
        <View
          style={{
            paddingTop: insets.top + 4,
            paddingHorizontal: spacing.lg,
            paddingBottom: children ? 36 : 20,
          }}
        >
          <View style={styles.nav}>
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.navBtn}
              accessibilityLabel={backAccessibilityLabel || t('attendance.backHome')}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.headerOn} />
            </Pressable>
            <Text style={styles.navTitle}>{title}</Text>
            {rightAction ? rightAction : <View style={styles.navSpacer} />}
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
      {children}
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
});
