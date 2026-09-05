import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { ParentStudent } from '../../../services/parent';
import { useParentTheme } from '../../../theme/useParentTheme';
import { ChildCard } from './ChildCard';

const GAP = 12;

type Props = {
  students: ParentStudent[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
};

export function ChildrenCarousel({ students, selectedId, onSelect }: Props) {
  const { colors, spacing } = useParentTheme();
  const scrollRef = useRef<ScrollView>(null);
  const ignoreEndRef = useRef(false);
  const lastIdRef = useRef<number | null | undefined>(undefined);
  const screenW = Dimensions.get('window').width;
  const side = spacing.lg;
  const peek = Math.min(64, Math.max(40, Math.round(screenW * 0.14)));
  const cardWidth = Math.round(screenW - side - peek);
  const step = cardWidth + GAP;
  const selectedIndex = Math.max(
    0,
    students.findIndex((s) => s.id === selectedId),
  );

  const offsets = useMemo(
    () => students.map((_, i) => i * step),
    [students.length, step],
  );

  const scrollToIndex = (index: number, animated: boolean) => {
    ignoreEndRef.current = true;
    scrollRef.current?.scrollTo({ x: offsets[index] ?? 0, animated });
    setTimeout(() => {
      ignoreEndRef.current = false;
    }, 450);
  };

  useEffect(() => {
    if (!students.length) return;
    if (selectedId === lastIdRef.current) return;
    lastIdRef.current = selectedId;
    scrollToIndex(selectedIndex, true);
  }, [selectedId, selectedIndex, students.length]);

  const choose = (id: number) => {
    if (id === selectedId) return;
    lastIdRef.current = id;
    const i = students.findIndex((s) => s.id === id);
    if (i >= 0) scrollToIndex(i, true);
    onSelect(id);
  };

  const selectFromOffset = (x: number) => {
    if (ignoreEndRef.current) return;
    const i = Math.max(0, Math.min(students.length - 1, Math.round(x / step)));
    const next = students[i];
    if (!next || next.id === selectedId) return;
    lastIdRef.current = next.id;
    onSelect(next.id);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={offsets}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingLeft: side, paddingRight: side, paddingBottom: 4 }}
        onScrollBeginDrag={() => {
          ignoreEndRef.current = false;
        }}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          selectFromOffset(e.nativeEvent.contentOffset.x);
        }}
        onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (e.nativeEvent.velocity && Math.abs(e.nativeEvent.velocity.x) > 0.08) {
            return;
          }
          selectFromOffset(e.nativeEvent.contentOffset.x);
        }}
      >
        {students.map((s, i) => (
          <View key={s.id} style={{ marginRight: i === students.length - 1 ? 0 : GAP }}>
            <ChildCard
              student={s}
              selected={s.id === selectedId}
              width={cardWidth}
              compact={screenW < 400}
              onPress={() => choose(s.id)}
            />
          </View>
        ))}
      </ScrollView>
      {students.length > 1 ? (
        <View style={styles.dots}>
          {students.map((s) => {
            const on = s.id === selectedId;
            return (
              <Pressable
                key={s.id}
                onPress={() => choose(s.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: on ? colors.paginationActive : colors.paginationIdle,
                      width: on ? 8 : 7,
                      height: on ? 8 : 7,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  dot: {
    borderRadius: 999,
  },
});
