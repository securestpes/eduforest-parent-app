import { parseISO } from 'date-fns';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getMyStudents,
  getStudentFeeReceiptPdf,
  getStudentFees,
  getStudentSchoolCalendar,
  type ParentFeeLedger,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { shadows, spacing, useAppColors, type AppColors } from '../theme/appTheme';
import { StatusPopup, useAppLanguage, type StatusPopupVariant, type TranslationKey } from '../common';
import type { AppLanguage } from '../common/contexts/parentTranslations';
import { formatAppDate } from '../utils/appDateLocale';
import { formatInr } from '../features/home/utils/homeMetrics';
import { savePdfToDevice } from '../utils/savePdfToDevice';
import { payableFeeSummary, overviewFeeItems, historyMonthGroups, type HistoryMonthGroup, type OverviewFeeItem } from '../utils/feeDueBreakdown';
import { isMonthInSession, resolveSessionRange } from '../utils/academicSession';
import { useChildHubRestore, useHubAwareBack } from '../navigation/ChildHubNavContext';

type Props = { embedded?: boolean };
type FeesTab = 'due' | 'history';
type HistoryFilter = 'all' | 'month' | 'year' | 'custom';

function statusKey(status: string): string {
  return (status || '').toUpperCase();
}

function feeStatusLabel(
  status: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const s = statusKey(status);
  if (s === 'PAID' || s === 'COLLECTED') return t('fees.badgePaid');
  if (s === 'PARTIAL') return t('fees.statusPartial');
  if (s === 'OVERDUE') return t('fees.statusOverdue');
  if (s === 'WAIVED') return t('fees.statusWaived');
  if (s.includes('FUTURE')) return t('fees.statusFutureDue');
  if (s === 'DUE' || s === 'OPEN') return t('fees.statusDue');
  return status || t('fees.statusDue');
}

function feeHeadVisual(name: string): {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  bg: string;
  fg: string;
} {
  const n = name.toLowerCase();
  if (n.includes('transport') || n.includes('bus')) {
    return { icon: 'bus', bg: '#FDE8EE', fg: '#E11D48' };
  }
  if (n.includes('exam')) {
    return { icon: 'card-account-details-outline', bg: '#FFF1E6', fg: '#EA580C' };
  }
  if (n.includes('activit') || n.includes('sport')) {
    return { icon: 'clipboard-text-outline', bg: '#E8F8EF', fg: '#059669' };
  }
  if (n.includes('tuit') || n.includes('receipt')) {
    return { icon: 'file-document-outline', bg: '#EEEBFE', fg: '#6B5CE7' };
  }
  return { icon: 'cash', bg: '#E8F0FE', fg: '#2563EB' };
}

function badgeTone(status: string, colors: AppColors): { bg: string; fg: string } {
  const s = statusKey(status);
  if (s === 'PAID' || s === 'COLLECTED' || s === 'WAIVED') {
    return { bg: colors.successSoft, fg: colors.success };
  }
  if (s === 'OVERDUE') return { bg: colors.dangerSoft, fg: colors.danger };
  if (s === 'PARTIAL') return { bg: colors.warningSoft, fg: colors.warning };
  return { bg: colors.primarySoft, fg: colors.primary };
}

function formatFeeDueDate(value: string | null | undefined, language: AppLanguage): string {
  if (!value) return '';
  try {
    const parsed = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatAppDate(parsed, 'd MMM yyyy', language);
  } catch {
    return value;
  }
}

function FeesSummaryCard({ ledger }: { ledger: ParentFeeLedger | null }) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const summary = payableFeeSummary(ledger);

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('fees.outstandingSummary')}</Text>
      <View style={styles.summarySplit}>
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryKicker}>{t('fees.totalOutstanding')}</Text>
          <Text style={[styles.summaryHeroAmount, { color: colors.primary }]}>
            {formatInr(summary.pending)}
          </Text>
        </View>
        <View style={styles.summarySide}>
          <View style={styles.summarySideRow}>
            <Text style={styles.summaryKicker}>{t('fees.sectionOverdue')}</Text>
            <Text style={[styles.summarySideAmount, { color: colors.danger }]}>
              {formatInr(summary.overdue)}
            </Text>
          </View>
          <View style={styles.summarySideRow}>
            <Text style={styles.summaryKicker}>{t('fees.sectionDueThisMonth')}</Text>
            <Text style={[styles.summarySideAmount, { color: colors.warning }]}>
              {formatInr(summary.dueThisMonth)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function OverviewItemCard({ item }: { item: OverviewFeeItem }) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const visual = feeHeadVisual(item.title);
  const overdue = item.kind === 'overdue';
  const dateLabel = formatFeeDueDate(item.dueDate, language);
  const note = dateLabel
    ? overdue
      ? t('fees.overdueSince', { date: dateLabel })
      : t('fees.dueBy', { date: dateLabel })
    : overdue
      ? t('fees.statusOverdue')
      : t('fees.statusDue');

  return (
    <View style={styles.overviewCard}>
      <View style={[styles.rowIcon, { backgroundColor: overdue ? colors.dangerSoft : visual.bg }]}>
        <MaterialCommunityIcons
          name={visual.icon}
          size={20}
          color={overdue ? colors.danger : visual.fg}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.monthLabel}
        </Text>
        <Text
          style={[styles.overviewNote, { color: overdue ? colors.danger : colors.warning }]}
          numberOfLines={1}
        >
          {note}
        </Text>
      </View>
      <Text style={styles.rowAmount}>{formatInr(item.amount)}</Text>
    </View>
  );
}

function FeesHelpBanner() {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.helpCard}>
      <MaterialCommunityIcons name="shield-check" size={28} color={colors.primary} />
      <Text style={styles.helpText}>{t('fees.helpContact')}</Text>
    </View>
  );
}

function OverviewPanel({ ledger }: { ledger: ParentFeeLedger | null }) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { overdue, dueThisMonth } = overviewFeeItems(ledger, new Date(), language);

  if (!overdue.length && !dueThisMonth.length) {
    return (
      <View>
        <EmptyState
          icon="check-circle-outline"
          title={t('fees.emptyDueTitle')}
          message={t('fees.emptyDueMessage')}
        />
        <FeesHelpBanner />
      </View>
    );
  }

  const sections: { key: 'overdue' | 'due'; title: string; color: string; items: OverviewFeeItem[] }[] = [
    {
      key: 'overdue',
      title: t('fees.sectionOverdue'),
      color: colors.danger,
      items: overdue,
    },
    {
      key: 'due',
      title: t('fees.sectionDueThisMonth'),
      color: colors.warning,
      items: dueThisMonth,
    },
  ];

  return (
    <View>
      {sections.map((section) =>
        section.items.length ? (
          <View key={section.key} style={styles.group}>
            <View style={styles.sectionHead}>
              <Text style={[styles.groupTitle, { color: section.color, marginBottom: 0 }]}>
                {section.title}
              </Text>
              <View style={[styles.countPill, { backgroundColor: `${section.color}22` }]}>
                <Text style={[styles.countPillText, { color: section.color }]}>
                  {section.items.length === 1
                    ? t('fees.itemCount', { count: 1 })
                    : t('fees.itemsCount', { count: section.items.length })}
                </Text>
              </View>
            </View>
            {section.items.map((item) => (
              <OverviewItemCard key={item.id} item={item} />
            ))}
          </View>
        ) : null
      )}
      <FeesHelpBanner />
    </View>
  );
}

function ReceiptDownloadButton({
  receiptId,
  rowId,
  downloadingId,
  onDownload,
}: {
  receiptId?: number;
  rowId: string;
  downloadingId?: string | null;
  onDownload?: (receiptId: number, rowId: string) => void;
}) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (receiptId == null || !onDownload) return null;
  return (
    <Pressable
      onPress={() => onDownload(receiptId, rowId)}
      hitSlop={8}
      style={styles.downloadBtn}
      accessibilityLabel={t('fees.download')}
    >
      {downloadingId === rowId ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <MaterialCommunityIcons
          name="download-outline"
          size={20}
          color={colors.primary}
        />
      )}
    </Pressable>
  );
}

function HistoryPanel({
  groups,
  sessionRange,
  downloadingId,
  onDownload,
}: {
  groups: HistoryMonthGroup[];
  sessionRange: { start: Date; end: Date } | null;
  downloadingId?: string | null;
  onDownload?: (receiptId: number, rowId: string) => void;
}) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [customKey, setCustomKey] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const now = new Date();
  const sessionGroups = useMemo(
    () =>
      groups.filter((g) =>
        isMonthInSession(
          new Date(Math.floor(g.sortKey / 12), g.sortKey % 12, 1),
          sessionRange
        )
      ),
    [groups, sessionRange]
  );
  const filtered = sessionGroups.filter((g) => {
    const d = new Date(Math.floor(g.sortKey / 12), g.sortKey % 12, 1);
    if (filter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (filter === 'year') return d.getFullYear() === now.getFullYear();
    if (filter === 'custom') return customKey ? g.key === customKey : true;
    return true;
  });

  const chips: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: t('fees.filterAll') },
    { id: 'month', label: t('fees.filterThisMonth') },
    { id: 'year', label: t('fees.filterThisYear') },
    { id: 'custom', label: t('fees.filterCustom') },
  ];

  if (!sessionGroups.length) {
    return (
      <EmptyState
        icon="history"
        title={t('fees.emptyHistoryTitle')}
        message={t('fees.emptyHistoryMessage')}
      />
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => {
                if (chip.id === 'custom') {
                  setCustomOpen(true);
                  return;
                }
                setFilter(chip.id);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.id === 'custom' && customKey
                  ? sessionGroups.find((g) => g.key === customKey)?.title || chip.label
                  : chip.label}
              </Text>
              {chip.id === 'custom' ? (
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={14}
                  color={active ? colors.headerOn : colors.textSecondary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="history"
          title={t('fees.emptyHistoryTitle')}
          message={t('fees.emptyHistoryMessage')}
        />
      ) : (
        filtered.map((group) => {
          const expanded = openKeys[group.key] ?? group.status !== 'paid';
          const tone =
            group.status === 'overdue'
              ? badgeTone('OVERDUE', colors)
              : group.status === 'due'
                ? badgeTone('DUE', colors)
                : badgeTone('PAID', colors);
          return (
            <View key={group.key} style={styles.historyCard}>
              <Pressable
                onPress={() =>
                  setOpenKeys((prev) => ({
                    ...prev,
                    [group.key]: !expanded,
                  }))
                }
                style={styles.historyHead}
              >
                <Text style={styles.historyMonth}>{group.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusPillText, { color: tone.fg }]}>
                    {feeStatusLabel(group.status === 'paid' ? 'PAID' : group.status === 'overdue' ? 'OVERDUE' : 'DUE', t)}
                  </Text>
                </View>
                <ReceiptDownloadButton
                  receiptId={group.receiptId}
                  rowId={`month-${group.key}`}
                  downloadingId={downloadingId}
                  onDownload={onDownload}
                />
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
              {expanded ? (
                <View style={styles.historyBody}>
                  {group.items.map((item, index) => {
                    const visual = feeHeadVisual(item.title);
                    return (
                      <View
                        key={`${group.key}-${item.title}-${index}`}
                        style={[
                          styles.historyRow,
                          index < group.items.length - 1 && styles.tableRowBorder,
                        ]}
                      >
                        <View style={[styles.rowIcon, { backgroundColor: visual.bg }]}>
                          <MaterialCommunityIcons name={visual.icon} size={20} color={visual.fg} />
                        </View>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowTitle}>{item.title}</Text>
                          {item.paidOn ? (
                            <Text style={[styles.rowSub, { color: colors.success }]}>
                              {t('fees.paidOn', { date: formatFeeDueDate(item.paidOn, language) || item.paidOn })}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.rowAmount}>{formatInr(item.amount)}</Text>
                        <ReceiptDownloadButton
                          receiptId={item.receiptId}
                          rowId={`${group.key}-${index}`}
                          downloadingId={downloadingId}
                          onDownload={onDownload}
                        />
                      </View>
                    );
                  })}
                  <View style={styles.totalPaidRow}>
                    <Text style={styles.totalPaidLabel}>{t('fees.totalPaid')}</Text>
                    <Text style={styles.totalPaidValue}>{formatInr(group.totalPaid)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomOpen(false)} />
          <View style={styles.pickerCard}>
            <View style={styles.pickerHead}>
              <View style={styles.pickerHeadIcon}>
                <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.pickerHeadCopy}>
                <Text style={styles.pickerTitle}>{t('fees.selectMonth')}</Text>
                <Text style={styles.pickerHint}>{t('fees.selectMonthHint')}</Text>
              </View>
              <Pressable
                onPress={() => setCustomOpen(false)}
                hitSlop={8}
                style={styles.pickerClose}
                accessibilityLabel={t('common.close')}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {[...sessionGroups].sort((a, b) => b.sortKey - a.sortKey).map((g, index, list) => {
                const selected = customKey === g.key;
                return (
                  <Pressable
                    key={g.key}
                    style={[
                      styles.pickerRow,
                      selected && styles.pickerRowActive,
                      index < list.length - 1 && styles.pickerRowBorder,
                    ]}
                    onPress={() => {
                      setCustomKey(g.key);
                      setFilter('custom');
                      setCustomOpen(false);
                    }}
                  >
                    <View style={[styles.pickerMonthIcon, selected && styles.pickerMonthIconActive]}>
                      <MaterialCommunityIcons
                        name="calendar-blank-outline"
                        size={18}
                        color={selected ? colors.headerOn : colors.primary}
                      />
                    </View>
                    <View style={styles.pickerRowCopy}>
                      <Text style={[styles.pickerRowTitle, selected && styles.pickerRowTitleActive]}>
                        {g.title}
                      </Text>
                      <Text style={styles.pickerRowSub}>{formatInr(g.totalPaid)}</Text>
                    </View>
                    {selected ? (
                      <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                    ) : (
                      <View style={styles.pickerRadio} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function FeesScreen({ embedded = false }: Props) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const restore = useChildHubRestore();
  const goBack = useHubAwareBack();
  const studentId = useSelectionStore((s) => s.selectedStudentId);
  const [tab, setTab] = useState<FeesTab>('due');
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [ledger, setLedger] = useState<ParentFeeLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingRowId, setDownloadingRowId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
  } | null>(null);
  const [sessionRange, setSessionRange] = useState<{ start: Date; end: Date } | null>(
    null
  );

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const load = useCallback(
    async (isRefresh = false) => {
      if (studentId == null) {
        setLedger(null);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [stRes, feeRes, calRes] = await Promise.all([
          getMyStudents(),
          getStudentFees(studentId),
          getStudentSchoolCalendar(studentId).catch(() => null),
        ]);
        const nextStudents =
          stRes.status && Array.isArray(stRes.data) ? stRes.data : [];
        if (nextStudents.length) setStudents(nextStudents);
        const studentYear =
          nextStudents.find((s) => s.id === studentId)?.academicYear ?? null;
        setSessionRange(
          resolveSessionRange({
            startDate: calRes?.status ? calRes.data?.startDate : null,
            endDate: calRes?.status ? calRes.data?.endDate : null,
            academicYear:
              calRes?.status && calRes.data?.sessionName
                ? calRes.data.sessionName
                : studentYear,
          })
        );
        if (!feeRes.status || !feeRes.data) {
          setError(feeRes.message || t('fees.loadFailed'));
          setLedger(null);
          return;
        }
        setLedger(feeRes.data);
      } catch (e: any) {
        setError(e?.message || t('fees.loadFailed'));
        setLedger(null);
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

  const overview = useMemo(() => overviewFeeItems(ledger, new Date(), language), [ledger, language]);
  const historyGroups = useMemo(() => historyMonthGroups(ledger, language), [ledger, language]);

  const tabCounts: Record<FeesTab, number> = {
    due: overview.overdue.length + overview.dueThisMonth.length,
    history: historyGroups.reduce((sum, g) => sum + g.items.length, 0),
  };

  const downloadPdf = async (id: number, rowId?: string) => {
    if (studentId == null || downloading) return;
    setDownloading(true);
    if (rowId) setDownloadingRowId(rowId);
    try {
      const res = await getStudentFeeReceiptPdf(studentId, id);
      if (!res.status || !res.data?.contentBase64) {
        throw new Error(res.message || t('fees.receiptDownloadFailed'));
      }
      const result = await savePdfToDevice({
        fileName: res.data.fileName || `Receipt_${id}.pdf`,
        contentBase64: res.data.contentBase64,
        mimeType: res.data.mimeType || 'application/pdf',
      });
      if (result === 'cancelled') return;
      setStatus({
        variant: 'success',
        title: result === 'shared' ? t('fees.receiptShared') : t('fees.receiptSaved'),
      });
    } catch (e: any) {
      setStatus({
        variant: 'error',
        title: e?.message || t('fees.receiptDownloadFailed'),
      });
    } finally {
      setDownloading(false);
      setDownloadingRowId(null);
    }
  };

  if (studentId == null) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <EmptyState
            icon="gesture-tap"
            title={t('fees.pickStudentTitle')}
            message={t('fees.pickStudentMessage')}
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  const tabs: { id: FeesTab; label: string }[] = [
    { id: 'due', label: t('fees.overview') },
    { id: 'history', label: t('fees.paymentHistory') },
  ];

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
          const count = tabCounts[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={styles.tabBtn}
            >
              <View style={styles.tabLabelRow}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {item.label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
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
        <EmptyState icon="alert-circle-outline" title={t('fees.loadFailed')} message={error} />
      ) : !ledger || (!ledger.hasAssignment && !(ledger.installments?.length > 0)) ? (
        <EmptyState
          icon="currency-inr"
          title={t('fees.emptyTitle')}
          message={t('fees.emptyMessage')}
        />
      ) : tab === 'due' ? (
        <OverviewPanel ledger={ledger} />
      ) : (
        <HistoryPanel
          groups={historyGroups}
          sessionRange={sessionRange}
          downloadingId={downloadingRowId}
          onDownload={(id, rowId) => void downloadPdf(id, rowId)}
        />
      )}

      {tab !== 'due' ? <FeesHelpBanner /> : null}
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

  return (
    <View style={styles.standalone}>
      <StudentModuleHero
        title={t('fees.title')}
        subtitle={t('tabs.feesSubtitle')}
        student={selectedStudent}
        heroIcon="wallet-outline"
        onBack={restore ? goBack : undefined}
        backAccessibilityLabel={restore ? t('attendance.backHome') : undefined}
      >
        <FeesSummaryCard ledger={ledger} />
      </StudentModuleHero>
      {body}
      {popup}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
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
  summaryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  summarySplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryTotal: { flex: 1.2, minWidth: 0 },
  summaryHeroAmount: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  summarySide: { flex: 1, gap: 10, minWidth: 0 },
  summarySideRow: { gap: 2 },
  summarySideAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryKicker: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.primarySoft,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },
  tabUnderline: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary,
  },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countPillText: { fontSize: 11, fontWeight: '700' },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  overviewNote: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: { gap: 8, paddingBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.headerOn, fontWeight: '700' },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  historyMonth: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  historyBody: { paddingHorizontal: 4, paddingBottom: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  totalPaidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  totalPaidLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  totalPaidValue: { fontSize: 15, fontWeight: '800', color: colors.success },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: '72%',
    ...shadows.card,
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pickerHeadIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerHeadCopy: { flex: 1, minWidth: 0 },
  pickerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  pickerHint: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  pickerList: { maxHeight: 360, paddingHorizontal: 8, paddingBottom: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  pickerRowActive: {
    backgroundColor: colors.primarySoft,
  },
  pickerRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pickerMonthIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerMonthIconActive: {
    backgroundColor: colors.primary,
  },
  pickerRowCopy: { flex: 1, minWidth: 0 },
  pickerRowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pickerRowTitleActive: {
    color: colors.primaryDark,
  },
  pickerRowSub: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  downloadBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCard: {
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  });
}
