import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { AppTheme } from '../../../theme';
import { useAppTheme } from '../../contexts';

export const TextInput: React.FC<
  React.ComponentProps<typeof PaperInput> & {
    errorText?: string;
    icon?: IconSource;
  }
> = ({ errorText, icon, onPress, style, multiline, ...rest }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  return (
    <>
      <PaperInput
        right={
          icon ? <PaperInput.Icon icon={icon} onPress={onPress} /> : undefined
        }
        style={[multiline ? styles.inputMultiline : styles.input, style]}
        theme={{
          colors: {
            outline: theme.colors.border,
          },
          roundness: theme.borderRadius.lg,
        }}
        error={!!errorText}
        multiline={multiline}
        {...rest}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    input: {
      fontSize: theme.fontSizes.md,
      marginBottom: theme.margin.sm,
      height: theme.spacing.sm * 6,
    },
    inputMultiline: {
      fontSize: theme.fontSizes.md,
      marginBottom: theme.margin.sm,
      minHeight: theme.spacing.sm * 6,
      textAlignVertical: 'top',
    },
    errorText: {
      fontSize: theme.fontSizes.sm,
      marginTop: 4,
    },
  });
