import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as Paperbutton, Text } from 'react-native-paper';
import { useAppTheme } from '../../contexts';
import { AppTheme } from '../../../theme';

interface StyledButtonProps {
  onPress?: () => void;
}

export const StyledButton: React.FC<
  React.ComponentProps<typeof Paperbutton> & StyledButtonProps
> = ({
  style,
  onPress,
  children,
  mode = 'contained',
  disabled = false,
  loading = false,
  ...rest
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const color =
    disabled || loading
      ? theme.colors.secondaryText
      : mode === 'contained'
        ? 'white'
        : theme.colors.primary;

  return (
    <Paperbutton
      loading={loading}
      mode={mode}
      onPress={onPress}
      contentStyle={{
        height: 48,
      }}
      disabled={disabled || loading}
      style={[styles.styledButton, style]}
      {...rest}
    >
      <Text style={{ color, fontSize: 14 }}>{children}</Text>
    </Paperbutton>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    styledButton: {
      borderRadius: theme.borderRadius.lg,
    },
  });
