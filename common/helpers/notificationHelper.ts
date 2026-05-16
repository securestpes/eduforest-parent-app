import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from 'common/constants';
import notifee, { AndroidImportance } from '@notifee/react-native';
import * as Speech from 'expo-speech';
import { FCM_ATTENDANCE_CHANNEL_ID } from '@/constants/fcmAndroid';

export const isVoiceAnnouncementsEnabled = async () => {
  const raw = await AsyncStorage.getItem(
    localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED
  );

  return raw === null ? true : raw === 'true';
};

const playVoiceAnnouncement = async (
  voiceMessage: string,
  language?: string
) => {
  console.log('Language:', language);
  if (typeof voiceMessage === 'string' && voiceMessage.length > 0) {
    try {
      const enabled = await isVoiceAnnouncementsEnabled();

      const alreadySpeaking = await Speech.isSpeakingAsync();

      if (enabled && !alreadySpeaking) {
        Speech.speak(voiceMessage, {
          language,
          pitch: 0.95,
          rate: 0.82,
          volume: 1,
        });
      }
    } catch (e) {
      console.warn('Voice failed', e);
    }
  }
};

export const displayNotification = async (
  remoteMessage: any,
  language?: string
) => {
  const imageUrl = remoteMessage.data?.image;
  await notifee.displayNotification({
    title: remoteMessage.data?.title ?? 'New Notification',

    body: remoteMessage.data?.body ?? 'You have a new message',

    data: remoteMessage.data,

    android: {
      channelId: FCM_ATTENDANCE_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_launcher',

      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },

      sound: 'default',
      // Small round image
      // largeIcon: imageUrl,

      // // Big expandable image
      // style: imageUrl
      //   ? {
      //       type: AndroidStyle.BIGPICTURE,
      //       picture: imageUrl,
      //     }
      //   : undefined,
    },
  });

  if (remoteMessage.data?.voice_message) {
    await playVoiceAnnouncement(remoteMessage.data.voice_message, language);
  }
};

export const mapNoticationLanguage = (language: string) => {
  if (language.startsWith('hi')) {
    return 'hi-IN';
  }
  if (language.startsWith('bn')) {
    return 'bn-IN';
  }
  if (language.startsWith('ta')) {
    return 'ta-IN';
  }
  return 'en-US';
};
