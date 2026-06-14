import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from '../../common/constants';
import type { AppTheme } from '../../theme';
import { useAppLanguage, type TranslationKey } from '../../common';

type Slide = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

const SLIDES: Slide[] = [
  {
    icon: 'home-heart',
    titleKey: 'onboarding.slide1.title',
    bodyKey: 'onboarding.slide1.body',
  },
  {
    icon: 'bell-ring',
    titleKey: 'onboarding.slide2.title',
    bodyKey: 'onboarding.slide2.body',
  },
  {
    icon: 'account-child',
    titleKey: 'onboarding.slide3.title',
    bodyKey: 'onboarding.slide3.body',
  },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export function ParentOnboardingModal({ visible, onComplete }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index >= SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(
      localStorageKeys.PARENT_ONBOARDING_COMPLETED,
      'true'
    );
    onComplete();
  };

  const onNext = () => {
    if (isLast) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name={slide.icon}
              size={40}
              color={theme.colors.primary}
            />
          </View>
          <Text
            variant="headlineSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            {t(slide.titleKey)}
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {t(slide.bodyKey)}
          </Text>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === index
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                  },
                ]}
              />
            ))}
          </View>

          <Button mode="contained" onPress={onNext} style={{ marginTop: 20 }}>
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Button>
          {!isLast ? (
            <Pressable
              onPress={() => void finish()}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('onboarding.skip')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
