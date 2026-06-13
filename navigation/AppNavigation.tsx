import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from './Navigation';
import { MainTabs } from '../src/navigation/MainTabs';
import { ChildHubScreen } from '../src/screens/ChildHubScreen';
import {
  HelpAndSupport,
  PrivacyPolicy,
  TermsAndConditions,
} from '../features/settings/components';
import { ParentOnboardingModal } from '../features/onboarding/ParentOnboardingModal';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';
import { localStorageKeys } from '../common/constants';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigation: React.FC = () => {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const headerTint = theme.colors.onPrimary;
  const headerStyle = { backgroundColor: theme.colors.primary };
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void (async () => {
      const done = await AsyncStorage.getItem(localStorageKeys.PARENT_ONBOARDING_COMPLETED);
      if (done !== 'true') setShowOnboarding(true);
    })();
  }, []);

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="ChildHub"
          component={ChildHubScreen}
          options={{
            headerShown: true,
            title: t('childHub.title'),
            headerStyle,
            headerTintColor: headerTint,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicy}
          options={{
            headerShown: true,
            title: t('nav.privacyPolicy'),
            headerStyle,
            headerTintColor: headerTint,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="TermsAndConditions"
          component={TermsAndConditions}
          options={{
            headerShown: true,
            title: t('nav.termsAndConditions'),
            headerStyle,
            headerTintColor: headerTint,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="HelpAndSupport"
          component={HelpAndSupport}
          options={{
            headerShown: true,
            title: t('nav.helpAndSupport'),
            headerStyle,
            headerTintColor: headerTint,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack.Navigator>
      <ParentOnboardingModal visible={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </>
  );
};
