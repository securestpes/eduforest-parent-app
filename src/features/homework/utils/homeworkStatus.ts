import type { ParentHomeworkItem } from '../../services/parent';
import { isBefore, parseISO, startOfDay, differenceInCalendarDays, isToday } from 'date-fns';
import type { AppLanguage, TranslationKey } from '../../../common/contexts/parentTranslations';
import { formatAppDate } from '../../../utils/appDateLocale';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number | undefined>
) => string;

export type HomeworkUiStatus = 'pending' | 'submitted' | 'overdue';
export type HomeworkFilter = 'all' | HomeworkUiStatus;

export function parseHomeworkDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
  } catch {
    return null;
  }
}

export function resolveHomeworkStatus(
  item: ParentHomeworkItem,
  today = new Date()
): HomeworkUiStatus {
  const raw = (item.status || '').toUpperCase();
  if (raw.includes('SUBMIT') || raw.includes('COMPLETE') || raw.includes('DONE')) {
    return 'submitted';
  }
  const due = parseHomeworkDate(item.dueDate);
  if (due && isBefore(startOfDay(due), startOfDay(today))) return 'overdue';
  return 'pending';
}

export function dueMeta(
  dueDate: string | null | undefined,
  t: Translate,
  language: AppLanguage = 'en',
  today = new Date()
): { line: string; sub: string } {
  const due = parseHomeworkDate(dueDate);
  if (!due) return { line: t('homework.noDue'), sub: '' };
  const line = t('homework.due', { date: formatAppDate(due, 'd MMM yyyy', language) });
  if (isToday(due)) return { line, sub: t('exams.today') };
  const days = differenceInCalendarDays(startOfDay(due), startOfDay(today));
  if (days < 0) {
    const ago = Math.abs(days);
    return {
      line,
      sub: ago === 1 ? t('timeAgo.dayAgo') : t('timeAgo.daysAgo', { count: ago }),
    };
  }
  if (days === 1) return { line, sub: t('homework.dayLeft') };
  return { line, sub: t('homework.daysLeft', { count: days }) };
}

export function subjectVisual(subject?: string | null): {
  icon: 'calculator-variant' | 'flask-outline' | 'book-alphabet' | 'earth' | 'laptop' | 'book-open-page-variant';
  tint: string;
  bg: string;
} {
  const s = (subject || '').toLowerCase();
  if (s.includes('math')) return { icon: 'calculator-variant', tint: '#6A5AE0', bg: '#EEEDFE' };
  if (s.includes('sci') || s.includes('chem') || s.includes('phy') || s.includes('bio')) {
    return { icon: 'flask-outline', tint: '#0EA5E9', bg: '#E0F4FF' };
  }
  if (s.includes('eng') || s.includes('hindi') || s.includes('lang')) {
    return { icon: 'book-alphabet', tint: '#F59E0B', bg: '#FFF4E0' };
  }
  if (s.includes('social') || s.includes('history') || s.includes('geo')) {
    return { icon: 'earth', tint: '#10B981', bg: '#E7F8F0' };
  }
  if (s.includes('comp') || s.includes('ict') || s.includes('code')) {
    return { icon: 'laptop', tint: '#6366F1', bg: '#EEEDFE' };
  }
  return { icon: 'book-open-page-variant', tint: '#6A5AE0', bg: '#EEEDFE' };
}
