import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  applyStudentLeave,
  getStudentSchoolCalendar,
  type ParentStudent,
} from '../../services/parent';
import { useAppLanguage, StatusPopup, type StatusPopupVariant } from '../../common';
import { formatAppDate, weekdayShortLabelsMondayFirst } from '../../utils/appDateLocale';
import { normalizeUploadUrl } from '../../common/helpers/normalizeUploadUrl';
import { initials, avatarHue } from '../../utils/attendanceVisuals';
import { shadows, spacing, useAppColors, type AppColors } from '../../theme/appTheme';
import {
  DEFAULT_SCHOOL_WORKING_DAYS,
  WEEKDAY_HEADER_KEYS,
  isSchoolOpenDay,
  nextSchoolOpenDayInSession,
  normalizeWorkingDays,
} from '../../utils/schoolWorkingDays';
import {
  isDateInSession,
  monthKey,
  resolveSessionRange,
} from '../../utils/academicSession';

const HERO_BG = require('../../assets/hero-bg.png');
const REASON_MAX = 300;
const LEAVE_TYPES = ['SICK', 'CASUAL', 'EMERGENCY', 'OTHER'] as const;

type LeaveType = (typeof LEAVE_TYPES)[number];

function typeMeta(colors: AppColors): Record<
  LeaveType,
  { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; tint: string }
> {
  return {
    SICK: { icon: 'thermometer', tint: colors.primary },
    CASUAL: { icon: 'account-outline', tint: colors.warning },
    EMERGENCY: { icon: 'account-group-outline', tint: colors.success },
    OTHER: { icon: 'dots-horizontal', tint: colors.textSecondary },
  };
}

function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function openDayCount(from: Date, to: Date, workingDays: string[]): number {
  if (to.getTime() < from.getTime()) return 0;
  return eachDayOfInterval({ start: from, end: to }).filter((day) =>
    isSchoolOpenDay(day, workingDays)
  ).length;
}

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
  } catch {
    return null;
  }
}

function withPrefix(value: string | null | undefined, word: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return new RegExp(`^${word}\\b`, 'i').test(v) ? v : `${word} ${v}`;
}

function CalendarModal({
  visible,
  value,
  title,
  workingDays,
  sessionRange,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  title: string;
  workingDays: string[];
  sessionRange: { start: Date; end: Date } | null;
  onClose: () => void;
  onSelect: (iso: string) => void;
}) {
  const { language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = parseDay(value) ?? new Date();
  const [month, setMonth] = useState(startOfMonth(selected));

  useEffect(() => {
    if (!visible) return;
    const anchor = parseDay(value) ?? new Date();
    let next = startOfMonth(anchor);
    if (sessionRange) {
      const startM = startOfMonth(sessionRange.start);
      const endM = startOfMonth(sessionRange.end);
      if (monthKey(next) < monthKey(startM)) next = startM;
      if (monthKey(next) > monthKey(endM)) next = endM;
    }
    setMonth(next);
  }, [visible, value, sessionRange]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const canGoPrev =
    !sessionRange || monthKey(month) > monthKey(startOfMonth(sessionRange.start));
  const canGoNext =
    !sessionRange || monthKey(month) < monthKey(startOfMonth(sessionRange.end));

  const weekdays = weekdayShortLabelsMondayFirst(language);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.calBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.calCard}>
          <View style={styles.calNav}>
            <Pressable
              onPress={() => {
                if (!canGoPrev) return;
                setMonth((m) => addMonths(m, -1));
              }}
              disabled={!canGoPrev}
              hitSlop={8}
              style={[styles.calNavBtn, !canGoPrev && { opacity: 0.35 }]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={canGoPrev ? colors.text : colors.textTertiary}
              />
            </Pressable>
            <Text style={styles.calTitle}>{title}</Text>
            <Pressable
              onPress={() => {
                if (!canGoNext) return;
                setMonth((m) => addMonths(m, 1));
              }}
              disabled={!canGoNext}
              hitSlop={8}
              style={[styles.calNavBtn, !canGoNext && { opacity: 0.35 }]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={canGoNext ? colors.text : colors.textTertiary}
              />
            </Pressable>
          </View>
          <Text style={styles.calMonth}>{formatAppDate(month, 'MMMM yyyy', language)}</Text>
          <View style={styles.calWeekRow}>
            {weekdays.map((d, index) => {
              const closed = !workingDays.includes(WEEKDAY_HEADER_KEYS[index]);
              return (
                <Text
                  key={d}
                  style={[styles.calWeekday, closed && styles.calWeekdayWeekend]}
                >
                  {d}
                </Text>
              );
            })}
          </View>
          <View style={styles.calGrid}>
            {days.map((day) => {
              const inMonth = isSameMonth(day, month);
              const outOfSession = !isDateInSession(day, sessionRange);
              const closed = !isSchoolOpenDay(day, workingDays) || outOfSession;
              const active = !closed && isSameDay(day, selected);
              return (
                <Pressable
                  key={isoDay(day)}
                  disabled={closed}
                  onPress={() => {
                    if (closed) return;
                    onSelect(isoDay(day));
                    onClose();
                  }}
                  style={[
                    styles.calDay,
                    active && styles.calDayActive,
                    (!inMonth || closed) && { opacity: 0.35 },
                    closed && styles.calDayDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayText,
                      active && styles.calDayTextActive,
                      closed && styles.calDayTextDisabled,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ApplyLeaveScreen({
  student,
  studentId,
  onClose,
  onApplied,
}: {
  student: ParentStudent | null;
  studentId: number;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [workingDays, setWorkingDays] = useState<string[]>(() => [
    ...DEFAULT_SCHOOL_WORKING_DAYS,
  ]);
  const [sessionRange, setSessionRange] = useState<{ start: Date; end: Date } | null>(
    null
  );
  const defaultIso = isoDay(
    nextSchoolOpenDayInSession(new Date(), workingDays, sessionRange)
  );

  const [leaveType, setLeaveType] = useState<LeaveType>('SICK');
  const [fromDate, setFromDate] = useState(defaultIso);
  const [toDate, setToDate] = useState(defaultIso);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
    message?: string;
    closeAfter?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStudentSchoolCalendar(studentId)
      .then((res) => {
        if (cancelled || !res.status) return;
        setWorkingDays(normalizeWorkingDays(res.data?.workingDays));
        setSessionRange(
          resolveSessionRange({
            startDate: res.data?.startDate,
            endDate: res.data?.endDate,
            academicYear: res.data?.sessionName || student?.academicYear,
          })
        );
      })
      .catch(() => {
        setSessionRange(
          resolveSessionRange({ academicYear: student?.academicYear })
        );
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, student?.academicYear]);

  useEffect(() => {
    setFromDate((from) => {
      const nextFrom = isoDay(
        nextSchoolOpenDayInSession(
          parseDay(from) ?? new Date(),
          workingDays,
          sessionRange
        )
      );
      setToDate((to) => {
        const nextTo = isoDay(
          nextSchoolOpenDayInSession(
            parseDay(to) ?? new Date(),
            workingDays,
            sessionRange
          )
        );
        return nextTo < nextFrom ? nextFrom : nextTo;
      });
      return nextFrom;
    });
  }, [workingDays, sessionRange]);

  const name = student?.name || t('common.student');
  const hue = avatarHue(name);
  const photoUri = normalizeUploadUrl(student?.profilePicUrl);
  const showPhoto = Boolean(photoUri) && !photoFailed;
  const classLine = [
    withPrefix(student?.className, t('home.classWord')),
    withPrefix(student?.sectionName, t('home.sectionShort')),
  ]
    .filter(Boolean)
    .join(' • ');
  const screenW = Dimensions.get('window').width;

  const dayCount = useMemo(() => {
    const from = parseDay(fromDate);
    const to = parseDay(toDate);
    if (!from || !to) return 0;
    return openDayCount(from, to, workingDays);
  }, [fromDate, toDate, workingDays]);

  const dayCountLabel =
    dayCount === 1 ? t('leaves.daysOne') : t('leaves.daysCount', { count: dayCount });

  const setFrom = (iso: string) => {
    const date = parseDay(iso);
    if (
      !date ||
      !isSchoolOpenDay(date, workingDays) ||
      !isDateInSession(date, sessionRange)
    ) {
      return;
    }
    setFromDate(iso);
    if (toDate && iso > toDate) setToDate(iso);
  };

  const setTo = (iso: string) => {
    const date = parseDay(iso);
    if (
      !date ||
      !isSchoolOpenDay(date, workingDays) ||
      !isDateInSession(date, sessionRange)
    ) {
      return;
    }
    setToDate(fromDate && iso < fromDate ? fromDate : iso);
  };

  const submit = async () => {
    const from = parseDay(fromDate);
    const to = parseDay(toDate);
    if (
      !from ||
      !to ||
      !isDateInSession(from, sessionRange) ||
      !isDateInSession(to, sessionRange)
    ) {
      setStatus({
        variant: 'error',
        title: t('leaves.sessionBlocked'),
      });
      return;
    }
    if (
      !isSchoolOpenDay(from, workingDays) ||
      !isSchoolOpenDay(to, workingDays) ||
      openDayCount(from, to, workingDays) < 1
    ) {
      setStatus({
        variant: 'error',
        title: t('leaves.weekendBlocked'),
      });
      return;
    }
    if (!reason.trim()) {
      setStatus({
        variant: 'error',
        title: t('leaves.formRequired'),
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await applyStudentLeave(studentId, {
        fromDate,
        toDate,
        fromSession: 'FULL',
        toSession: 'FULL',
        leaveType,
        reason: reason.trim(),
      });
      if (!res.status) {
        throw new Error(res.message || t('leaves.applyFailed'));
      }
      setStatus({
        variant: 'success',
        title: t('leaves.applySuccess'),
        closeAfter: true,
      });
    } catch (e: any) {
      setStatus({
        variant: 'error',
        title: t('leaves.applyFailed'),
        message: e?.message || t('leaves.applyFailed'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderDateField = (which: 'from' | 'to', value: string, label: string) => {
    const date = parseDay(value);
    return (
      <View style={styles.dateCol}>
        <Text style={styles.label}>
          {label} <Text style={styles.req}>*</Text>
        </Text>
        <Pressable onPress={() => setPicker(which)} style={styles.dateField}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dateValue}>{date ? formatAppDate(date, 'd MMM yyyy', language) : '—'}</Text>
            <Text style={styles.dateWeek}>{date ? formatAppDate(date, 'EEEE', language) : ''}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.hero}>
            <Image source={HERO_BG} style={[styles.heroBg, { width: screenW }]} resizeMode="cover" />
            <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.lg, paddingBottom: 48 }}>
              <View style={styles.nav}>
                <Pressable onPress={onClose} style={styles.navBtn} accessibilityLabel={t('leaves.backHome')}>
                  <MaterialCommunityIcons name="arrow-left" size={22} color={colors.headerOn} />
                </Pressable>
                <View style={styles.heroArt}>
                  <MaterialCommunityIcons name="clipboard-account-outline" size={36} color={colors.headerOn} />
                </View>
              </View>
              <Text style={styles.heroTitle}>{t('leaves.apply')}</Text>
              <Text style={styles.heroSub}>{t('leaves.applySubtitle')}</Text>
            </View>
          </View>

          <View style={styles.studentCard}>
            {showPhoto ? (
              <Image
                source={{ uri: photoUri, headers: { 'ngrok-skip-browser-warning': 'true' } }}
                style={styles.avatar}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: `hsl(${hue} 48% 46%)` }]}>
                <Text style={styles.initials}>{initials(name)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{name}</Text>
              {classLine ? <Text style={styles.studentMeta}>{classLine}</Text> : null}
              {student?.rollNumber ? (
                <Text style={styles.studentMeta}>
                  {t('leaves.rollNo', { n: student.rollNumber })}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View style={styles.form}>
            <Text style={styles.label}>
              {t('leaves.typeLabel')} <Text style={styles.req}>*</Text>
            </Text>
            <View style={styles.typeGrid}>
              {LEAVE_TYPES.map((type) => {
                const active = leaveType === type;
                const meta = typeMeta(colors)[type];
                return (
                  <Pressable
                    key={type}
                    onPress={() => setLeaveType(type)}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                  >
                    {active ? (
                      <View style={styles.typeCheck}>
                        <MaterialCommunityIcons name="check" size={12} color={colors.headerOn} />
                      </View>
                    ) : null}
                    <View style={[styles.typeIcon, { backgroundColor: `${meta.tint}18` }]}>
                      <MaterialCommunityIcons name={meta.icon} size={22} color={meta.tint} />
                    </View>
                    <Text style={[styles.typeText, active && styles.typeTextActive]} numberOfLines={2}>
                      {t(`leaves.applyType${type}` as any)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.dateRow}>
              {renderDateField('from', fromDate, t('leaves.fromDate'))}
              {renderDateField('to', toDate, t('leaves.toDate'))}
            </View>
            <Text style={styles.weekendHint}>{t('leaves.sessionHint')}</Text>

            <Text style={styles.label}>{t('leaves.numberOfDays')}</Text>
            <View style={styles.readonly}>
              <Text style={styles.readonlyText}>{dayCountLabel}</Text>
            </View>

            <Text style={styles.label}>
              {t('leaves.reasonForLeave')} <Text style={styles.req}>*</Text>
            </Text>
            <View style={styles.reasonWrap}>
              <TextInput
                value={reason}
                onChangeText={(text) => setReason(text.slice(0, REASON_MAX))}
                placeholder={t('leaves.reasonPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                style={styles.reasonInput}
              />
              <Text style={styles.counter}>
                {reason.length}/{REASON_MAX}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.note}>
            <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
            <Text style={styles.noteText}>
              <Text style={{ fontWeight: '800' }}>{t('leaves.pleaseNote')} </Text>
              {t('leaves.schoolNote')}
            </Text>
          </View>
          <Pressable
            onPress={() => void submit()}
            disabled={submitting || dayCount < 1}
            style={[styles.submit, { opacity: submitting || dayCount < 1 ? 0.7 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.headerOn} />
            ) : (
              <Text style={styles.submitText}>{t('leaves.submitRequest')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CalendarModal
        visible={picker != null}
        value={picker === 'to' ? toDate : fromDate}
        title={picker === 'to' ? t('leaves.toDate') : t('leaves.fromDate')}
        workingDays={workingDays}
        sessionRange={sessionRange}
        onClose={() => setPicker(null)}
        onSelect={(iso) => (picker === 'to' ? setTo(iso) : setFrom(iso))}
      />
      <StatusPopup
        visible={status != null}
        variant={status?.variant}
        title={status?.title ?? ''}
        message={status?.message}
        onDismiss={() => {
          const closeAfter = status?.closeAfter;
          setStatus(null);
          if (closeAfter) onApplied();
        }}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingBottom: 4, zIndex: 2 },
  hero: { backgroundColor: colors.primary, overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, height: '100%' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  heroArt: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  heroTitle: { marginTop: 12, color: colors.headerOn, fontSize: 26, fontWeight: '800' },
  heroSub: { marginTop: 6, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500', paddingRight: 48 },
  studentCard: {
    marginTop: -28,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
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
  initials: { color: colors.headerOn, fontWeight: '700', fontSize: 18 },
  studentName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  studentMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  form: { paddingHorizontal: spacing.lg, paddingTop: 20, gap: 4 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  req: { color: colors.danger },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    minHeight: 96,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  typeTextActive: { color: colors.primary },
  dateRow: { flexDirection: 'row', gap: 10 },
  weekendHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  dateCol: { flex: 1 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dateValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  dateWeek: { color: colors.textTertiary, fontSize: 11, fontWeight: '500', marginTop: 1 },
  readonly: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  readonlyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  reasonWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 110,
  },
  reasonInput: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  counter: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  noteText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '500', lineHeight: 18 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 15,
  },
  submitText: { color: colors.headerOn, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  calBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  calCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, ...shadows.card },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  calMonth: { textAlign: 'center', color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekday: { flex: 1, textAlign: 'center', color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  calWeekdayWeekend: { color: colors.danger, opacity: 0.7 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDayActive: { backgroundColor: colors.primary, borderRadius: 999 },
  calDayDisabled: { opacity: 0.35 },
  calDayText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  calDayTextActive: { color: colors.headerOn },
  calDayTextDisabled: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  });
}
