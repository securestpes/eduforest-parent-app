import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme/appTheme';
import { initials, avatarHue } from '../../utils/attendanceVisuals';

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const hue = avatarHue(name);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsl(${hue} 48% 46%)`,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ]}
    >
      <Text style={[typography.cardTitle, { color: colors.headerOn }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
