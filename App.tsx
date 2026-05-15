import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { Alert, DeviceEventEmitter, Platform, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, Snackbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import * as RNFMsg from '@react-native-firebase/messaging';
import { AppThemeProvider, AppLanguageProvider } from './common';
import { lightTheme } from './theme';
import { Navigation } from './navigation';
import { store } from './redux/store';
import { FCM_ATTENDANCE_CHANNEL_ID } from './src/constants/fcmAndroid';
import { APP_NOTIFICATION_RECEIVED_EVENT } from './src/constants/notifications';
import { localStorageKeys } from './common/constants';

const fcm = RNFMsg.getMessaging(getApp());
const NOTIFICATION_RATIONALE_SHOWN_KEY = 'notification_permission_rationale_shown';

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

async function isVoiceAnnouncementsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(
    localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED
  );
  return raw === null ? true : raw === 'true';
}

async function askNotificationRationale(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Enable Notifications',
      "We need notification permission to alert you when your child's attendance is marked.",
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Allow', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export default function App() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  useEffect(() => {
    async function bootstrapNotifications() {
      await ensureAndroidFcmSoundChannel();

      const isRuntimePermissionPlatform =
        Platform.OS === 'ios' ||
        (Platform.OS === 'android' && Number(Platform.Version) >= 33);

      if (isRuntimePermissionPlatform) {
        const rationaleShown = await AsyncStorage.getItem(
          NOTIFICATION_RATIONALE_SHOWN_KEY
        );
        if (rationaleShown !== 'true') {
          const agreed = await askNotificationRationale();
          await AsyncStorage.setItem(
            NOTIFICATION_RATIONALE_SHOWN_KEY,
            'true'
          );
          if (!agreed) {
            console.log('Notification permission request skipped by user.');
            return;
          }
        }
      }

      const authStatus = await RNFMsg.requestPermission(fcm);
      console.log('Permission:', authStatus);
    }

    void bootstrapNotifications();
  }, []);

  useEffect(() => {
    return RNFMsg.onMessage(fcm, async (remoteMessage) => {
      console.log('Foreground FCM message:', remoteMessage);
      const title =
        remoteMessage.notification?.title ??
        remoteMessage.data?.title ??
        'New notification';
      const body =
        remoteMessage.notification?.body ??
        remoteMessage.data?.short_message ??
        'You have a new message.';
      setBannerMessage(`${title}: ${body}`);
      setBannerVisible(true);
      DeviceEventEmitter.emit(APP_NOTIFICATION_RECEIVED_EVENT, {
        title,
        body,
        at: Date.now(),
      });

      const voiceMessage = remoteMessage.data?.voice_message;
      if (typeof voiceMessage === 'string' && voiceMessage.length > 0) {
        try {
          const enabled = await isVoiceAnnouncementsEnabled();
          const alreadySpeaking = await Speech.isSpeakingAsync();
          if (enabled && !alreadySpeaking) {
            Speech.speak(voiceMessage, {
              language: 'en-US',
              pitch: 0.95,
              rate: 0.82,
              volume: 1.0,
            });
          }
        } catch (e) {
          console.warn('Voice announcement failed', e);
        }
      }
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
                <Snackbar
                  visible={bannerVisible}
                  onDismiss={() => setBannerVisible(false)}
                  duration={4500}
                  action={{
                    label: 'OK',
                    onPress: () => setBannerVisible(false),
                  }}
                  wrapperStyle={{ bottom: 72 }}
                >
                  {bannerMessage}
                </Snackbar>
              </AppLanguageProvider>
            </PaperProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
