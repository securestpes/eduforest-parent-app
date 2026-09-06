import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  getMyStudents,
  getStudentExamDetail,
  getStudentExamReportCard,
  getStudentExams,
  type ParentExamDetail,
  type ParentExamListItem,
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
import { savePdfToDevice } from '../utils/savePdfToDevice';
import { toTitleCase } from '../utils/toTitleCase';
import { navigateToTab } from '../navigation/navigationRef';
import { useHubAwareBack } from '../navigation/ChildHubNavContext';
import type { RootStackParamList } from '../navigation/Navigation';
import { subjectVisual } from '../features/homework/utils/homeworkStatus';

type Props = {
  embedded?: boolean;
  highlightExamId?: number;
  initialTab?: ExamsTab;
};
type ExamsTab = 'upcoming' | 'results' | 'completed';

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

function formatClock(value: string | null | undefined, language: AppLanguage): string | null {
  if (!value) return null;
  const parts = value.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h)) return null;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return formatAppDate(date, 'h:mm a', language);
}

function formatMarks(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function hasResults(item: ParentExamListItem): boolean {
  return Boolean(item.resultsReady) && (item.percent != null || item.partialResults);
}

function countdownLabel(
  item: ParentExamListItem,
  today: Date,
  t: (key: any, params?: Record<string, string | number>) => string
): string {
  const day = parseDay(item.nextPaperDate || item.startDate);
  if (!day) return '';
  const days = differenceInCalendarDays(startOfDay(day), startOfDay(today));
  if (days <= 0) return t('exams.today');
  if (days === 1) return t('exams.inOneDay');
  return t('exams.inDays', { count: days });
}

function ExamOverviewCard({
  upcoming,
  completed,
  results,
}: {
  upcoming: number;
  completed: number;
  results: number;
}) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cells = [
    { value: upcoming, label: t('exams.statUpcoming'), color: colors.primary, icon: 'calendar-blank-outline' as const },
    { value: completed, label: t('exams.statCompleted'), color: colors.success, icon: 'check-circle-outline' as const },
    { value: results, label: t('exams.statResults'), color: colors.primary, icon: 'chart-bar' as const },
  ];
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('exams.overview')}</Text>
      <View style={styles.summaryRow}>
        {cells.map((cell, index) => (
          <View
            key={cell.label}
            style={[styles.summaryCell, index < cells.length - 1 && styles.summaryCellBorder]}
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

export function ExamResultsScreen({
  embedded = false,
  highlightExamId,
  initialTab,
}: Props) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentExamListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ExamsTab>(initialTab ?? 'upcoming');
  const [detail, setDetail] = useState<ParentExamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
        const [studentsRes, examsRes] = await Promise.all([
          getMyStudents(),
          getStudentExams(studentId),
        ]);
        if (studentsRes.status && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        }
        if (examsRes.status && examsRes.data) {
          setItems(examsRes.data.exams || []);
        } else {
          setItems([]);
          setError(examsRes.message || t('exams.loadFailed'));
        }
      } catch (e: any) {
        setItems([]);
        setError(e?.message || t('exams.loadFailed'));
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

  const openDetail = async (examId: number) => {
    if (studentId == null) return;
    setDetailLoading(true);
    try {
      const res = await getStudentExamDetail(studentId, examId);
      if (res.status && res.data) {
        setDetail(res.data);
      } else {
        setStatus({ variant: 'error', title: res.message || t('exams.detailFailed') });
      }
    } catch (e: any) {
      setStatus({ variant: 'error', title: e?.message || t('exams.detailFailed') });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (highlightExamId == null || studentId == null) return;
    void openDetail(highlightExamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightExamId, studentId]);

  const upcoming = useMemo(() => {
    const start = startOfDay(today);
    return [...items]
      .filter((item) => {
        const end = parseDay(item.endDate);
        return end ? !isNaN(end.getTime()) && end >= start : false;
      })
      .sort((a, b) => {
        const da = parseDay(a.nextPaperDate || a.startDate)?.getTime() ?? 0;
        const db = parseDay(b.nextPaperDate || b.startDate)?.getTime() ?? 0;
        return da - db;
      });
  }, [items, today]);

  const completed = useMemo(() => {
    const start = startOfDay(today);
    return [...items]
      .filter((item) => {
        const end = parseDay(item.endDate);
        return end ? end < start : false;
      })
      .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)));
  }, [items, today]);

  const results = useMemo(
    () => items.filter(hasResults).sort((a, b) => String(b.endDate).localeCompare(String(a.endDate))),
    [items]
  );

  const tabSettled = useRef(Boolean(initialTab));

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      tabSettled.current = true;
    }
  }, [initialTab, studentId]);

  useEffect(() => {
    if (tabSettled.current || loading) return;
    if (upcoming.length === 0 && results.length > 0) {
      setTab('results');
    }
    tabSettled.current = true;
  }, [loading, upcoming.length, results.length]);

  const featured = upcoming[0] ?? null;
  const restUpcoming = upcoming.slice(1);

  const resultHeadline = (item: ParentExamListItem | ParentExamDetail) => {
    if (item.partialResults || item.resultLabel === 'PARTIAL') {
      return t('exams.partialResults', {
        released: item.releasedSubjects ?? item.scoredSubjects,
        total: item.subjectCount,
      });
    }
    if (item.percent != null) return `${formatMarks(item.percent)}%`;
    return t('exams.pendingMarks');
  };

  const resultColor = (item: ParentExamListItem | ParentExamDetail) => {
    if (item.partialResults || item.resultLabel === 'PARTIAL') return colors.primary;
    if (item.percent == null) return colors.textSecondary;
    return item.passed ? colors.success : colors.danger;
  };

  const downloadReportCard = async () => {
    if (studentId == null || detail == null || downloading) return;
    if (!detail.resultsReady) return;
    setDownloading(true);
    try {
      const res = await getStudentExamReportCard(studentId, detail.examId);
      if (!res.status || !res.data?.contentBase64) {
        throw new Error(res.message || t('exams.reportCardFailed'));
      }
      const result = await savePdfToDevice({
        fileName: res.data.fileName || `ReportCard_${detail.name}.pdf`,
        contentBase64: res.data.contentBase64,
        mimeType: res.data.mimeType || 'application/pdf',
      });
      if (result === 'cancelled') return;
      setStatus({
        variant: 'success',
        title: result === 'shared' ? t('exams.reportCardShared') : t('exams.reportCardSaved'),
      });
    } catch (e: any) {
      setStatus({ variant: 'error', title: e?.message || t('exams.reportCardFailed') });
    } finally {
      setDownloading(false);
    }
  };

  const goBack = useHubAwareBack();

  const openCalendar = () => {
    if (studentId == null) return;
    navigation.navigate('ChildHub', { studentId, section: 'calendar' });
  };

  const renderCompactCard = (item: ParentExamListItem) => {
    const visual = subjectVisual(item.subjectNames?.[0] || item.name);
    return (
      <Pressable
        key={item.examId}
        onPress={() => void openDetail(item.examId)}
        style={styles.compactCard}
      >
        <View style={[styles.compactBar, { backgroundColor: visual.tint }]} />
        <View style={[styles.compactIcon, { backgroundColor: visual.bg }]}>
          <MaterialCommunityIcons name={visual.icon} size={20} color={visual.tint} />
        </View>
        <View style={styles.compactBody}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {toTitleCase(item.name)}
          </Text>
          <Text style={styles.compactMeta} numberOfLines={1}>
            {formatShortDate(item.nextPaperDate || item.startDate, language)}
          </Text>
          {item.subjectNames?.length ? (
            <Text style={styles.tag} numberOfLines={1}>
              {item.subjectNames.slice(0, 2).join(' · ')}
            </Text>
          ) : null}
        </View>
        <View style={[styles.daysPill, { backgroundColor: visual.bg }]}>
          <Text style={[styles.daysPillText, { color: visual.tint }]}>
            {countdownLabel(item, today, t)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryMuted} />
      </Pressable>
    );
  };

  const renderResultCard = (item: ParentExamListItem) => (
    <Pressable
      key={item.examId}
      onPress={() => void openDetail(item.examId)}
      style={styles.resultCard}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.compactTitle}>{toTitleCase(item.name)}</Text>
        <Text style={styles.compactMeta}>
          {formatShortDate(item.startDate, language)}
          {item.startDate !== item.endDate ? ` – ${formatShortDate(item.endDate, language)}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.resultScore, { color: resultColor(item) }]}>
          {resultHeadline(item)}
        </Text>
        <Text style={styles.compactMeta}>
          {item.partialResults
            ? t('exams.partialMarksHint')
            : `${formatMarks(item.obtainedMarks)} / ${formatMarks(item.maxMarks)}`}
        </Text>
      </View>
    </Pressable>
  );

  const timeLine = (item: ParentExamListItem) => {
    const start = formatClock(item.nextStartTime, language);
    const end = formatClock(item.nextEndTime, language);
    const date = formatShortDate(item.nextPaperDate || item.startDate, language);
    if (start && end) return `${date}  •  ${start} - ${end}`;
    return date;
  };

  const tabs: { id: ExamsTab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
    { id: 'upcoming', label: t('exams.tabUpcoming'), icon: 'calendar-blank-outline' },
    { id: 'results', label: t('exams.tabResults'), icon: 'file-document-outline' },
    { id: 'completed', label: t('exams.tabCompleted'), icon: 'check-circle-outline' },
  ];

  const firstName = (selectedStudent?.name || t('common.student')).split(' ')[0];

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
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.tabBtn}>
              <View style={styles.tabInner}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={16}
                  color={active ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              </View>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t('exams.loadFailed')} message={error} />
      ) : tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <EmptyState
            icon="calendar-blank-outline"
            title={t('exams.emptyUpcomingTitle')}
            message={t('exams.emptyUpcomingMessage')}
            actionLabel={results.length ? t('exams.viewResultsCta') : undefined}
            onAction={results.length ? () => setTab('results') : undefined}
          />
        ) : (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('exams.upcomingHeading')}</Text>
              <Pressable onPress={openCalendar} hitSlop={8}>
                <Text style={styles.sectionLink}>{t('exams.viewSchedule')}</Text>
              </Pressable>
            </View>
            {featured ? (
              <View style={styles.featured}>
                <View style={styles.featuredTop}>
                  <View style={[styles.featuredIcon, { backgroundColor: subjectVisual(featured.subjectNames?.[0] || featured.name).bg }]}>
                    <MaterialCommunityIcons
                      name={subjectVisual(featured.subjectNames?.[0] || featured.name).icon}
                      size={22}
                      color={subjectVisual(featured.subjectNames?.[0] || featured.name).tint}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>{t('exams.nextExam')}</Text>
                    </View>
                    <Text style={styles.featuredTitle}>{toTitleCase(featured.name)}</Text>
                    <View style={styles.metaLine}>
                      <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.featuredMeta}>{timeLine(featured)}</Text>
                    </View>
                    {featured.divisionDisplayName ? (
                      <View style={styles.metaLine}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.featuredMeta}>{featured.divisionDisplayName}</Text>
                      </View>
                    ) : null}
                    {featured.subjectNames?.length ? (
                      <View style={styles.tagRow}>
                        {featured.subjectNames.slice(0, 3).map((name) => (
                          <View key={name} style={styles.chip}>
                            <Text style={styles.chipText}>{name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.featuredDays}>
                    <Text style={styles.featuredDaysText}>{countdownLabel(featured, today, t)}</Text>
                  </View>
                </View>
              </View>
            ) : null}
            {restUpcoming.map(renderCompactCard)}
            <View style={styles.hintBanner}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
              <Text style={styles.hintText}>{t('exams.resultsHint')}</Text>
            </View>
            <View style={styles.prepBanner}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prepTitle}>{t('exams.stayPreparedTitle')}</Text>
                <Text style={styles.prepBody}>
                  {t('exams.stayPreparedMessage', { name: firstName })}
                </Text>
              </View>
            </View>
          </>
        )
      ) : tab === 'results' ? (
        results.length === 0 ? (
          <EmptyState
            icon="file-document-outline"
            title={t('exams.emptyTitle')}
            message={t('exams.emptyDesc')}
          />
        ) : (
          <View style={{ gap: 12 }}>{results.map(renderResultCard)}</View>
        )
      ) : completed.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title={t('exams.emptyCompletedTitle')}
          message={t('exams.emptyCompletedMessage')}
        />
      ) : (
        <View style={{ gap: 12 }}>{completed.map(renderCompactCard)}</View>
      )}

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
              accessibilityLabel={t('common.close')}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
            {detailLoading || !detail ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{toTitleCase(detail.name)}</Text>
                <Text style={styles.modalMeta}>
                  {[detail.sessionName, detail.divisionDisplayName].filter(Boolean).join(' · ')}
                </Text>
                {detail.resultsReady ? (
                  <View style={styles.summaryBox}>
                    <Text style={[styles.resultScore, { color: resultColor(detail), fontSize: 28 }]}>
                      {resultHeadline(detail)}
                    </Text>
                    <Text style={styles.compactTitle}>
                      {detail.partialResults
                        ? t('exams.partialMarksHint')
                        : `${formatMarks(detail.obtainedMarks)} / ${formatMarks(detail.maxMarks)}`}
                    </Text>
                    <Text style={{ color: resultColor(detail), fontWeight: '700' }}>
                      {detail.partialResults
                        ? t('exams.partialProvisional')
                        : [detail.grade, detail.resultLabel].filter(Boolean).join(' · ') ||
                          t('exams.pendingMarks')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.sectionTitle}>{t('exams.syllabus')}</Text>
                )}
                {detail.resultsReady ? (
                  <Pressable
                    onPress={() => void downloadReportCard()}
                    disabled={downloading}
                    style={[styles.downloadBtn, { opacity: downloading ? 0.7 : 1 }]}
                  >
                    {downloading ? (
                      <ActivityIndicator color={colors.headerOn} />
                    ) : (
                      <MaterialCommunityIcons name="file-pdf-box" size={22} color={colors.headerOn} />
                    )}
                    <Text style={styles.primaryBtnText}>{t('exams.downloadReportCard')}</Text>
                  </Pressable>
                ) : null}
                {detail.subjects.map((subject) => (
                  <View key={subject.paperId} style={styles.subjectRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compactTitle}>{subject.subjectName}</Text>
                      <Text style={styles.compactMeta}>
                        {subject.awaiting
                          ? t('exams.awaitingSubject')
                          : subject.attendanceStatus && subject.attendanceStatus !== 'PRESENT'
                            ? t(`exams.attendance${subject.attendanceStatus}` as any)
                            : subject.entered
                              ? formatShortDate(subject.examDate, language)
                              : t('exams.notEntered')}
                      </Text>
                    </View>
                    {detail.resultsReady ? (
                      <Text style={styles.compactTitle}>
                        {subject.awaiting ||
                        (subject.attendanceStatus && subject.attendanceStatus !== 'PRESENT')
                          ? '—'
                          : formatMarks(subject.marks)}{' '}
                        <Text style={styles.compactMeta}>/ {subject.maxMarks}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.compactMeta}>{formatShortDate(subject.examDate, language)}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  if (studentId == null) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <EmptyState
            icon="clipboard-text-outline"
            title={t('exams.emptyTitle')}
            message={t('exams.emptyDesc')}
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  return (
    <View style={styles.standalone}>
      <StudentModuleHero
        title={t('exams.screenTitle')}
        subtitle={t('exams.subtitle')}
        student={selectedStudent}
        onBack={goBack}
        backAccessibilityLabel={t('attendance.backHome')}
        heroIcon="file-document-outline"
      >
        <ExamOverviewCard
          upcoming={upcoming.length}
          completed={completed.length}
          results={results.length}
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
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  summaryRow: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  summaryCellBorder: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.divider },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    flexGrow: 0,
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
  tabLabelActive: { color: colors.primary },
  tabUnderline: { height: 3, width: '70%', borderRadius: 2, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: colors.primary },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sectionLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  featured: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    ...shadows.card,
    marginBottom: 12,
  },
  featuredTop: { flexDirection: 'row', gap: 10 },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  nextBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  featuredTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  featuredMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', flex: 1 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  featuredDays: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: 72,
  },
  featuredDaysText: { color: colors.danger, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  primaryBtnText: { color: colors.headerOn, fontWeight: '700', fontSize: 13 },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    ...shadows.card,
    overflow: 'hidden',
  },
  compactBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  compactBody: { flex: 1, minWidth: 0 },
  compactTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  compactMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  tag: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  daysPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, maxWidth: 78 },
  daysPillText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    ...shadows.card,
  },
  resultScore: { fontSize: 18, fontWeight: '800' },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  hintText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '600' },
  prepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  prepTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  prepBody: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
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
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', paddingRight: 40 },
  modalMeta: { color: colors.textSecondary, marginTop: 6, fontSize: 14 },
  summaryBox: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  downloadBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  subjectRow: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  });
}
