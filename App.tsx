import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Alert, Platform, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import * as RNFMsg from '@react-native-firebase/messaging';
import { AppThemeProvider, AppLanguageProvider } from './common';
import { lightTheme } from './theme';
import { Navigation } from './navigation';
import { store } from './redux/store';
import { FCM_ATTENDANCE_CHANNEL_ID } from './src/constants/fcmAndroid';

const fcm = RNFMsg.getMessaging(getApp());

async function ensureAndroidFcmSoundChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(FCM_ATTENDANCE_CHANNEL_ID, {
    name: 'Attendance & updates',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  });
}

export default function App() {
  useEffect(() => {
    async function bootstrapNotifications() {
      await ensureAndroidFcmSoundChannel();
      const authStatus = await RNFMsg.requestPermission(fcm);
      console.log('Permission:', authStatus);
    }

    void bootstrapNotifications();
  }, []);

  useEffect(() => {
    return RNFMsg.onMessage(fcm, async (remoteMessage) => {
      console.log('Foreground FCM message:', remoteMessage);
      const title = remoteMessage.notification?.title ?? 'New notification';
      const body = remoteMessage.notification?.body ?? 'You have a new message.';
      Alert.alert(title, body);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <PaperProvider theme={lightTheme}>
              <AppLanguageProvider>
                <NavigationContainer>
                  <StatusBar barStyle="dark-content" />
                  <Navigation />
                </NavigationContainer>
              </AppLanguageProvider>
            </PaperProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
