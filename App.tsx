import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, StatusBar } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, Snackbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './redux/store';
import { Navigation } from './navigation';
import { lightTheme } from './theme';
import { FCM_ATTENDANCE_CHANNEL_ID } from '@/constants/fcmAndroid';
import { displayNotification } from 'common/helpers/notificationHelper';
import {
  AppLanguageProvider,
  useAppLanguage,
} from 'common/contexts/LanguageContext';

// ========================================
// CREATE CHANNEL
// ========================================

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

// ========================================
// REQUEST PERMISSION
// ========================================

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  }

  await messaging().requestPermission();
}

function AppContent() {
  const { language } = useAppLanguage();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  // ========================================
  // INIT
  // ========================================

  useEffect(() => {
    async function initializeNotifications() {
      await requestNotificationPermission();
      await createNotificationChannel();

      const token = await messaging().getToken();

      console.log('FCM TOKEN:', token);
    }

    initializeNotifications();
  }, []);

  // ========================================
  // FOREGROUND
  // ========================================

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('FOREGROUND MESSAGE:', remoteMessage);

      await displayNotification(remoteMessage, language);
    });

    return unsubscribe;
  }, [language]);

  // ========================================
  // NOTIFICATION CLICK
  // ========================================

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notification clicked', detail.notification);

        // Example:
        // navigationRef.navigate('Attendance');
      }
    });

    return unsubscribe;
  }, []);

  // ========================================
  // UI
  // ========================================

  return (
    <PaperProvider theme={lightTheme}>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />

        <Navigation />
      </NavigationContainer>

      <Snackbar
        visible={bannerVisible}
        onDismiss={() => setBannerVisible(false)}
        duration={4500}
        action={{
          label: 'OK',
          onPress: () => setBannerVisible(false),
        }}
        wrapperStyle={{
          bottom: 72,
        }}
      >
        {bannerMessage}
      </Snackbar>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <SafeAreaProvider>
          <AppLanguageProvider>
            <AppContent />
          </AppLanguageProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
