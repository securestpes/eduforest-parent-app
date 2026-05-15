import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from './Navigation';
import { LegalConsent, Login, VerifyLogin } from '../features/login/components';
import { localStorageKeys } from '../common/constants';

const Stack = createStackNavigator<Pick<RootStackParamList, 'LegalConsent' | 'Login' | 'VerifyLogin'>>();

export const AuthNavigation: React.FC = () => {
  const [initialRouteName, setInitialRouteName] = useState<
    keyof Pick<RootStackParamList, 'LegalConsent' | 'Login' | 'VerifyLogin'> | undefined
  >(undefined);

  useEffect(() => {
    const loadConsent = async () => {
      try {
        const accepted = await AsyncStorage.getItem(localStorageKeys.LEGAL_CONSENT_ACCEPTED);
        setInitialRouteName(accepted === 'true' ? 'Login' : 'LegalConsent');
      } catch {
        setInitialRouteName('LegalConsent');
      }
    };
    void loadConsent();
  }, []);

  if (!initialRouteName) {
    return null;
  }

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LegalConsent" component={LegalConsent} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="VerifyLogin" component={VerifyLogin} />
    </Stack.Navigator>
  );
};
