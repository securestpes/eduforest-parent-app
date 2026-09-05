import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FilterChip } from '../../../components/ui/Badge';
import { colors, spacing, typography } from '../../../theme/appTheme';
import { useStudentHomework } from '../hooks/useStudentHomework';
import { OverviewCards } from './OverviewCards';
import { HomeworkListItem } from './HomeworkListItem';
import { ParentTipBanner } from './ParentTipBanner';
import type { HomeworkFilter } from '../utils/homeworkStatus';

export function HomeworkPanel() {
  const {
    loading,
    refreshing,
    error,
    filter,
    setFilter,
    counts,
    filtered,
    load,
    detail,
    setDetail,
    detailLoading,
    openDetail,
  } = useStudentHomework();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const chips: { id: HomeworkFilter; label: string }[] = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'pending', label: `Pending (${counts.pending})` },
    { id: 'submitted', label: `Submitted (${counts.submitted})` },
    { id: 'overdue', label: `Overdue (${counts.overdue})` },
  ];

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
        <View style={styles.overviewHead}>
          <Text style={[typography.section, { color: colors.text }]}>Homework Overview</Text>
          <View style={styles.week}>
            <Text style={[typography.meta, { color: colors.primary }]}>This Week</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary} />
          </View>
        </View>

        <OverviewCards
          pending={counts.pending}
          submitted={counts.submitted}
          overdue={counts.overdue}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              active={filter === chip.id}
              onPress={() => setFilter(chip.id)}
            />
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 24 }]}>
            No homework in this view.
          </Text>
        ) : (
          filtered.map(({ item, status }) => (
            <HomeworkListItem
              key={item.id}
              item={item}
              status={status}
              onPress={() => void openDetail(item.id)}
            />
          ))
        )}

        <ParentTipBanner />
      </ScrollView>

      <Modal
        visible={detail != null || detailLoading}
        animationType="slide"
        transparent
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {detailLoading || !detail ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView>
                <Text style={[typography.title, { color: colors.text }]}>{detail.title}</Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                  {[detail.subjectName, detail.className, detail.sectionName].filter(Boolean).join(' • ')}
                </Text>
                {detail.description ? (
                  <Text style={[typography.body, { color: colors.textSecondary, marginTop: 16, lineHeight: 20 }]}>
                    {detail.description}
                  </Text>
                ) : null}
                {detail.attachmentUrls?.map((url, index) => (
                  <Pressable key={`${url}-${index}`} onPress={() => void Linking.openURL(url)} style={styles.file}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Open file {index + 1}</Text>
                  </Pressable>
                ))}
                <Button mode="contained" buttonColor={colors.primary} style={{ marginTop: 20 }} onPress={() => setDetail(null)}>
                  Close
                </Button>
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
  pad: { padding: spacing.base, paddingBottom: 40, gap: 14 },
  overviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  week: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chips: { gap: 8, paddingVertical: 4 },
  error: { color: colors.danger },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,16,50,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  file: { marginTop: 12, paddingVertical: 10 },
});
