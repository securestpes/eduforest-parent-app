import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from './Navigation';
import { MainTabs } from '../src/navigation/MainTabs';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigation: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
  </Stack.Navigator>
);
