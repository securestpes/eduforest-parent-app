import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import type { RootStackParamList } from './Navigation';
import { MainTabs } from '../src/navigation/MainTabs';
import {
  HelpAndSupport,
  PrivacyPolicy,
  TermsAndConditions,
} from '../features/settings/components';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigation: React.FC = () => {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const headerTint = theme.colors.onPrimary;
  const headerStyle = { backgroundColor: theme.colors.primary };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
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
  );
};
