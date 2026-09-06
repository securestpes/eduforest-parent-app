import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, shadows } from '../../theme/appTheme';
import { useAppLanguage } from '../contexts';

export type StatusPopupVariant = 'success' | 'error';

type Props = {
  visible: boolean;
  variant?: StatusPopupVariant;
  title: string;
  message?: string;
  actionLabel?: string;
  onDismiss: () => void;
};

const VARIANT = {
  success: {
    icon: 'check' as const,
    iconBg: colors.successSoft,
    iconColor: colors.success,
    buttonBg: colors.success,
  },
  error: {
    icon: 'close' as const,
    iconBg: colors.dangerSoft,
    iconColor: colors.danger,
    buttonBg: colors.danger,
  },
};

export function StatusPopup({
  visible,
  variant = 'success',
  title,
  message,
  actionLabel,
  onDismiss,
}: Props) {
  const { t } = useAppLanguage();
  const look = VARIANT[variant];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: look.iconBg }]}>
            <MaterialCommunityIcons name={look.icon} size={28} color={look.iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable
            onPress={onDismiss}
            style={[styles.button, { backgroundColor: look.buttonBg }]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{actionLabel || t('common.ok')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    ...shadows.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    alignSelf: 'stretch',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.headerOn,
    fontSize: 15,
    fontWeight: '800',
  },
});
