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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import type { ComponentProps } from 'react';
import {
  getStudentAttendance,
  getStudentExams,
  getStudentFees,
  getStudentHomework,
  getStudentLeaves,
  getStudentSchoolCalendar,
  PARENT_ATTENDANCE_PAGE_SIZE,
  type ParentAttendanceRow,
  type ParentStudent,
} from '../services/parent';
import {
  getLiveBusLocation,
  getParentChildrenBuses,
  type ParentChildBus,
} from '../services/transport';
import { useUnreadNotificationCount } from '../common/hooks/useUnreadNotificationCount';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import { resolveTodayAttendance } from '../utils/dashboardHome';
import { formatApiTime } from '../utils/localDateTime';
import { useAppLanguage, type TranslationKey } from '../common';
import type { ChildChipAction } from '../components/ChildActionChips';
import {
  EduForestColors,
  EduForestRadius,
  EduForestSpacing,
  EduForestTypography,
  eduForestCardShell,
} from '../theme/eduForestTokens';
import { useFocusEffect } from '@react-navigation/native';

type ModuleDef = {
  action: ChildChipAction;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  labelKey: TranslationKey;
  iconBg: string;
  iconColor: string;
};

const MODULES: ModuleDef[] = [
  {
    action: 'attendance',
    icon: 'calendar-check',
    labelKey: 'childChips.attendance',
    iconBg: EduForestColors.primaryLight,
    iconColor: EduForestColors.primary,
  },
  {
    action: 'fees',
    icon: 'currency-inr',
    labelKey: 'childChips.fees',
    iconBg: EduForestColors.warningLight,
    iconColor: EduForestColors.warningStrong,
  },
  {
    action: 'homework',
    icon: 'book-open-outline',
    labelKey: 'childChips.homework',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
  },
  {
    action: 'exams',
    icon: 'clipboard-text-outline',
    labelKey: 'childChips.exams',
    iconBg: EduForestColors.secondaryLight,
    iconColor: EduForestColors.secondaryStrong,
  },
  {
    action: 'leaves',
    icon: 'calendar-account-outline',
    labelKey: 'childChips.leaves',
    iconBg: EduForestColors.successLight,
    iconColor: EduForestColors.successStrong,
  },
  {
    action: 'calendar',
    icon: 'calendar-month-outline',
    labelKey: 'childChips.calendar',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
  },
  {
    action: 'bus',
    icon: 'bus-side',
    labelKey: 'childChips.bus',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
  },
  {
    action: 'notifications',
    icon: 'bell-ring-outline',
    labelKey: 'childChips.notifications',
    iconBg: EduForestColors.dangerLight,
    iconColor: EduForestColors.dangerStrong,
  },
];

function formatInr(amount: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

function safeParseDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

type Props = {
  student: ParentStudent;
  siblings: ParentStudent[];
  onChangeChild: (id: number) => void;
  onOpenModule: (action: ChildChipAction) => void;
  onShowAllChildren?: () => void;
  greeting?: string;
};

export function ChildDashboard({
  student,
  siblings,
  onChangeChild,
  onOpenModule,
  onShowAllChildren,
  greeting,
}: Props) {
  const { t } = useAppLanguage();
  const unreadCount = useUnreadNotificationCount();

  const [rows, setRows] = useState<ParentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeDue, setFeeDue] = useState<number | null>(null);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [nextHomework, setNextHomework] = useState<string | null>(null);
  const [nextExam, setNextExam] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);
  const [busLine, setBusLine] = useState<string | null>(null);
  const [hasBus, setHasBus] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [attRes, feeRes, hwRes, examRes, leaveRes, calRes, busesRes] =
        await Promise.all([
          getStudentAttendance(student.id, 0, PARENT_ATTENDANCE_PAGE_SIZE).catch(
            () => null
          ),
          getStudentFees(student.id).catch(() => null),
          getStudentHomework(student.id).catch(() => null),
          getStudentExams(student.id).catch(() => null),
          getStudentLeaves(student.id).catch(() => null),
          getStudentSchoolCalendar(student.id).catch(() => null),
          getParentChildrenBuses().catch(() => null),
        ]);

      setRows(
        attRes?.status && attRes.data?.content ? attRes.data.content : []
      );

      if (feeRes?.status && feeRes.data) {
        setFeeDue(feeRes.data.totalDue ?? 0);
        setNextDueDate(feeRes.data.nextDueDate ?? null);
      } else {
        setFeeDue(null);
        setNextDueDate(null);
      }

      const today = startOfDay(new Date());
      const homeworks = hwRes?.status ? hwRes.data?.homeworks ?? [] : [];
      const upcomingHw = homeworks
        .map((h) => ({ h, d: safeParseDate(h.dueDate) }))
        .filter((x) => x.d && !isBefore(x.d, today))
        .sort((a, b) => (a.d!.getTime() > b.d!.getTime() ? 1 : -1))[0];
      setNextHomework(
        upcomingHw
          ? `${upcomingHw.h.title || t('dashboard.homeworkFallback')} · ${format(upcomingHw.d!, 'MMM d')}`
          : null
      );

      const exams = examRes?.status ? examRes.data?.exams ?? [] : [];
      const upcomingExam = exams
        .map((e) => ({ e, d: safeParseDate(e.startDate) }))
        .filter((x) => x.d && !isBefore(x.d, today))
        .sort((a, b) => (a.d!.getTime() > b.d!.getTime() ? 1 : -1))[0];
      setNextExam(
        upcomingExam
          ? `${upcomingExam.e.name} · ${format(upcomingExam.d!, 'MMM d')}`
          : null
      );

      const leaves = leaveRes?.status ? leaveRes.data?.leaves ?? [] : [];
      const pending = leaves.find(
        (l) => (l.status || '').toUpperCase() === 'PENDING'
      );
      setPendingLeave(
        pending
          ? `${pending.leaveType} · ${pending.fromDate}${
              pending.toDate && pending.toDate !== pending.fromDate
                ? ` → ${pending.toDate}`
                : ''
            }`
          : null
      );

      const events = calRes?.status ? calRes.data?.events ?? [] : [];
      const upcomingEvent = events
        .map((e) => ({ e, d: safeParseDate(e.startDate) }))
        .filter((x) => x.d && !isBefore(x.d, today))
        .sort((a, b) => (a.d!.getTime() > b.d!.getTime() ? 1 : -1))[0];
      setNextEvent(
        upcomingEvent
          ? `${upcomingEvent.e.title} · ${format(upcomingEvent.d!, 'MMM d')}`
          : null
      );

      const buses: ParentChildBus[] =
        busesRes?.status && Array.isArray(busesRes.data) ? busesRes.data : [];
      const childBus = buses.find((b) => b.studentId === student.id) ?? null;
      setHasBus(!!childBus);
      if (!childBus) {
        setBusLine(null);
      } else if (childBus.activeTripStatus === 'IN_PROGRESS') {
        try {
          const live = await getLiveBusLocation(childBus.busId, student.id);
          const eta = live.data?.estimatedArrivalMinutes;
          setBusLine(
            eta != null
              ? t('dashboard.busLiveEta', {
                  bus: childBus.busNumber,
                  eta: String(eta),
                })
              : t('dashboard.busLive', { bus: childBus.busNumber })
          );
        } catch {
          setBusLine(t('dashboard.busLive', { bus: childBus.busNumber }));
        }
      } else {
        setBusLine(t('dashboard.busNoTrip', { bus: childBus.busNumber }));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [student.id, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const { kind, row: todayRow } = useMemo(
    () => resolveTodayAttendance(rows),
    [rows]
  );

  const todayLabel =
    kind === 'present'
      ? t('attendance.status.present')
      : kind === 'absent'
        ? t('attendance.status.absent')
        : kind === 'late'
          ? t('attendance.status.late')
          : kind === 'leave'
            ? t('attendance.status.leave')
            : t('home.todayNotMarked');

  const todayDetail = useMemo(() => {
    if (todayRow) {
      // Class/batch is constant for the child — only show session time when present.
      return todayRow.startTime ? formatApiTime(todayRow.startTime) : '';
    }
    return t('home.noAttendanceYet');
  }, [todayRow, t]);

  const todayTone =
    kind === 'present'
      ? { fg: EduForestColors.successStrong, bg: EduForestColors.successLight }
      : kind === 'absent'
        ? { fg: EduForestColors.dangerStrong, bg: EduForestColors.dangerLight }
        : kind === 'late'
          ? {
              fg: EduForestColors.warningStrong,
              bg: EduForestColors.warningLight,
            }
          : kind === 'leave'
            ? {
                fg: EduForestColors.secondaryStrong,
                bg: EduForestColors.secondaryLight,
              }
            : {
                fg: EduForestColors.primaryStrong,
                bg: EduForestColors.primaryLight,
              };

  const feeTone =
    feeDue != null && feeDue > 0
      ? { fg: EduForestColors.dangerStrong, bg: EduForestColors.dangerLight }
      : { fg: EduForestColors.successStrong, bg: EduForestColors.successLight };

  const showLeaveShortcut = kind === 'not_marked' || kind === 'absent';
  const hue = avatarHue(student.name);
  const batchLine = student.batchNames?.length
    ? student.batchNames.join(' · ')
    : t('common.dash');

  const feeValue =
    feeDue == null
      ? t('dashboard.feesUnavailable')
      : feeDue <= 0
        ? t('dashboard.feesClear')
        : formatInr(feeDue);

  const feeSubtitle =
    feeDue != null && feeDue > 0
      ? nextDueDate
        ? t('dashboard.nextDue', { date: nextDueDate })
        : t('dashboard.viewFees')
      : feeDue === 0
        ? t('dashboard.feesClearSub')
        : t('dashboard.viewFees');

  const alertsLine =
    unreadCount > 0
      ? t('dashboard.alertsUnread', { count: unreadCount })
      : t('dashboard.alertsNone');

  const nextUpItems = [
    nextHomework
      ? {
          key: 'hw',
          icon: 'book-open-outline' as const,
          label: nextHomework,
          action: 'homework' as const,
          iconBg: '#F5F3FF',
          iconColor: '#7C3AED',
        }
      : null,
    nextExam
      ? {
          key: 'ex',
          icon: 'clipboard-text-outline' as const,
          label: nextExam,
          action: 'exams' as const,
          iconBg: EduForestColors.secondaryLight,
          iconColor: EduForestColors.secondaryStrong,
        }
      : null,
    nextEvent
      ? {
          key: 'ev',
          icon: 'calendar-month-outline' as const,
          label: nextEvent,
          action: 'calendar' as const,
          iconBg: '#DBEAFE',
          iconColor: '#1D4ED8',
        }
      : null,
    pendingLeave
      ? {
          key: 'lv',
          icon: 'calendar-account-outline' as const,
          label: pendingLeave,
          action: 'leaves' as const,
          iconBg: EduForestColors.successLight,
          iconColor: EduForestColors.successStrong,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    action: ChildChipAction;
    iconBg: string;
    iconColor: string;
  }>;

  if (loading && rows.length === 0 && feeDue == null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={EduForestColors.primary} />
        <Text style={styles.loadingText}>{t('dashboard.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
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
      {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}

      <View style={styles.identityCard}>
        <View
          style={[styles.avatar, { backgroundColor: `hsl(${hue} 45% 46%)` }]}
        >
          <Text style={styles.avatarText}>{initials(student.name)}</Text>
        </View>
        <View style={styles.identityTextCol}>
          <Text style={styles.identityName} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.identityMeta} numberOfLines={2}>
            {batchLine}
            {student.instituteName ? ` · ${student.instituteName}` : ''}
          </Text>
        </View>
        {siblings.length > 1 ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSwitcherOpen((v) => !v)}
            style={styles.switchBtn}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.switchChild')}
          >
            <MaterialCommunityIcons
              name="account-switch-outline"
              size={18}
              color={EduForestColors.primary}
            />
            <Text style={styles.switchBtnText}>{t('dashboard.switchChild')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {switcherOpen && siblings.length > 1 ? (
        <View style={styles.switcherPanel}>
          {siblings.map((s) => {
            const selected = s.id === student.id;
            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.85}
                onPress={() => {
                  setSwitcherOpen(false);
                  if (s.id !== student.id) onChangeChild(s.id);
                }}
                style={[
                  styles.switcherRow,
                  selected && styles.switcherRowSelected,
                ]}
              >
                <Text
                  style={[
                    styles.switcherName,
                    selected && styles.switcherNameSelected,
                  ]}
                >
                  {s.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={EduForestColors.primary}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
          {onShowAllChildren ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSwitcherOpen(false);
                onShowAllChildren();
              }}
              style={[styles.switcherRow, styles.switcherRowBorder]}
            >
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={18}
                  color={EduForestColors.primary}
                />
              </View>
              <Text style={styles.switcherAll}>{t('home.selectChild')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('dashboard.priorityTitle')}</Text>
      <View style={styles.featuredGrid}>
        <FeaturedCard
          icon="calendar-check"
          iconBg={todayTone.bg}
          iconColor={todayTone.fg}
          title={t('dashboard.today')}
          value={todayLabel}
          subtitle={todayDetail}
          onPress={() => onOpenModule('attendance')}
        />
        <FeaturedCard
          icon="currency-inr"
          iconBg={feeTone.bg}
          iconColor={feeTone.fg}
          title={t('childChips.fees')}
          value={feeValue}
          subtitle={feeSubtitle}
          onPress={() => onOpenModule('fees')}
        />
        <FeaturedCard
          icon="bell-ring-outline"
          iconBg={EduForestColors.primaryLight}
          iconColor={EduForestColors.primary}
          title={t('childChips.notifications')}
          value={alertsLine}
          subtitle={t('dashboard.tapAlerts')}
          onPress={() => onOpenModule('notifications')}
        />
        {hasBus ? (
          <FeaturedCard
            icon="bus-side"
            iconBg="#FEF3C7"
            iconColor="#B45309"
            title={t('childChips.bus')}
            value={busLine || t('dashboard.busOffline')}
            subtitle={t('dashboard.tapBus')}
            onPress={() => onOpenModule('bus')}
          />
        ) : null}
      </View>

      {showLeaveShortcut ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onOpenModule('leaves')}
          style={styles.leaveCta}
        >
          <View
            style={[
              styles.featuredIcon,
              { backgroundColor: EduForestColors.warningLight },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-plus"
              size={22}
              color={EduForestColors.warningStrong}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.leaveCtaTitle}>
              {t('dashboard.applyLeaveToday')}
            </Text>
            <Text style={styles.leaveCtaSub}>{t('childChips.leaves')}</Text>
          </View>
          <View style={styles.chevronWrap}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={EduForestColors.textTertiary}
            />
          </View>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionTitle}>{t('dashboard.nextUp')}</Text>
      <View style={styles.listCard}>
        {nextUpItems.length === 0 ? (
          <View style={styles.emptyNext}>
            <Text style={styles.emptyNextText}>{t('dashboard.nextUpEmpty')}</Text>
          </View>
        ) : (
          nextUpItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => onOpenModule(item.action)}
              style={[
                styles.listRow,
                index < nextUpItems.length - 1 && styles.listRowBorder,
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={item.iconColor}
                />
              </View>
              <Text style={styles.listRowText} numberOfLines={2}>
                {item.label}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={EduForestColors.textTertiary}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('dashboard.modules')}</Text>
      <View style={styles.featuredGrid}>
        {MODULES.map((m) => (
          <TouchableOpacity
            key={m.action}
            activeOpacity={0.85}
            onPress={() => onOpenModule(m.action)}
            style={styles.moduleCard}
          >
            <View style={[styles.featuredIcon, { backgroundColor: m.iconBg }]}>
              <MaterialCommunityIcons
                name={m.icon}
                size={22}
                color={m.iconColor}
              />
            </View>
            <Text style={styles.moduleTitle}>{t(m.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function FeaturedCard({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  subtitle,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.featuredCard}
    >
      <View style={[styles.featuredIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.featuredEyebrow}>{title}</Text>
      <Text style={[styles.featuredTitle, { color: iconColor }]} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.featuredSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EduForestSpacing.xl,
    backgroundColor: EduForestColors.background,
  },
  loadingText: {
    ...EduForestTypography.body,
    marginTop: EduForestSpacing.md,
    color: EduForestColors.textSecondary,
  },
  scroll: {
    paddingHorizontal: EduForestSpacing.base,
    paddingBottom: 36,
    paddingTop: EduForestSpacing.sm,
    gap: EduForestSpacing.sm,
    backgroundColor: EduForestColors.background,
  },
  greeting: {
    ...EduForestTypography.h2,
    color: EduForestColors.textPrimary,
    marginBottom: EduForestSpacing.xs,
  },
  identityCard: {
    ...eduForestCardShell,
    flexDirection: 'row',
    alignItems: 'center',
    gap: EduForestSpacing.md,
    padding: EduForestSpacing.base,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: EduForestRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: EduForestColors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  identityTextCol: { flex: 1, minWidth: 0 },
  identityName: {
    ...EduForestTypography.bodySemiBold,
    color: EduForestColors.textPrimary,
  },
  identityMeta: {
    ...EduForestTypography.small,
    color: EduForestColors.textTertiary,
    marginTop: 2,
  },
  switchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: EduForestRadius.md,
    backgroundColor: EduForestColors.primaryLight,
    gap: 2,
  },
  switchBtnText: {
    ...EduForestTypography.smallSemiBold,
    color: EduForestColors.primary,
  },
  switcherPanel: {
    ...eduForestCardShell,
    overflow: 'hidden',
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  switcherRowSelected: {
    backgroundColor: EduForestColors.primaryLight,
  },
  switcherRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EduForestColors.border,
  },
  switcherName: {
    ...EduForestTypography.bodyMedium,
    color: EduForestColors.textPrimary,
    flex: 1,
  },
  switcherNameSelected: {
    ...EduForestTypography.bodySemiBold,
    color: EduForestColors.primaryStrong,
  },
  switcherAll: {
    ...EduForestTypography.bodySemiBold,
    color: EduForestColors.primary,
    flex: 1,
    marginLeft: EduForestSpacing.sm,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: EduForestRadius.sm,
    backgroundColor: EduForestColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...EduForestTypography.h2,
    color: EduForestColors.textPrimary,
    marginTop: EduForestSpacing.md,
    marginBottom: EduForestSpacing.xs,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: EduForestSpacing.sm,
  },
  featuredCard: {
    ...eduForestCardShell,
    width: '48.5%',
    flexGrow: 1,
    padding: EduForestSpacing.md,
    minHeight: 132,
    gap: EduForestSpacing.sm,
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: EduForestRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEyebrow: {
    ...EduForestTypography.smallSemiBold,
    color: EduForestColors.textTertiary,
  },
  featuredTitle: {
    ...EduForestTypography.bodySemiBold,
  },
  featuredSubtitle: {
    ...EduForestTypography.small,
    color: EduForestColors.textSecondary,
  },
  leaveCta: {
    ...eduForestCardShell,
    flexDirection: 'row',
    alignItems: 'center',
    gap: EduForestSpacing.md,
    padding: EduForestSpacing.base,
  },
  leaveCtaTitle: {
    ...EduForestTypography.bodySemiBold,
    color: EduForestColors.textPrimary,
  },
  leaveCtaSub: {
    ...EduForestTypography.small,
    color: EduForestColors.textTertiary,
    marginTop: 2,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: EduForestColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCard: {
    ...eduForestCardShell,
    overflow: 'hidden',
  },
  emptyNext: {
    padding: EduForestSpacing.base,
    alignItems: 'center',
  },
  emptyNextText: {
    ...EduForestTypography.body,
    color: EduForestColors.textSecondary,
    textAlign: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: EduForestSpacing.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: EduForestColors.borderLight,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: EduForestRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowText: {
    ...EduForestTypography.bodyMedium,
    color: EduForestColors.textPrimary,
    flex: 1,
  },
  moduleCard: {
    ...eduForestCardShell,
    width: '23%',
    minWidth: 72,
    flexGrow: 1,
    maxWidth: '48.5%',
    paddingVertical: EduForestSpacing.md,
    paddingHorizontal: EduForestSpacing.sm,
    alignItems: 'center',
    gap: EduForestSpacing.sm,
  },
  moduleTitle: {
    ...EduForestTypography.smallSemiBold,
    color: EduForestColors.textPrimary,
    textAlign: 'center',
  },
});
