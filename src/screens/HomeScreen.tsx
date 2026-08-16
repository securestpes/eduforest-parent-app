import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import {
  getMe,
  getMyStudents,
  getStudentAttendance,
  PARENT_ATTENDANCE_PAGE_SIZE,
  type ParentAttendanceRow,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import {
  resolveTodayAttendance,
  type TodayAttendanceKind,
} from '../utils/dashboardHome';
import { formatApiTime, formatLocalDateTime } from '../utils/localDateTime';
import type { RootState } from '../redux/store';
import type { RootStackParamList } from '../navigation/Navigation';
import { useAppLanguage, type TranslationKey } from '../common';
import type { ChildChipAction } from '../components/ChildActionChips';
import {
  EduForestColors,
  EduForestRadius,
  EduForestSpacing,
  EduForestTypography,
  eduForestCardShell,
} from '../theme/eduForestTokens';
import { ChildDashboard } from './ChildDashboard';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number | undefined>
) => string;

function todayTone(kind: TodayAttendanceKind): { fg: string; bg: string } {
  switch (kind) {
    case 'present':
      return {
        fg: EduForestColors.successStrong,
        bg: EduForestColors.successLight,
      };
    case 'absent':
      return {
        fg: EduForestColors.dangerStrong,
        bg: EduForestColors.dangerLight,
      };
    case 'late':
      return {
        fg: EduForestColors.warningStrong,
        bg: EduForestColors.warningLight,
      };
    case 'leave':
      return {
        fg: EduForestColors.secondaryStrong,
        bg: EduForestColors.secondaryLight,
      };
    default:
      return {
        fg: EduForestColors.primaryStrong,
        bg: EduForestColors.primaryLight,
      };
  }
}

function TodayStatusBadge({ kind }: { kind: TodayAttendanceKind }) {
  const { t } = useAppLanguage();
  const label =
    kind === 'present'
      ? t('attendance.status.present')
      : kind === 'absent'
        ? t('attendance.status.absent')
        : kind === 'late'
          ? t('attendance.status.late')
          : kind === 'leave'
            ? t('attendance.status.leave')
            : t('home.todayNotMarked');
  const tone = todayTone(kind);
  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.statusBadgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

function childTodayDetailLine(
  kind: TodayAttendanceKind,
  todayRow: ParentAttendanceRow | null,
  t: Translate
): string {
  if (kind === 'present' || kind === 'absent' || kind === 'late' || kind === 'leave') {
    if (todayRow?.startTime) {
      return formatApiTime(todayRow.startTime);
    }
    return '';
  }
  if (kind === 'not_marked') return t('home.todayNotMarked');
  return t('home.noAttendanceYet');
}

function ChildPickerCard({
  item,
  onPress,
  rows,
  t,
}: {
  item: ParentStudent;
  onPress: () => void;
  rows: ParentAttendanceRow[];
  t: Translate;
}) {
  const hue = avatarHue(item.name);
  const { kind, row: todayRow } = resolveTodayAttendance(rows);
  const batchLine = item.batchNames?.length
    ? item.batchNames.join(' · ')
    : t('common.dash');
  const detailLine = childTodayDetailLine(kind, todayRow, t);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.childCard}>
        <View
          style={[
            styles.childAvatar,
            { backgroundColor: `hsl(${hue} 45% 46%)` },
          ]}
        >
          <Text style={styles.childAvatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.childCardBody}>
          <View style={styles.childTopRow}>
            <Text style={styles.childName} numberOfLines={1}>
              {item.name}
            </Text>
            <TodayStatusBadge kind={kind} />
          </View>
          <Text style={styles.childMeta} numberOfLines={2}>
            {item.instituteName}
          </Text>
          <Text style={styles.childBatch} numberOfLines={2}>
            {batchLine}
          </Text>
          <View style={styles.lastRow}>
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={16}
              color={EduForestColors.primary}
            />
            <Text style={styles.detailLine} numberOfLines={2}>
              {detailLine}
            </Text>
          </View>
        </View>
        <View style={styles.chevronWrap}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={EduForestColors.textTertiary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useSelector((s: RootState) => s.auth.user);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsByStudent, setRowsByStudent] = useState<
    Map<number, ParentAttendanceRow[]>
  >(new Map());
  const [parentLabel, setParentLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [pickingChild, setPickingChild] = useState(false);

  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const hydrated = useSelectionStore((s) => s.hydrated);

  const load = useCallback(async () => {
    setError(null);
    try {
      let label = user?.name?.split(/\s+/)[0] ?? '';
      try {
        const meRes = await getMe();
        if (meRes.status && meRes.data && typeof meRes.data === 'object') {
          const d = meRes.data as { firstName?: string };
          if (d.firstName) label = d.firstName;
        }
      } catch {
        /* optional */
      }
      setParentLabel(label);

      const stRes = await getMyStudents();
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setStudents([]);
        setRowsByStudent(new Map());
        setError(stRes.message || t('home.couldNotLoadStudents'));
        return;
      }

      const list = stRes.data;
      setStudents(list);

      const map = new Map<number, ParentAttendanceRow[]>();
      await Promise.all(
        list.map(async (s) => {
          try {
            const ar = await getStudentAttendance(
              s.id,
              0,
              PARENT_ATTENDANCE_PAGE_SIZE
            );
            if (ar.status && ar.data?.content) map.set(s.id, ar.data.content);
            else map.set(s.id, []);
          } catch {
            map.set(s.id, []);
          }
        })
      );
      setRowsByStudent(map);
      setLastUpdatedAt(Date.now());

      if (list.length === 1) {
        setSelected(list[0].id);
        setPickingChild(false);
      } else if (list.length > 1) {
        const stillValid =
          selectedStudentId != null &&
          list.some((s) => s.id === selectedStudentId);
        if (!stillValid) {
          setSelected(null);
          setPickingChild(true);
        } else {
          setPickingChild(false);
        }
      }
    } catch {
      setError(t('home.networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.name, t, setSelected, selectedStudentId]);

  useEffect(() => {
    if (!hydrated) return;
    void load();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps -- initial load after hydrate

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      void load();
    }, [hydrated, load])
  );

  const todayLine = useMemo(() => {
    const now = new Date();
    return t('home.todayPrefix', { date: format(now, 'MMM d, yyyy') });
  }, [t]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const secondsAgo = Math.floor((Date.now() - lastUpdatedAt) / 1000);
    if (secondsAgo < 60) return t('common.updatedJustNow');
    return t('common.updatedAt', {
      time: formatLocalDateTime(lastUpdatedAt),
    });
  }, [lastUpdatedAt, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const gm =
      h < 12
        ? t('greeting.morning')
        : h < 17
          ? t('greeting.afternoon')
          : t('greeting.evening');
    const name =
      parentLabel || user?.name?.split(/\s+/)[0] || t('common.parent');
    return t('home.waveGreeting', { greeting: gm, name });
  }, [parentLabel, user?.name, t]);

  const activeStudent =
    students.find((s) => s.id === selectedStudentId) ??
    (students.length === 1 ? students[0] : null);

  const showPicker =
    students.length > 1 && (pickingChild || !activeStudent);

  const openModule = (action: ChildChipAction) => {
    if (!activeStudent) return;
    setSelected(activeStudent.id);
    if (action === 'bus') {
      navigation.navigate('BusTrackingMap', { studentId: activeStudent.id });
      return;
    }
    navigation.navigate('ChildHub', {
      studentId: activeStudent.id,
      section: action,
    });
  };

  const selectChild = (id: number) => {
    setSelected(id);
    setPickingChild(false);
  };

  if (loading || !hydrated) {
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={EduForestColors.primary} />
            <Text style={styles.loadingText}>{t('home.loadingDashboard')}</Text>
          </View>
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  if (!showPicker && activeStudent) {
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ChildDashboard
            student={activeStudent}
            siblings={students}
            greeting={`👋 ${greeting}`}
            onChangeChild={(id) => selectChild(id)}
            onOpenModule={openModule}
            onShowAllChildren={
              students.length > 1
                ? () => {
                    setPickingChild(true);
                  }
                : undefined
            }
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  return (
    <ScreenDecor>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={EduForestColors.primary}
          />
        }
      >
        <Text style={styles.greeting}>👋 {greeting}</Text>
        <Text style={styles.todayLine}>{todayLine}</Text>
        {lastUpdatedLabel ? (
          <Text style={styles.lastUpdated}>{lastUpdatedLabel}</Text>
        ) : null}

        {error ? (
          <View style={styles.errBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={EduForestColors.dangerStrong}
            />
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.selectChild')}</Text>
          <Text style={styles.sectionHint}>{t('home.tapToOpenDashboard')}</Text>
        </View>

        {students.length === 0 && !error ? (
          <EmptyState
            icon="account-child-outline"
            title={t('home.noStudentsTitle')}
            message={t('home.noStudentsMessage')}
          />
        ) : (
          students.map((s) => (
            <ChildPickerCard
              key={s.id}
              item={s}
              onPress={() => selectChild(s.id)}
              rows={rowsByStudent.get(s.id) ?? []}
              t={t}
            />
          ))
        )}
      </ScrollView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: EduForestColors.background },
  scrollContent: {
    paddingHorizontal: EduForestSpacing.lg,
    paddingBottom: 36,
    paddingTop: EduForestSpacing.md,
    backgroundColor: EduForestColors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EduForestSpacing.xl,
    backgroundColor: EduForestColors.background,
  },
  loadingText: {
    ...EduForestTypography.body,
    marginTop: EduForestSpacing.base,
    color: EduForestColors.textSecondary,
  },
  greeting: {
    ...EduForestTypography.h2,
    color: EduForestColors.textPrimary,
    marginTop: EduForestSpacing.md,
  },
  todayLine: {
    ...EduForestTypography.body,
    color: EduForestColors.textSecondary,
    marginTop: EduForestSpacing.xs,
  },
  lastUpdated: {
    ...EduForestTypography.smallSemiBold,
    color: EduForestColors.primary,
    marginTop: EduForestSpacing.xs,
  },
  sectionHeader: {
    marginTop: EduForestSpacing.xl,
    marginBottom: EduForestSpacing.md,
    gap: EduForestSpacing.xs,
  },
  sectionTitle: {
    ...EduForestTypography.h2,
    color: EduForestColors.textPrimary,
  },
  sectionHint: {
    ...EduForestTypography.small,
    color: EduForestColors.textTertiary,
  },
  childCard: {
    ...eduForestCardShell,
    flexDirection: 'row',
    alignItems: 'center',
    padding: EduForestSpacing.base,
    marginBottom: EduForestSpacing.md,
    gap: EduForestSpacing.md,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: EduForestRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    color: EduForestColors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  childCardBody: { flex: 1, minWidth: 0 },
  childTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: EduForestSpacing.sm,
  },
  childName: {
    ...EduForestTypography.bodySemiBold,
    color: EduForestColors.textPrimary,
    flex: 1,
  },
  childMeta: {
    ...EduForestTypography.small,
    color: EduForestColors.textTertiary,
    marginTop: EduForestSpacing.xs,
  },
  childBatch: {
    ...EduForestTypography.small,
    color: EduForestColors.textTertiary,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: EduForestRadius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: {
    ...EduForestTypography.smallSemiBold,
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  detailLine: {
    ...EduForestTypography.small,
    color: EduForestColors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: EduForestColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: EduForestSpacing.md,
    borderRadius: EduForestRadius.md,
    marginTop: EduForestSpacing.md,
    backgroundColor: EduForestColors.dangerLight,
  },
  errText: {
    ...EduForestTypography.body,
    flex: 1,
    color: EduForestColors.dangerStrong,
  },
});
