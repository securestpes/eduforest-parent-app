import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
};

export const Link = ({ children, onPress, disabled = false, style }: Props) => {
  const theme = useTheme();

  return (
    <Pressable onPress={disabled ? undefined : onPress}>
      <Text
        style={[
          styles.link,
          {
            color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.primary,
          },
          style,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});
