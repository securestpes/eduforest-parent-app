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
  getMyStudents,
  getStudentHomework,
  getStudentHomeworkDetail,
  markStudentHomeworkDone,
  unmarkStudentHomeworkDone,
  type ParentHomeworkDetail,
  type ParentHomeworkItem,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { shadows, spacing, useAppColors, type AppColors } from '../theme/appTheme';
import { StatusPopup, useAppLanguage, type StatusPopupVariant } from '../common';
import type { AppLanguage } from '../common/contexts/parentTranslations';
import { formatAppDate } from '../utils/appDateLocale';
import { useHubAwareBack } from '../navigation/ChildHubNavContext';
import { HomeworkTaskCard } from '../features/homework/components/HomeworkTaskCard';
import { HomeworkAttachments } from '../features/homework/components/HomeworkAttachments';
import {
  parseHomeworkDate,
  resolveHomeworkStatus,
  type HomeworkUiStatus,
} from '../features/homework/utils/homeworkStatus';

type Props = { embedded?: boolean };
type HomeworkTab = 'pending' | 'completed';

function formatShortDate(
  value: string | null | undefined,
  language: AppLanguage
): string {
  const date = parseHomeworkDate(value);
  if (!date) return '—';
  return formatAppDate(date, 'd MMM yyyy', language);
}

function dueSortKey(item: ParentHomeworkItem): number {
  const due = parseHomeworkDate(item.dueDate);
  return due ? due.getTime() : Number.MAX_SAFE_INTEGER;
}

function HomeworkSummaryCard({
  pending,
  done,
  overdue,
}: {
  pending: number;
  done: number;
  overdue: number;
}) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const total = pending + done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLine}>
        {t('homework.summaryLine', { pending, done })}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      {overdue > 0 ? (
        <Text style={styles.overdueHint}>
          {t('homework.overdueCount', { count: overdue })}
        </Text>
      ) : null}
    </View>
  );
}

export function HomeworkScreen({ embedded = false }: Props) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentHomeworkItem[]>([]);
  const [hasEnrollment, setHasEnrollment] = useState(true);
  const [tab, setTab] = useState<HomeworkTab>('pending');
  const [subject, setSubject] = useState<string>('all');
  const [detail, setDetail] = useState<ParentHomeworkDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
  } | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const today = useMemo(() => new Date(), [items.length]);

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
        const [studentsRes, homeworkRes] = await Promise.all([
          getMyStudents(),
          getStudentHomework(studentId),
        ]);
        if (studentsRes.status && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        }
        if (!homeworkRes.status || !homeworkRes.data) {
          setError(homeworkRes.message || t('homework.loadFailed'));
          setItems([]);
          return;
        }
        const data = homeworkRes.data;
        setItems(Array.isArray(data.homeworks) ? data.homeworks : []);
        setHasEnrollment(data.sessionId != null || (data.homeworks?.length ?? 0) > 0);
      } catch (e: any) {
        setError(e?.message || t('homework.loadFailed'));
        setItems([]);
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

  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: resolveHomeworkStatus(item, today) })),
    [items, today]
  );

  const counts = useMemo(() => {
    const pending = withStatus.filter((x) => x.status !== 'submitted').length;
    const done = withStatus.filter((x) => x.status === 'submitted').length;
    const overdue = withStatus.filter((x) => x.status === 'overdue').length;
    return { pending, done, overdue };
  }, [withStatus]);

  const subjects = useMemo(() => {
    const names = [
      ...new Set(
        items
          .map((item) => item.subjectName?.trim())
          .filter((name): name is string => Boolean(name))
      ),
    ];
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [items]);

  useEffect(() => {
    if (subject !== 'all' && !subjects.includes(subject)) {
      setSubject('all');
    }
  }, [subject, subjects]);

  const filtered = useMemo(() => {
    const inTab = withStatus.filter(({ status }) =>
      tab === 'completed' ? status === 'submitted' : status !== 'submitted'
    );
    const inSubject =
      subject === 'all'
        ? inTab
        : inTab.filter(
            ({ item }) => (item.subjectName || '').trim() === subject
          );
    return [...inSubject].sort((a, b) =>
      tab === 'completed'
        ? dueSortKey(b.item) - dueSortKey(a.item)
        : dueSortKey(a.item) - dueSortKey(b.item)
    );
  }, [withStatus, tab, subject]);

  const applyHomework = (row: ParentHomeworkItem) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === row.id
          ? { ...it, status: row.status, completedAt: row.completedAt ?? null }
          : it
      )
    );
    setDetail((current) =>
      current && current.id === row.id
        ? { ...current, status: row.status, completedAt: row.completedAt ?? null }
        : current
    );
  };

  const toggleDone = async (item: ParentHomeworkItem, markDone: boolean) => {
    if (studentId == null || togglingId != null) return;
    setTogglingId(item.id);
    try {
      const res = markDone
        ? await markStudentHomeworkDone(studentId, item.id)
        : await unmarkStudentHomeworkDone(studentId, item.id);
      if (!res.status || !res.data) {
        setStatus({ variant: 'error', title: res.message || t('homework.markDoneFailed') });
        return;
      }
      applyHomework(res.data);
    } catch (e: any) {
      setStatus({ variant: 'error', title: e?.message || t('homework.markDoneFailed') });
    } finally {
      setTogglingId(null);
    }
  };

  const openDetail = async (item: ParentHomeworkItem) => {
    if (studentId == null) return;
    setDetailLoading(true);
    try {
      const res = await getStudentHomeworkDetail(studentId, item.id);
      if (res.status && res.data) {
        setDetail(res.data);
      } else {
        setError(res.message || t('homework.loadFailed'));
      }
    } catch (e: any) {
      setError(e?.message || t('homework.loadFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const goBack = useHubAwareBack();

  const detailSheet = (
    <Modal
      visible={detail != null || detailLoading}
      animationType="slide"
      transparent
      onRequestClose={() => setDetail(null)}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          <Pressable
            onPress={() => setDetail(null)}
            style={styles.sheetClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </Pressable>
          {detailLoading || !detail ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{detail.title}</Text>
              <Text style={styles.modalMeta}>
                {[detail.subjectName, detail.className, detail.sectionName]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.modalMeta}>
                {detail.dueDate
                  ? t('homework.due', { date: formatShortDate(detail.dueDate, language) })
                  : t('homework.noDue')}
                {detail.assignedBy
                  ? ` · ${t('homework.byTeacher', { name: detail.assignedBy })}`
                  : ''}
              </Text>

              {detail.description ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.modalSection}>{t('homework.description')}</Text>
                  <Text style={styles.modalBody}>{detail.description}</Text>
                </View>
              ) : null}

              {detail.attachmentUrls?.length ? (
                <HomeworkAttachments
                  urls={detail.attachmentUrls}
                  title={detail.title}
                  assignedDate={detail.assignedDate}
                />
              ) : null}

              <Pressable
                style={[
                  styles.markBtn,
                  resolveHomeworkStatus(detail) === 'submitted' && styles.undoBtn,
                ]}
                disabled={togglingId === detail.id}
                onPress={() =>
                  void toggleDone(detail, resolveHomeworkStatus(detail) !== 'submitted')
                }
              >
                {togglingId === detail.id ? (
                  <ActivityIndicator color={colors.headerOn} />
                ) : (
                  <Text style={styles.markBtnText}>
                    {resolveHomeworkStatus(detail) === 'submitted'
                      ? t('homework.undoDone')
                      : t('homework.markDone')}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          )}
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
      <View style={styles.tabs}>
        {(
          [
            ['pending', counts.pending, 'homework.tabPending'],
            ['completed', counts.done, 'homework.tabCompleted'],
          ] as const
        ).map(([id, count, labelKey]) => {
          const active = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[styles.tabBtn, active ? styles.tabBtnActive : styles.tabBtnIdle]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextIdle]}>
                {t(labelKey, { count })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {subjects.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {['all', ...subjects].map((name) => {
            const active = subject === name;
            const label = name === 'all' ? t('homework.filterAll') : name;
            return (
              <Pressable
                key={name}
                onPress={() => setSubject(name)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
        <EmptyState icon="alert-circle-outline" title={t('homework.loadFailed')} message={error} />
      ) : !hasEnrollment && items.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title={t('homework.emptyTitle')}
          message={t('homework.noEnrollment')}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="book-open-page-variant-outline"
          title={t('homework.emptyTitle')}
          message={t('homework.emptyMessage')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="book-open-page-variant-outline"
          title={
            tab === 'completed'
              ? t('homework.emptyCompletedTitle')
              : t('homework.emptyPendingTitle')
          }
          message={
            tab === 'completed'
              ? t('homework.emptyCompletedMessage')
              : t('homework.emptyPendingMessage')
          }
        />
      ) : (
        <View style={styles.list}>
          {filtered.map(({ item, status }) => (
            <HomeworkTaskCard
              key={item.id}
              item={item}
              status={status as HomeworkUiStatus}
              onPress={() => void openDetail(item)}
              toggling={togglingId === item.id}
              onToggleDone={() => void toggleDone(item, status !== 'submitted')}
            />
          ))}
        </View>
      )}

      <Text style={styles.hint}>{t('homework.tapHint')}</Text>
      {detailSheet}
    </ScrollView>
  );

  const popup = (
    <StatusPopup
      visible={status != null}
      variant={status?.variant}
      title={status?.title ?? ''}
      onDismiss={() => setStatus(null)}
    />
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
        title={t('homework.title')}
        subtitle={t('homework.subtitle')}
        student={selectedStudent}
        onBack={goBack}
        backAccessibilityLabel={t('homework.backHome')}
        heroIcon="book-open-page-variant-outline"
      >
        <HomeworkSummaryCard
          pending={counts.pending}
          done={counts.done}
          overdue={counts.overdue}
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
  summaryCard: {
    marginTop: 12,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
    zIndex: 3,
    padding: 16,
  },
  summaryLine: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  overdueHint: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabTextActive: { color: colors.headerOn },
  tabTextIdle: { color: colors.primary },
  chips: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.headerOn,
  },
  list: { gap: 12 },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '82%',
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
  },
  modalMeta: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalSection: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  markBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  undoBtn: {
    backgroundColor: colors.textSecondary,
  },
  markBtnText: {
    color: colors.headerOn,
    fontWeight: '700',
    fontSize: 15,
  },
  });
}
