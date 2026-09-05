import React, { useMemo, useState } from 'react';
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
import { colors, spacing } from '../../../theme/appTheme';
import { useAppLanguage } from '../../../common';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState } from '../../../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStudentHomework } from '../hooks/useStudentHomework';
import { HomeworkTaskCard } from './HomeworkTaskCard';
import { HomeworkAttachments } from './HomeworkAttachments';
import { resolveHomeworkStatus, type HomeworkUiStatus } from '../utils/homeworkStatus';

type HomeworkTab = 'pending' | 'completed';

export function HomeworkPanel() {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const {
    loading,
    refreshing,
    error,
    counts,
    filtered: allFiltered,
    load,
    detail,
    setDetail,
    detailLoading,
    togglingId,
    openDetail,
    toggleDone,
  } = useStudentHomework();
  const [tab, setTab] = useState<HomeworkTab>('pending');
  const [subject, setSubject] = useState('all');

  const subjects = useMemo(() => {
    const names = [
      ...new Set(
        allFiltered
          .map(({ item }) => item.subjectName?.trim())
          .filter((name): name is string => Boolean(name))
      ),
    ];
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [allFiltered]);

  const pendingCount = counts.pending + counts.overdue;
  const rows = useMemo(() => {
    const inTab = allFiltered.filter(({ status }) =>
      tab === 'completed' ? status === 'submitted' : status !== 'submitted'
    );
    if (subject === 'all') return inTab;
    return inTab.filter(({ item }) => (item.subjectName || '').trim() === subject);
  }, [allFiltered, tab, subject]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.pad}
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
              ['pending', pendingCount, 'homework.tabPending'],
              ['completed', counts.submitted, 'homework.tabCompleted'],
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
              return (
                <Pressable
                  key={name}
                  onPress={() => setSubject(name)}
                  style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {name === 'all' ? t('homework.filterAll') : name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {rows.length === 0 ? (
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
            {rows.map(({ item, status }) => (
              <HomeworkTaskCard
                key={item.id}
                item={item}
                status={status as HomeworkUiStatus}
                onPress={() => void openDetail(item.id)}
                toggling={togglingId === item.id}
                onToggleDone={() => void toggleDone(item.id, status !== 'submitted')}
              />
            ))}
          </View>
        )}

        <Text style={styles.hint}>{t('homework.tapHint')}</Text>
      </ScrollView>

      <Modal
        visible={detail != null || detailLoading}
        animationType="slide"
        transparent
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
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
              <ScrollView>
                <Text style={styles.modalTitle}>{detail.title}</Text>
                <Text style={styles.modalMeta}>
                  {[detail.subjectName, detail.className, detail.sectionName]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
                {detail.description ? (
                  <Text style={styles.modalBody}>{detail.description}</Text>
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
                    void toggleDone(detail.id, resolveHomeworkStatus(detail) !== 'submitted')
                  }
                >
                  <Text style={styles.markBtnText}>
                    {resolveHomeworkStatus(detail) === 'submitted'
                      ? t('homework.undoDone')
                      : t('homework.markDone')}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: spacing.base, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
  },
  tabText: { fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: colors.headerOn },
  tabTextIdle: { color: colors.primary },
  chips: { gap: 8, paddingBottom: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E6E8EE',
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.headerOn },
  list: { gap: 12 },
  error: { color: colors.danger, marginBottom: 12 },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,16,50,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '80%',
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
    backgroundColor: '#F3F4F6',
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', paddingRight: 40 },
  modalMeta: { color: colors.textSecondary, marginTop: 8, fontSize: 14 },
  modalBody: { color: colors.textSecondary, marginTop: 16, lineHeight: 20, fontSize: 14 },
  markBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  markBtnText: { color: colors.headerOn, fontWeight: '700', fontSize: 15 },
  undoBtn: { backgroundColor: colors.textSecondary },
});
