import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, StatusBar } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './redux/store';
import { Navigation } from './navigation';
import { FCM_ATTENDANCE_CHANNEL_ID } from '@/constants/fcmAndroid';
import { displayNotification } from 'common/helpers/notificationHelper';
import {
  AppLanguageProvider,
  useAppLanguage,
} from 'common/contexts/LanguageContext';
import { AppThemeProvider, useAppTheme } from 'common/contexts/ThemeContext';
import { handleIncomingPushNotification } from './src/services/pendingPushNotifications';
import {
  navigateFromNotification,
  navigationRef,
  parseNotificationNavigation,
} from './src/navigation/navigationRef';
import { ForceUpdateModal } from './features/versionCheck/ForceUpdateModal';
import { VersionService } from './features/versionCheck/versionService';

async function createNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: FCM_ATTENDANCE_CHANNEL_ID,
    name: 'Attendance & Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    lights: true,
    badge: true,
  });
}

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  await messaging().requestPermission();
}

function handleNotificationOpen(data: Record<string, string> | undefined) {
  const payload = parseNotificationNavigation(data);
  if (payload) {
    navigateFromNotification(payload);
  }
}

function AppContent() {
  const { language } = useAppLanguage();
  const { theme, isDark } = useAppTheme();
  const [forceUpdateVisible, setForceUpdateVisible] = useState(false);

  useEffect(() => {
    async function initializeNotifications() {
      await requestNotificationPermission();
      await createNotificationChannel();
      const token = await messaging().getToken();
      console.log('FCM TOKEN:', token);
    }

    void initializeNotifications();
  }, []);

  useEffect(() => {
    void VersionService.checkAppVersion().then((result) => {
      if (result.forceUpdate) setForceUpdateVisible(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('FOREGROUND MESSAGE:', remoteMessage);
      await displayNotification(remoteMessage, language);
      handleIncomingPushNotification(remoteMessage.data);
    });

    return unsubscribe;
  }, [language]);

  useEffect(() => {
    const unsubscribeFg = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handleNotificationOpen(detail.notification?.data as Record<string, string> | undefined);
      }
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationOpen(remoteMessage.data as Record<string, string> | undefined);
    });

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          handleNotificationOpen(remoteMessage.data as Record<string, string>);
        }
      });

    return () => {
      unsubscribeFg();
      unsubscribeOpened();
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Navigation />
      </NavigationContainer>
      <ForceUpdateModal visible={forceUpdateVisible} />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <SafeAreaProvider>
          <AppLanguageProvider>
            <AppThemeProvider>
              <AppContent />
            </AppThemeProvider>
          </AppLanguageProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
