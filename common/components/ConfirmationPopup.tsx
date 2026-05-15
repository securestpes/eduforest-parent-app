import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Easing, Vibration } from 'react-native';
import { Portal, Modal, Text } from 'react-native-paper';
import { StyledButton } from './form-elements';
import { useAppLanguage, useAppTheme } from '../contexts';
import type { AppTheme } from '../../theme';

interface ConfirmationPopupProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
  confirmLoading?: boolean;
}

export const ConfirmationPopup = ({
  isVisible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonColor = '#EF4444',
  confirmLoading = false,
}: ConfirmationPopupProps) => {
  const { t } = useAppLanguage();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const anim = useRef(new Animated.Value(0)).current;
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsClosing(false);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      try {
        Vibration.vibrate(20);
      } catch {
        /* ignore */
      }
    } else if (!isVisible && !isClosing) {
      anim.setValue(0);
    }
  }, [isVisible, anim, isClosing]);

  const requestClose = (after?: () => void) => {
    if (isClosing) return;
    setIsClosing(true);
    Animated.timing(anim, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      try {
        after?.();
      } finally {
        onCancel();
        setIsClosing(false);
      }
    });
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const opacity = anim;

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={() => requestClose()}
        contentContainerStyle={[styles.modalRoot, { opacity: anim }]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.secondaryText }]}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            <StyledButton
              onPress={() => requestClose()}
              mode="outlined"
              disabled={confirmLoading}
              style={styles.actionBtn}
            >
              {cancelText ?? t('common.cancel')}
            </StyledButton>
            <StyledButton
              onPress={handleConfirm}
              mode="contained"
              buttonColor={confirmButtonColor}
              disabled={confirmLoading}
              loading={confirmLoading}
              style={styles.actionBtn}
            >
              {confirmText ?? t('common.confirm')}
            </StyledButton>
          </View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalRoot: {
      marginHorizontal: 24,
    },
    container: {
      borderRadius: 16,
      padding: 24,
      elevation: 8,
      position: 'relative',
      maxWidth: 400,
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'left',
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
      textAlign: 'left',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
    },
    actionBtn: {
      minWidth: 90,
    },
  });
