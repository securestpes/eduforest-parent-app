import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useParentTheme } from '../../../theme/useParentTheme';
import type { ModuleAccent } from '../../../theme/parentHomeTheme';

export type OverviewTile = {
  key: string;
  label: string;
  metric: string;
  sub: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent: ModuleAccent;
  onPress: () => void;
};

function columnsForWidth(width: number) {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

export function OverviewGrid({ tiles }: { tiles: OverviewTile[] }) {
  const { colors } = useParentTheme();
  const { width } = useWindowDimensions();
  const columns = columnsForWidth(width);
  const compact = columns >= 3;
  const tileWidth = `${(100 - (columns - 1) * 2.2) / columns}%` as `${number}%`;

  const layout = useMemo(
    () => ({
      tile: {
        width: tileWidth,
        paddingVertical: compact ? 10 : 14,
        paddingHorizontal: compact ? 8 : 12,
        paddingRight: compact ? 20 : 24,
        gap: compact ? 6 : 10,
      },
      icon: compact ? 28 : 36,
      iconGlyph: compact ? 16 : 20,
      label: compact ? 10 : 12,
      metric: compact ? 13 : 18,
      sub: compact ? 9 : 11,
    }),
    [compact, tileWidth]
  );

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          onPress={tile.onPress}
          style={[styles.tile, layout.tile, { backgroundColor: tile.accent.card }]}
        >
          <View
            style={[
              styles.iconWell,
              {
                backgroundColor: tile.accent.well,
                width: layout.icon,
                height: layout.icon,
                borderRadius: layout.icon / 2,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={tile.icon}
              size={layout.iconGlyph}
              color={tile.accent.icon}
            />
          </View>
          <View style={styles.copy}>
            <Text
              style={[styles.label, { color: colors.text, fontSize: layout.label }]}
              numberOfLines={1}
            >
              {tile.label}
            </Text>
            <Text
              style={[styles.metric, { color: tile.accent.metric, fontSize: layout.metric }]}
              numberOfLines={1}
            >
              {tile.metric}
            </Text>
            <Text
              style={[styles.sub, { color: tile.accent.metric, fontSize: layout.sub }]}
              numberOfLines={1}
            >
              {tile.sub}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={compact ? 16 : 18}
            color={tile.accent.icon}
            style={styles.chevron}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  chevron: {
    position: 'absolute',
    top: 8,
    right: 4,
  },
  label: { fontWeight: '700', letterSpacing: -0.1 },
  metric: { fontWeight: '800', letterSpacing: -0.2, marginTop: 1 },
  sub: { fontWeight: '500', marginTop: 1 },
});
