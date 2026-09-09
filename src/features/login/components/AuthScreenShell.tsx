import React from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppLanguage, useAppTheme } from '../../../common';
import { createStyles, LOGIN_COLORS } from '../styles';

const parentLogo = require('../../../assets/icon.png');
const loginHero = require('../../../assets/login-hero.png');

export const AuthScreenShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useAppLanguage();
  const { theme } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const styles = createStyles(theme);
  const heroHeight = Math.round(Math.max(280, Math.min(348, height * 0.41)));
  const heroImageWidth = Math.round(width * 1.18);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={LOGIN_COLORS.sky} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image
              source={loginHero}
              resizeMode="cover"
              style={[
                styles.heroImage,
                {
                  width: heroImageWidth,
                  height: heroHeight,
                },
              ]}
            />
            <SafeAreaView edges={['top']} style={styles.heroSafe}>
              <View style={styles.brandRow}>
                <View style={styles.brandLogoWrap}>
                  <Image source={parentLogo} style={styles.brandLogo} resizeMode="cover" />
                </View>
                <View style={styles.brandCopy}>
                  <View style={styles.brandTitleRow}>
                    <Text style={styles.brandEdu}>{t('login.heroEdu')}</Text>
                    <Text style={styles.brandForest}>{t('login.heroForest')}</Text>
                  </View>
                  <Text style={styles.brandApp}>{t('login.heroApp')}</Text>
                  <View style={styles.brandRule} />
                  <Text style={styles.brandTagline}>{t('login.heroTagline')}</Text>
                </View>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.card}>
            <ScrollView
              contentContainerStyle={styles.cardScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            <MaterialCommunityIcons
              name="leaf"
              size={40}
              color={LOGIN_COLORS.leaf}
              style={styles.leafBl}
            />
            <MaterialCommunityIcons
              name="leaf"
              size={40}
              color={LOGIN_COLORS.leaf}
              style={styles.leafBr}
            />
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
};
