import { format, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  getMyStudents,
  getStudentHomework,
  getStudentHomeworkDetail,
  type ParentHomeworkDetail,
  type ParentHomeworkItem,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import type { AppTheme } from '../theme';
import { shadows } from '../theme/appTheme';
import { useAppLanguage } from '../common';
import type { RootStackParamList } from '../navigation/Navigation';

type FilterId = 'all' | 'upcoming' | 'overdue';

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

function formatShortDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return format(date, 'd MMM yyyy');
}

function isOverdue(item: ParentHomeworkItem, today: Date): boolean {
  const due = parseDate(item.dueDate);
  if (!due) return false;
  return isBefore(startOfDay(due), startOfDay(today));
}

function isUpcoming(item: ParentHomeworkItem, today: Date): boolean {
  const due = parseDate(item.dueDate);
  if (!due) return true;
  return !isBefore(startOfDay(due), startOfDay(today));
}

type Props = {
  embedded?: boolean;
};

export function HomeworkScreen({ embedded = false }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentHomeworkItem[]>([]);
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [hasEnrollment, setHasEnrollment] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [detail, setDetail] = useState<ParentHomeworkDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const today = useMemo(() => new Date(), []);

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
        const classParts = [data.className, data.sectionName]
          .filter(Boolean)
          .join(' · ');
        setClassLabel(classParts || data.sessionName || null);
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

  const filtered = useMemo(() => {
    if (filter === 'upcoming') {
      return items.filter((item) => isUpcoming(item, today));
    }
    if (filter === 'overdue') {
      return items.filter((item) => isOverdue(item, today));
    }
    return items;
  }, [filter, items, today]);

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

  const content = (
    <>
      {studentId == null ? (
        <View style={styles.pad}>
          <EmptyState
            icon="account-child-outline"
            title={t('homework.pickStudentTitle')}
            message={t('homework.pickStudentMessage')}
          />
          <Button
            mode="contained"
            style={{ marginTop: 16 }}
            onPress={() => {
              if (embedded) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
          >
            {t('homework.backHome')}
          </Button>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          <View style={styles.headerBlock}>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onSurface, fontWeight: '800' }}
            >
              {t('homework.title')}
            </Text>
            {selectedStudent || classLabel ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                {[selectedStudent?.name, classLabel].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            {(
              [
                ['all', 'homework.filterAll'],
                ['upcoming', 'homework.filterUpcoming'],
                ['overdue', 'homework.filterOverdue'],
              ] as const
            ).map(([id, labelKey]) => {
              const active = filter === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setFilter(id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{
                      color: active
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                      fontWeight: '700',
                    }}
                  >
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.error, marginBottom: 12 }}
            >
              {error}
            </Text>
          ) : null}

          {!hasEnrollment && items.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title={t('homework.emptyTitle')}
              message={t('homework.noEnrollment')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="book-open-page-variant-outline"
              title={
                filter === 'upcoming'
                  ? t('homework.emptyUpcomingTitle')
                  : filter === 'overdue'
                    ? t('homework.emptyOverdueTitle')
                    : t('homework.emptyTitle')
              }
              message={
                filter === 'upcoming'
                  ? t('homework.emptyUpcomingMessage')
                  : filter === 'overdue'
                    ? t('homework.emptyOverdueMessage')
                    : t('homework.emptyMessage')
              }
            />
          ) : (
            filtered.map((item) => {
              const overdue = isOverdue(item, today);
              const due = parseDate(item.dueDate);
              const dueToday = due ? isToday(due) : false;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => void openDetail(item)}
                  style={[
                    styles.card,
                    shadows.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderWidth: overdue ? 1.5 : 0,
                      borderColor: overdue ? theme.colors.error : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.subjectBadge,
                        { backgroundColor: theme.colors.primaryContainer },
                      ]}
                    >
                      <Text
                        variant="labelMedium"
                        style={{
                          color: theme.colors.primary,
                          fontWeight: '800',
                        }}
                      >
                        {item.subjectName || t('homework.title')}
                      </Text>
                    </View>
                    {overdue ? (
                      <Text
                        variant="labelMedium"
                        style={{ color: theme.colors.error, fontWeight: '800' }}
                      >
                        {t('homework.overdue')}
                      </Text>
                    ) : dueToday ? (
                      <Text
                        variant="labelMedium"
                        style={{
                          color: theme.colors.warning,
                          fontWeight: '800',
                        }}
                      >
                        {t('homework.dueToday')}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: '800',
                      marginTop: 10,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 6,
                    }}
                  >
                    {item.dueDate
                      ? t('homework.due', {
                          date: formatShortDate(item.dueDate),
                        })
                      : t('homework.noDue')}
                    {item.assignedBy
                      ? ` · ${t('homework.byTeacher', {
                          name: item.assignedBy,
                        })}`
                      : ''}
                  </Text>
                  {item.hasAttachments ? (
                    <View style={styles.attachRow}>
                      <MaterialCommunityIcons
                        name="paperclip"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text
                        variant="labelMedium"
                        style={{ color: theme.colors.primary }}
                      >
                        {t('homework.attachments', { count: 1 })}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={detail != null || detailLoading}
        animationType="slide"
        transparent
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {detailLoading || !detail ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <ScrollView>
                <Text
                  variant="titleLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: '800' }}
                >
                  {detail.title}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 6,
                  }}
                >
                  {[detail.subjectName, detail.className, detail.sectionName]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 8,
                  }}
                >
                  {detail.dueDate
                    ? t('homework.due', {
                        date: formatShortDate(detail.dueDate),
                      })
                    : t('homework.noDue')}
                  {detail.assignedBy
                    ? ` · ${t('homework.byTeacher', {
                        name: detail.assignedBy,
                      })}`
                    : ''}
                </Text>

                {detail.description ? (
                  <View style={{ marginTop: 16 }}>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700',
                      }}
                    >
                      {t('homework.description')}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 6,
                        lineHeight: 22,
                      }}
                    >
                      {detail.description}
                    </Text>
                  </View>
                ) : null}

                {detail.attachmentUrls?.length ? (
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700',
                      }}
                    >
                      {t('homework.files')}
                    </Text>
                    {detail.attachmentUrls.map((url, index) => (
                      <Pressable
                        key={`${url}-${index}`}
                        onPress={() => void Linking.openURL(url)}
                        style={[
                          styles.fileBtn,
                          {
                            backgroundColor: theme.colors.primaryContainer,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text
                          variant="labelLarge"
                          style={{ color: theme.colors.primary }}
                        >
                          {t('homework.openFile', { index: index + 1 })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <Button
                  mode="contained"
                  style={{ marginTop: 20 }}
                  onPress={() => setDetail(null)}
                >
                  {t('common.cancel')}
                </Button>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );

  if (embedded) {
    return <View style={styles.flex}>{content}</View>;
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {content}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerBlock: { marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  subjectBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
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
    padding: 20,
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
