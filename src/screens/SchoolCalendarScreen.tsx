import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  getStudentSchoolCalendar,
  type ParentCalendarEvent,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import type { AppTheme } from '../theme';
import { shadows } from '../theme/appTheme';
import { useAppLanguage, type TranslationKey } from '../common';

type FilterId = 'ALL' | 'HOLIDAY' | 'EXAM' | 'EVENT';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TYPE_COLORS: Record<string, { fg: string; bg: string }> = {
  HOLIDAY: { fg: '#C2410C', bg: '#FFF7ED' },
  EXAM: { fg: '#6D28D9', bg: '#F5F3FF' },
  EVENT: { fg: '#047857', bg: '#ECFDF5' },
};

function toYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.length === 10 ? `${value}T12:00:00` : value);
  } catch {
    return null;
  }
}

function formatFriendlyDate(value: string | null | undefined): string {
  const date = parseYmd(value);
  if (!date) return '—';
  return format(date, 'd MMM yyyy');
}

function eventCoversDay(event: ParentCalendarEvent, dayKey: string): boolean {
  const start = event.startDate;
  const end = event.endDate || event.startDate;
  if (!start || !end) return false;
  return dayKey >= start && dayKey <= end;
}

function typeLabel(
  type: string | null | undefined,
  t: (key: TranslationKey) => string
): string {
  const key = (type || '').toUpperCase();
  if (key === 'HOLIDAY') return t('calendar.typeHoliday');
  if (key === 'EXAM') return t('calendar.typeExam');
  if (key === 'EVENT') return t('calendar.typeEvent');
  return type || '—';
}

type Props = {
  embedded?: boolean;
};

export function SchoolCalendarScreen({ embedded = false }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<ParentCalendarEvent[]>([]);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [hasEnrollment, setHasEnrollment] = useState(true);
  const [filter, setFilter] = useState<FilterId>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => toYmd(new Date()));

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const load = useCallback(
    async (isRefresh = false) => {
      if (studentId == null) {
        setEvents([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [studentsRes, calRes] = await Promise.all([
          getMyStudents(),
          getStudentSchoolCalendar(studentId),
        ]);
        if (studentsRes.status && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        }
        if (!calRes.status || !calRes.data) {
          setError(calRes.message || t('calendar.loadFailed'));
          setEvents([]);
          return;
        }
        const data = calRes.data;
        setEvents(Array.isArray(data.events) ? data.events : []);
        setSessionName(data.sessionName || null);
        setHasEnrollment(data.sessionId != null);
      } catch (e: any) {
        setError(e?.message || t('calendar.loadFailed'));
        setEvents([]);
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

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events;
    return events.filter(
      (e) => (e.eventType || '').toUpperCase() === filter
    );
  }, [events, filter]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ParentCalendarEvent[]>();
    const days = eachDayOfInterval({
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    });
    for (const day of days) {
      const key = toYmd(day);
      const covering = filteredEvents.filter((e) => eventCoversDay(e, key));
      if (covering.length) map.set(key, covering);
    }
    return map;
  }, [cursor, filteredEvents]);

  const dayEvents = useMemo(
    () => filteredEvents.filter((e) => eventCoversDay(e, selectedDay)),
    [filteredEvents, selectedDay]
  );

  const monthLabel = format(cursor, 'MMMM yyyy');

  const monthCells = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days = eachDayOfInterval({ start, end });
    const pad = getDay(start);
    const cells: Array<Date | null> = [];
    for (let i = 0; i < pad; i += 1) cells.push(null);
    for (const d of days) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const filters: Array<{ id: FilterId; labelKey: TranslationKey }> = [
    { id: 'ALL', labelKey: 'calendar.filterAll' },
    { id: 'HOLIDAY', labelKey: 'calendar.filterHolidays' },
    { id: 'EXAM', labelKey: 'calendar.filterExams' },
    { id: 'EVENT', labelKey: 'calendar.filterEvents' },
  ];

  if (studentId == null) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <EmptyState
            icon="gesture-tap"
            title={t('calendar.pickStudentTitle')}
            message={t('calendar.pickStudentMessage')}
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  const body = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
        />
      }
    >
      {!embedded ? (
        <Text
          variant="headlineSmall"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
        >
          {t('calendar.title')}
        </Text>
      ) : null}
      {selectedStudent ? (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {selectedStudent.name}
          {sessionName ? ` · ${sessionName}` : ''}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ marginTop: 14 }}
      >
        {filters.map((f) => {
          const selected = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                variant="labelMedium"
                style={{
                  color: selected
                    ? theme.colors.onPrimary
                    : theme.colors.primary,
                  fontWeight: '700',
                }}
              >
                {t(f.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('calendar.loadFailed')}
          message={error}
        />
      ) : !hasEnrollment ? (
        <EmptyState
          icon="school-outline"
          title={t('calendar.emptyTitle')}
          message={t('calendar.noEnrollment')}
        />
      ) : (
        <>
          <View
            style={[
              styles.monthCard,
              shadows.card,
              {
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <View style={styles.monthHeader}>
              <Pressable
                onPress={() =>
                  setCursor(
                    (c) => new Date(c.getFullYear(), c.getMonth() - 1, 1)
                  )
                }
                hitSlop={10}
                style={styles.navBtn}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={26}
                  color={theme.colors.primary}
                />
              </Pressable>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {monthLabel}
              </Text>
              <Pressable
                onPress={() =>
                  setCursor(
                    (c) => new Date(c.getFullYear(), c.getMonth() + 1, 1)
                  )
                }
                hitSlop={10}
                style={styles.navBtn}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={26}
                  color={theme.colors.primary}
                />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d, i) => (
                <Text
                  key={`${d}-${i}`}
                  variant="labelSmall"
                  style={[
                    styles.weekday,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {monthCells.map((day, idx) => {
                if (!day) {
                  return <View key={`pad-${idx}`} style={styles.cell} />;
                }
                const key = toYmd(day);
                const dayItems = eventsByDay.get(key) ?? [];
                const isSelected = key === selectedDay;
                const primaryType = (
                  dayItems[0]?.eventType || ''
                ).toUpperCase();
                const colors = TYPE_COLORS[primaryType];
                const hasEvent = dayItems.length > 0;

                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedDay(key)}
                    style={styles.cell}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        hasEvent && colors
                          ? { backgroundColor: colors.fg }
                          : null,
                        isSelected && !hasEvent
                          ? {
                              borderWidth: 2,
                              borderColor: theme.colors.primary,
                            }
                          : null,
                        isSelected && hasEvent
                          ? {
                              borderWidth: 2,
                              borderColor: theme.colors.onPrimary,
                            }
                          : null,
                      ]}
                    >
                      <Text
                        variant="labelMedium"
                        style={{
                          fontWeight: '700',
                          color: hasEvent
                            ? '#fff'
                            : theme.colors.onSurface,
                        }}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              {(['HOLIDAY', 'EXAM', 'EVENT'] as const).map((type) => (
                <View key={type} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: TYPE_COLORS[type].fg },
                    ]}
                  />
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {typeLabel(type, t)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            {formatFriendlyDate(selectedDay)}
          </Text>

          {dayEvents.length === 0 ? (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('calendar.nothingOnDay')}
            </Text>
          ) : (
            dayEvents.map((event) => {
              const type = (event.eventType || '').toUpperCase();
              const colors = TYPE_COLORS[type] || {
                fg: theme.colors.primary,
                bg: theme.colors.primaryContainer,
              };
              const range =
                event.startDate &&
                event.endDate &&
                event.startDate !== event.endDate
                  ? `${formatFriendlyDate(event.startDate)} → ${formatFriendlyDate(event.endDate)}`
                  : formatFriendlyDate(event.startDate);
              return (
                <View
                  key={event.id}
                  style={[
                    styles.eventCard,
                    shadows.card,
                    {
                      backgroundColor: colors.bg,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: colors.fg },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={{ color: '#fff', fontWeight: '700' }}
                    >
                      {typeLabel(event.eventType, t)}
                    </Text>
                  </View>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: '700',
                      marginTop: 8,
                    }}
                  >
                    {event.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 4,
                    }}
                  >
                    {range}
                  </Text>
                  {event.description ? (
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurface,
                        marginTop: 8,
                      }}
                    >
                      {event.description}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );

  if (embedded) {
    return <View style={styles.flex}>{body}</View>;
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center' },
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthCard: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: { padding: 4 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  eventCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
