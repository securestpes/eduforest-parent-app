import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from './Navigation';
import { Login, VerifyLogin } from '../features/login/components';

const Stack = createStackNavigator<RootStackParamList>();

export const AuthNavigation: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="VerifyLogin" component={VerifyLogin} />
  </Stack.Navigator>
);
