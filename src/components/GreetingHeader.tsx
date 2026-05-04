import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

function greetingLine(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingHeader({
  nameHint,
  subtitle,
}: {
  nameHint?: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  const { line, sub } = useMemo(() => {
    const hour = new Date().getHours();
    return {
      line: greetingLine(hour),
      sub:
        subtitle ??
        (nameHint
          ? `Stay close to ${nameHint.split(' ')[0]}’s learning journey`
          : 'Your family’s school updates in one place'),
    };
  }, [nameHint, subtitle]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="leaf" size={28} color={theme.colors.primary} />
      </View>
      <View style={styles.textCol}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary, letterSpacing: 0.5 }}>
          {line}
        </Text>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          EduForest Parent
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, paddingTop: 2 },
  title: { fontWeight: '700', marginTop: 2 },
});
