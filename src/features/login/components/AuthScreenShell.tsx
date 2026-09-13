import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppLanguage, useAppTheme } from '../../../common';
import { createStyles, getLoginColors } from '../styles';

const parentLogo = require('../../../assets/icon.png');
const loginHero = require('../../../assets/login-hero.png');

export const AuthScreenShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useAppLanguage();
  const { theme, isDark } = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const loginColors = getLoginColors(isDark);
  const progress = useRef(new Animated.Value(0)).current;
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const expandedHero = Math.round(Math.max(300, Math.min(392, height * 0.44)));
  const collapsedHero = Math.round(insets.top + 118);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animate = (open: boolean, duration?: number) => {
      setKeyboardOpen(open);
      Animated.timing(progress, {
        toValue: open ? 1 : 0,
        duration: Math.max(duration ?? 250, 180),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const show = Keyboard.addListener(showEvent, (event) => {
      animate(true, event.duration);
    });
    const hide = Keyboard.addListener(hideEvent, (event) => {
      animate(false, event.duration);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [progress]);

  const heroHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [expandedHero, collapsedHero],
  });
  const cardLift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, -16],
  });
  const detailsOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });
  const detailsHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });
  const logoSize = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [68, 52],
  });
  const titleSize = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 22],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={loginColors.sky} />
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <Animated.View style={[styles.hero, { height: heroHeight }]}>
          <Image source={loginHero} resizeMode="cover" style={styles.heroImage} />
          {isDark ? (
            <View
              pointerEvents="none"
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(8, 8, 18, 0.42)',
              }}
            />
          ) : null}
          <View style={[styles.heroSafe, { paddingTop: insets.top + 8 }]}>
            <View style={styles.brandRow}>
              <Animated.View
                style={[
                  styles.brandLogoWrap,
                  { width: logoSize, height: logoSize },
                ]}
              >
                <Image source={parentLogo} style={styles.brandLogo} resizeMode="cover" />
              </Animated.View>
              <View style={styles.brandCopy}>
                <View style={styles.brandTitleRow}>
                  <Animated.Text style={[styles.brandEdu, { fontSize: titleSize }]}>
                    {t('login.heroEdu')}
                  </Animated.Text>
                  <Animated.Text style={[styles.brandForest, { fontSize: titleSize }]}>
                    {t('login.heroForest')}
                  </Animated.Text>
                </View>
                <Text style={styles.brandApp}>{t('login.heroApp')}</Text>
                <Animated.View style={{ opacity: detailsOpacity, height: detailsHeight, overflow: 'hidden' }}>
                  <View style={styles.brandRule} />
                  <Text style={styles.brandTagline}>{t('login.heroTagline')}</Text>
                </Animated.View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.card,
          {
            marginTop: cardLift,
            paddingBottom: keyboardOpen ? 12 : Math.max(insets.bottom, 8),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.cardScroll,
            { paddingBottom: keyboardOpen ? 24 : 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {keyboardOpen ? null : (
          <>
            <MaterialCommunityIcons
              name="leaf"
              size={40}
              color={loginColors.leaf}
              style={[styles.leafBl, { bottom: Math.max(insets.bottom, 8) }]}
            />
            <MaterialCommunityIcons
              name="leaf"
              size={40}
              color={loginColors.leaf}
              style={[styles.leafBr, { bottom: Math.max(insets.bottom, 8) }]}
            />
          </>
        )}
      </Animated.View>
    </View>
  );
};
