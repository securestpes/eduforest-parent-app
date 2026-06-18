import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginSuccess, logout, type IAuth } from '../features';
import { localStorageKeys, GlobalOfflineBanner } from '../common';
import {
  mapParentMeToUser,
  ParentProfileService,
} from '../features/profile/services/ParentProfileService';
import type { MainTabParamList } from './MainTabs';
import type { ChildChipAction } from '../components/ChildActionChips';
import { AuthNavigation } from './AuthNavigation';
import { AppNavigation } from './AppNavigation';
import type { RootState } from '../redux/store';

export type RootStackParamList = {
  LegalConsent: undefined;
  Login: undefined;
  VerifyLogin: {
    mobileNumber: string;
    verificationId?: string;
    phoneAuthMethodHint?: 'instant';
    prefilledOtp?: string;
  };
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Profile: undefined;
  ChildHub: {
    studentId?: number;
    section?: ChildChipAction;
    highlightAttendanceId?: number;
    highlightSessionDate?: string;
  } | undefined;
  PrivacyPolicy: undefined;
  TermsAndConditions: undefined;
  HelpAndSupport: undefined;
};

async function migrateLegacyToken(): Promise<void> {
  const cur = await AsyncStorage.getItem(localStorageKeys.ACCESS_TOKEN);
  if (cur) return;
  const leg = await AsyncStorage.getItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
  if (leg) {
    await AsyncStorage.setItem(localStorageKeys.ACCESS_TOKEN, leg);
    await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
  }
}

export const Navigation: React.FC = () => {
  const dispatch = useDispatch();
  const auth: IAuth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const checkToken = async () => {
      await migrateLegacyToken();
      const token = await AsyncStorage.getItem(localStorageKeys.ACCESS_TOKEN);
      if (token) {
        try {
          const decoded = jwtDecode<Record<string, unknown>>(token);
          const currentTime = Date.now() / 1000;
          const exp = decoded.exp as number | undefined;
          if (exp && exp < currentTime) {
            await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
            dispatch(logout());
            return;
          }
          try {
            const userResponse = await ParentProfileService.getUser();
            if (userResponse?.status && userResponse.data) {
              dispatch(
                loginSuccess(
                  mapParentMeToUser(
                    userResponse.data as Record<string, unknown>
                  )
                )
              );
            } else {
              dispatch(loginSuccess(mapParentMeToUser(decoded)));
            }
          } catch (e) {
            console.warn('Parent profile fetch failed, using token claims:', e);
            dispatch(loginSuccess(mapParentMeToUser(decoded)));
          }
          return;
        } catch {
          await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
          dispatch(logout());
        }
      } else {
        dispatch(logout());
      }
    };

    void checkToken();
  }, [dispatch]);

  if (auth.isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlobalOfflineBanner />
      {auth.isAuthenticated ? <AppNavigation /> : <AuthNavigation />}
    </View>
  );
};
