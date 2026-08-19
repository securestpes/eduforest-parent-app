import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';
import { savePdfToDevice } from '../utils/savePdfToDevice';
import { toTitleCase } from '../utils/toTitleCase';

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return value;
  }
}

function formatMarks(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

type Props = {
  embedded?: boolean;
  highlightExamId?: number;
};

export function ExamResultsScreen({
  embedded = false,
  highlightExamId,
}: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentExamListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ParentExamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  useEffect(() => {
    if (highlightExamId == null || studentId == null) return;
    void openDetail(highlightExamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightExamId, studentId]);

  const openDetail = async (examId: number) => {
    if (studentId == null) return;
    setDetailLoading(true);
    try {
      const res = await getStudentExamDetail(studentId, examId);
      if (res.status && res.data) {
        setDetail(res.data);
      } else {
        setError(res.message || t('exams.detailFailed'));
      }
    } catch (e: any) {
      setError(e?.message || t('exams.detailFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadReportCard = async () => {
    if (studentId == null || detail == null || downloading) return;
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
      Alert.alert(
        '',
        result === 'shared'
          ? t('exams.reportCardShared')
          : t('exams.reportCardSaved')
      );
    } catch (e: any) {
      Alert.alert('', e?.message || t('exams.reportCardFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const resultColor = (item: ParentExamListItem | ParentExamDetail) => {
    if (item.partialResults || item.resultLabel === 'PARTIAL') {
      return theme.colors.primary;
    }
    if (item.percent == null) return theme.colors.onSurfaceVariant;
    return item.passed ? theme.colors.tertiary : theme.colors.error;
  };

  const resultHeadline = (item: ParentExamListItem | ParentExamDetail) => {
    if (item.partialResults || item.resultLabel === 'PARTIAL') {
      return t('exams.partialResults', {
        released: item.releasedSubjects ?? item.scoredSubjects,
        total: item.subjectCount,
      });
    }
    if (item.percent != null) {
      return `${formatMarks(item.percent)}%`;
    }
    return t('exams.pendingMarks');
  };

  const body = (
    <>
      {selectedStudent ? (
        <Text
          variant="labelLarge"
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {selectedStudent.name}
          {selectedStudent.instituteName
            ? ` · ${selectedStudent.instituteName}`
            : ''}
        </Text>
      ) : null}

      {error ? (
        <Text
          variant="bodyMedium"
          style={{ margin: 16, color: theme.colors.error }}
        >
          {error}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon="clipboard-text-outline"
            title={t('exams.emptyTitle')}
            message={t('exams.emptyDesc')}
          />
        ) : (
          items.map((item) => (
            <Pressable
              key={item.examId}
              onPress={() => void openDetail(item.examId)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {toTitleCase(item.name)}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {item.divisionDisplayName ||
                      item.customTypeLabel ||
                      item.examType ||
                      t('exams.results')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {formatShortDate(item.startDate)}
                {item.startDate !== item.endDate
                  ? ` – ${formatShortDate(item.endDate)}`
                  : ''}
              </Text>
              <View style={styles.metaRow}>
                <Text variant="labelLarge" style={{ color: resultColor(item) }}>
                  {resultHeadline(item)}
                  {!item.partialResults && item.grade ? ` · ${item.grade}` : ''}
                  {!item.partialResults && item.resultLabel && item.resultLabel !== 'PARTIAL'
                    ? ` · ${item.resultLabel}`
                    : ''}
                </Text>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.partialResults
                    ? t('exams.partialMarksHint')
                    : `${formatMarks(item.obtainedMarks)} / ${formatMarks(item.maxMarks)}`}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal
        visible={detail != null || detailLoading}
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <SafeAreaView
          style={[styles.modalSafe, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setDetail(null)} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
            <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
              {detail?.name ? toTitleCase(detail.name) : t('exams.results')}
            </Text>
          </View>
          {detailLoading || !detail ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {[detail.sessionName, detail.divisionDisplayName]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View
                style={[
                  styles.summaryBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  variant="headlineSmall"
                  style={{ fontWeight: '700', color: resultColor(detail) }}
                >
                  {resultHeadline(detail)}
                </Text>
                <Text variant="titleMedium">
                  {detail.partialResults
                    ? t('exams.partialMarksHint')
                    : `${formatMarks(detail.obtainedMarks)} / ${formatMarks(detail.maxMarks)}`}
                </Text>
                <Text variant="labelLarge" style={{ color: resultColor(detail) }}>
                  {detail.partialResults
                    ? t('exams.partialProvisional')
                    : [detail.grade, detail.resultLabel].filter(Boolean).join(' · ') ||
                      t('exams.pendingMarks')}
                </Text>
                {!detail.partialResults ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t('exams.passAt', { percent: detail.passPercent })}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => void downloadReportCard()}
                disabled={downloading}
                style={[
                  styles.downloadBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: downloading ? 0.7 : 1,
                  },
                ]}
              >
                {downloading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <MaterialCommunityIcons
                    name="file-pdf-box"
                    size={22}
                    color={theme.colors.onPrimary}
                  />
                )}
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onPrimary, fontWeight: '700' }}
                >
                  {t('exams.downloadReportCard')}
                </Text>
              </Pressable>

              {detail.subjects.map((subject) => (
                <View
                  key={subject.paperId}
                  style={[
                    styles.subjectRow,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {subject.subjectName}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {subject.awaiting
                        ? t('exams.awaitingSubject')
                        : subject.attendanceStatus &&
                            subject.attendanceStatus !== 'PRESENT'
                          ? t(
                              `exams.attendance${subject.attendanceStatus}` as any
                            )
                          : subject.entered
                            ? formatShortDate(subject.examDate)
                            : t('exams.notEntered')}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {subject.awaiting ? (
                      '—'
                    ) : (
                      <>
                        {subject.attendanceStatus &&
                        subject.attendanceStatus !== 'PRESENT'
                          ? '—'
                          : formatMarks(subject.marks)}
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {' '}
                          / {subject.maxMarks}
                        </Text>
                      </>
                    )}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );

  if (loading) {
    const loader = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          variant="bodyLarge"
          style={{ marginTop: 14, color: theme.colors.onSurfaceVariant }}
        >
          {t('exams.loading')}
        </Text>
      </View>
    );
    if (embedded) return <View style={styles.embedded}>{loader}</View>;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          {loader}
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text
          variant="headlineSmall"
          style={{ fontWeight: '700', marginHorizontal: 16, marginTop: 8 }}
        >
          {t('exams.title')}
        </Text>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  embedded: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  summaryBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    alignItems: 'flex-start',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  subjectRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
