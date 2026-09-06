import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  cancelStudentLeave,
  getMyStudents,
  getStudentLeaves,
  type ParentLeaveItem,
  type ParentStudent,
} from '../services/parent';
import { ApplyLeaveScreen } from '../features/leaves/ApplyLeaveScreen';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { shadows, spacing, useAppColors, type AppColors } from '../theme/appTheme';
import {
  ConfirmationPopup,
  StatusPopup,
  useAppLanguage,
  type StatusPopupVariant,
} from '../common';
import type { AppLanguage } from '../common/contexts/parentTranslations';
import { formatAppDate } from '../utils/appDateLocale';
import { useHubAwareBack } from '../navigation/ChildHubNavContext';

const LEAVE_TYPES = ['SICK', 'CASUAL', 'EMERGENCY', 'OTHER'] as const;

type LeaveType = (typeof LEAVE_TYPES)[number];
type LeaveTab = 'all' | 'pending' | 'approved' | 'declined';
type LeaveKind = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type Props = { embedded?: boolean };

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
  } catch {
    return null;
  }
}

function formatShortDate(
  value: string | null | undefined,
  language: AppLanguage
): string {
  const date = parseDay(value);
  if (!date) return '—';
  return formatAppDate(date, 'd MMM yyyy', language);
}

function sessionLabelKey(session: string | null | undefined): string {
  if (session === 'FIRST_HALF') return 'leaves.sessionFirstHalf';
  if (session === 'SECOND_HALF') return 'leaves.sessionSecondHalf';
  return 'leaves.sessionFull';
}

function formatLeaveRange(
  item: ParentLeaveItem,
  t: (key: any) => string,
  language: AppLanguage
): string {
  const fromSession = item.fromSession || 'FULL';
  const toSession = item.toSession || 'FULL';
  const fromPart =
    fromSession === 'FULL'
      ? formatShortDate(item.fromDate, language)
      : `${formatShortDate(item.fromDate, language)} (${t(sessionLabelKey(fromSession) as any)})`;
  if (item.fromDate === item.toDate && fromSession === toSession) {
    return fromPart;
  }
  if (item.fromDate === item.toDate) {
    return `${formatShortDate(item.fromDate, language)} (${t(
      sessionLabelKey(fromSession) as any
    )} → ${t(sessionLabelKey(toSession) as any)})`;
  }
  const toPart =
    toSession === 'FULL'
      ? formatShortDate(item.toDate, language)
      : `${formatShortDate(item.toDate, language)} (${t(sessionLabelKey(toSession) as any)})`;
  return `${fromPart} – ${toPart}`;
}

function leaveDays(item: ParentLeaveItem): number {
  const from = parseDay(item.fromDate);
  const to = parseDay(item.toDate);
  if (!from || !to) return 1;
  return Math.max(1, differenceInCalendarDays(to, from) + 1);
}

function durationLabel(
  item: ParentLeaveItem,
  t: (key: any, params?: Record<string, string | number>) => string
): string {
  if (
    item.fromDate === item.toDate &&
    item.fromSession &&
    item.fromSession !== 'FULL'
  ) {
    return t(sessionLabelKey(item.fromSession) as any);
  }
  const n = leaveDays(item);
  return n === 1 ? t('leaves.daysOne') : t('leaves.daysCount', { count: n });
}

function formatReviewedAt(
  value: string | null | undefined,
  language: AppLanguage
): string {
  if (!value) return '';
  try {
    const trimmed = value.trim();
    const hasZone = /Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);
    const iso = hasZone
      ? trimmed
      : trimmed.includes('T')
        ? `${trimmed}Z`
        : `${trimmed}T00:00:00Z`;
    return formatAppDate(parseISO(iso), 'd MMM yyyy, h:mm a', language);
  } catch {
    return value;
  }
}

function leaveKind(status: string): LeaveKind {
  const u = (status || '').toUpperCase();
  if (u.includes('APPROV')) return 'APPROVED';
  if (u.includes('REJECT') || u.includes('DECLIN')) return 'REJECTED';
  if (u.includes('CANCEL')) return 'CANCELLED';
  return 'PENDING';
}

function dateRail(item: ParentLeaveItem, language: AppLanguage) {
  const from = parseDay(item.fromDate);
  const to = parseDay(item.toDate) ?? from;
  if (!from || !to) {
    return { month: '—', days: '—', year: '', week: '' };
  }
  const same = format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
  return {
    month: formatAppDate(from, 'MMM', language).toUpperCase(),
    days: same ? format(from, 'd') : `${format(from, 'd')}–${format(to, 'd')}`,
    year: format(from, 'yyyy'),
    week: same
      ? formatAppDate(from, 'EEE', language)
      : `${formatAppDate(from, 'EEE', language)}–${formatAppDate(to, 'EEE', language)}`,
  };
}

function statusTheme(colors: AppColors): Record<
  LeaveKind,
  { accent: string; soft: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }
> {
  return {
    PENDING: { accent: colors.warning, soft: colors.warningSoft, icon: 'clock-outline' },
    APPROVED: { accent: colors.success, soft: colors.successSoft, icon: 'check' },
    REJECTED: { accent: colors.danger, soft: colors.dangerSoft, icon: 'close' },
    CANCELLED: { accent: colors.textSecondary, soft: colors.surfaceMuted, icon: 'minus' },
  };
}

function LeavesOverviewCard({
  total,
  approved,
  pending,
}: {
  total: number;
  approved: number;
  pending: number;
}) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cells = [
    {
      value: total,
      label: t('leaves.statTotal'),
      color: colors.primary,
      icon: 'calendar-blank-outline' as const,
    },
    {
      value: approved,
      label: t('leaves.statApproved'),
      color: colors.success,
      icon: 'check-circle-outline' as const,
    },
    {
      value: pending,
      label: t('leaves.statPending'),
      color: '#EA580C',
      icon: 'clock-outline' as const,
    },
  ];
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        {cells.map((cell, index) => (
          <View
            key={cell.label}
            style={[
              styles.summaryCell,
              index < cells.length - 1 && styles.summaryCellBorder,
              index < cells.length - 1 && { borderRightColor: colors.divider },
            ]}
          >
            <MaterialCommunityIcons name={cell.icon} size={18} color={cell.color} />
            <Text style={[styles.summaryValue, { color: cell.color }]}>{String(cell.value)}</Text>
            <Text style={styles.summaryLabel} numberOfLines={2}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LeaveRequestCard({
  item,
  onPress,
}: {
  item: ParentLeaveItem;
  onPress: () => void;
}) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const kind = leaveKind(item.status);
  const theme = statusTheme(colors)[kind];
  const rail = dateRail(item, language);
  const statusLabel =
    kind === 'APPROVED'
      ? t('leaves.statusApproved')
      : kind === 'REJECTED'
        ? t('leaves.statusDeclined')
        : kind === 'CANCELLED'
          ? t('leaves.statusCancelled')
          : t('leaves.statusPending');
  const title = item.reason?.trim() || t(`leaves.type${item.leaveType}` as any);

  return (
    <Pressable onPress={onPress} style={styles.leaveCard}>
      <View style={[styles.dateRail, { backgroundColor: theme.soft, borderColor: theme.accent }]}>
        <Text style={[styles.railMonth, { color: theme.accent }]}>{rail.month}</Text>
        <Text style={[styles.railDays, { color: theme.accent }]}>{rail.days}</Text>
        <Text style={styles.railYear}>{rail.year}</Text>
        <Text style={styles.railWeek} numberOfLines={1}>
          {rail.week}
        </Text>
        <View style={[styles.railStatus, { backgroundColor: theme.accent }]}>
          <MaterialCommunityIcons name={theme.icon} size={11} color={colors.headerOn} />
          <Text style={styles.railStatusText}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.leaveBody}>
        <Text style={styles.leaveTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.metaLine}>
          <MaterialCommunityIcons name="calendar-range" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText} numberOfLines={2}>
            {formatLeaveRange(item, t, language)} ({durationLabel(item, t)})
          </Text>
        </View>
        <View style={styles.metaLine}>
          <MaterialCommunityIcons name="tag-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {t(`leaves.type${item.leaveType}` as any)}
          </Text>
        </View>
        {kind === 'REJECTED' && item.reviewNote ? (
          <Text style={styles.declineNote} numberOfLines={3}>
            {t('leaves.reasonLabel')}: {item.reviewNote}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
    </Pressable>
  );
}

export function LeaveScreen({ embedded = false }: Props) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentLeaveItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<LeaveTab>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LeaveType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<ParentLeaveItem | null>(null);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
  } | null>(null);
  const [cancelItem, setCancelItem] = useState<ParentLeaveItem | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const load = useCallback(
    async (isRefresh = false) => {
      if (studentId == null) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [studentsRes, leavesRes] = await Promise.all([
          getMyStudents(),
          getStudentLeaves(studentId),
        ]);
        if (studentsRes.status && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        }
        if (leavesRes.status && leavesRes.data) {
          setItems(leavesRes.data.leaves || []);
        } else {
          setItems([]);
          setError(leavesRes.message || t('leaves.loadFailed'));
        }
      } catch (e: any) {
        setItems([]);
        setError(e?.message || t('leaves.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const approved = items.filter((item) => leaveKind(item.status) === 'APPROVED').length;
    const pending = items.filter((item) => leaveKind(item.status) === 'PENDING').length;
    return { total: items.length, approved, pending };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const kind = leaveKind(item.status);
      const tabOk =
        tab === 'all'
          ? true
          : tab === 'pending'
            ? kind === 'PENDING'
            : tab === 'approved'
              ? kind === 'APPROVED'
              : kind === 'REJECTED' || kind === 'CANCELLED';
      const typeOk = typeFilter === 'all' || item.leaveType === typeFilter;
      return tabOk && typeOk;
    });
  }, [items, tab, typeFilter]);

  const goBack = useHubAwareBack();

  const onCancel = (item: ParentLeaveItem) => {
    if (studentId == null) return;
    setCancelItem(item);
  };

  const confirmCancelLeave = async () => {
    if (studentId == null || cancelItem == null || cancelLoading) return;
    setCancelLoading(true);
    try {
      const res = await cancelStudentLeave(studentId, cancelItem.id);
      if (!res.status) {
        throw new Error(res.message || t('leaves.cancelFailed'));
      }
      setCancelItem(null);
      setDetail(null);
      await load(true);
    } catch (e: any) {
      setStatus({ variant: 'error', title: e?.message || t('leaves.cancelFailed') });
    } finally {
      setCancelLoading(false);
    }
  };

  const tabs: { id: LeaveTab; label: string }[] = [
    { id: 'all', label: t('leaves.tabAll') },
    { id: 'pending', label: t('leaves.tabPending') },
    { id: 'approved', label: t('leaves.tabApproved') },
    { id: 'declined', label: t('leaves.tabDeclined') },
  ];

  const emptyCopy =
    tab === 'pending'
      ? { title: t('leaves.emptyPendingTitle'), message: t('leaves.emptyPendingMessage') }
      : tab === 'approved'
        ? { title: t('leaves.emptyApprovedTitle'), message: t('leaves.emptyApprovedMessage') }
        : tab === 'declined'
          ? { title: t('leaves.emptyDeclinedTitle'), message: t('leaves.emptyDeclinedMessage') }
          : { title: t('leaves.emptyTitle'), message: t('leaves.emptyDesc') };

  const applyAction = (
    <Pressable
      onPress={() => setShowForm(true)}
      hitSlop={6}
      style={styles.applyChip}
      accessibilityRole="button"
      accessibilityLabel={t('leaves.apply')}
    >
      <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
      <Text style={styles.applyChipText}>{t('leaves.applyCta')}</Text>
    </Pressable>
  );

  const formSheet =
    showForm && studentId != null ? (
      <Modal visible animationType="slide" onRequestClose={() => setShowForm(false)}>
        <ApplyLeaveScreen
          student={selectedStudent}
          studentId={studentId}
          onClose={() => setShowForm(false)}
          onApplied={() => {
            setShowForm(false);
            void load(true);
          }}
        />
      </Modal>
    ) : null;

  const detailSheet = (
    <Modal visible={detail != null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          <Pressable
            onPress={() => setDetail(null)}
            style={styles.sheetClose}
            accessibilityLabel={t('common.close')}
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </Pressable>
          {detail ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {detail.reason?.trim() || t(`leaves.type${detail.leaveType}` as any)}
              </Text>
              <Text style={styles.modalMeta}>
                {t(`leaves.type${detail.leaveType}` as any)} · {formatLeaveRange(detail, t, language)}
              </Text>
              <Text style={styles.modalMeta}>{durationLabel(detail, t)}</Text>
              {detail.status === 'APPROVED' || detail.status === 'REJECTED' ? (
                <Text style={styles.modalMeta}>
                  {detail.status === 'APPROVED' ? t('leaves.approvedBy') : t('leaves.rejectedBy')}
                  {': '}
                  {[detail.reviewedByName, detail.reviewedByRoleLabel]
                    .filter(Boolean)
                    .join(' · ') || t('leaves.reviewerUnknown')}
                  {detail.reviewedAt ? ` · ${formatReviewedAt(detail.reviewedAt, language)}` : ''}
                </Text>
              ) : null}
              {detail.reviewNote ? (
                <Text style={[styles.modalMeta, leaveKind(detail.status) === 'REJECTED' && { color: colors.danger }]}>
                  {t('leaves.reviewNote')}: {detail.reviewNote}
                </Text>
              ) : null}
              {detail.canCancel ? (
                <Pressable onPress={() => onCancel(detail)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>{t('leaves.cancelLeave')}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  if (studentId == null) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <EmptyState
            icon="account-child-outline"
            title={t('homework.pickStudentTitle')}
            message={t('homework.pickStudentMessage')}
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  const body = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.primary}
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('leaves.listTitle')}</Text>
        <Pressable
          onPress={() => setFilterOpen((v) => !v)}
          style={[styles.filterBtn, (filterOpen || typeFilter !== 'all') && styles.filterBtnActive]}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={18}
            color={filterOpen || typeFilter !== 'all' ? colors.headerOn : colors.primary}
          />
          <Text
            style={[
              styles.filterText,
              (filterOpen || typeFilter !== 'all') && styles.filterTextActive,
            ]}
          >
            {t('leaves.filter')}
          </Text>
        </Pressable>
      </View>

      {filterOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {(['all', ...LEAVE_TYPES] as const).map((name) => {
            const active = typeFilter === name;
            return (
              <Pressable
                key={name}
                onPress={() => setTypeFilter(name)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {name === 'all' ? t('leaves.filterAll') : t(`leaves.type${name}` as any)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t('leaves.loadFailed')} message={error} />
      ) : items.length === 0 || filtered.length === 0 ? (
        <EmptyState icon="calendar-remove" title={emptyCopy.title} message={emptyCopy.message} />
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => (
            <LeaveRequestCard key={item.id} item={item} onPress={() => setDetail(item)} />
          ))}
        </View>
      )}

      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
        <Text style={styles.infoText}>{t('leaves.schoolNote')}</Text>
      </View>
      {formSheet}
      {detailSheet}
    </ScrollView>
  );

  const popup = (
    <>
      <StatusPopup
        visible={status != null}
        variant={status?.variant}
        title={status?.title ?? ''}
        onDismiss={() => setStatus(null)}
      />
      <ConfirmationPopup
        isVisible={cancelItem != null}
        title={t('leaves.cancelTitle')}
        message={t('leaves.cancelMessage')}
        confirmText={t('leaves.cancelLeave')}
        confirmButtonColor={colors.danger}
        confirmLoading={cancelLoading}
        onCancel={() => {
          if (cancelLoading) return;
          setCancelItem(null);
        }}
        onConfirm={() => void confirmCancelLeave()}
      />
    </>
  );

  if (embedded) {
    return (
      <View style={styles.flex}>
        {body}
        {popup}
      </View>
    );
  }

  return (
    <View style={styles.standalone}>
      <StudentModuleHero
        title={t('leaves.title')}
        subtitle={t('leaves.subtitle')}
        student={selectedStudent}
        onBack={goBack}
        backAccessibilityLabel={t('leaves.backHome')}
        heroIcon="calendar-remove-outline"
        rightAction={applyAction}
      >
        <LeavesOverviewCard
          total={counts.total}
          approved={counts.approved}
          pending={counts.pending}
        />
      </StudentModuleHero>
      {body}
      {popup}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1 },
  standalone: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center' },
  applyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.headerOn,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  applyChipText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  summaryCard: {
    marginTop: 12,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
    zIndex: 3,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  summaryRow: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  summaryCellBorder: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.divider },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tabs: { gap: 8, marginTop: 8, marginBottom: 8, paddingRight: 8 },
  tabBtn: { alignItems: 'center', paddingHorizontal: 8 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
  tabLabelActive: { color: colors.primary },
  tabUnderline: { marginTop: 8, height: 3, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: colors.primary },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: colors.headerOn },
  chips: { gap: 8, paddingBottom: 14 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.headerOn },
  list: { gap: 12 },
  leaveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 10,
    ...shadows.card,
  },
  dateRail: {
    width: 78,
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  railMonth: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  railDays: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  railYear: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  railWeek: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginTop: 2 },
  railStatus: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  railStatusText: { color: colors.headerOn, fontSize: 9, fontWeight: '800' },
  leaveBody: { flex: 1, minWidth: 0, gap: 4 },
  leaveTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  metaLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  declineNote: { marginTop: 4, color: colors.danger, fontSize: 12, fontWeight: '600' },
  infoBanner: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  sheetClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    paddingRight: 40,
    marginBottom: 8,
  },
  modalMeta: { marginTop: 6, color: colors.textSecondary, fontSize: 14 },
  cancelBtn: {
    marginTop: 20,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.dangerSoft,
  },
  cancelBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  });
}
