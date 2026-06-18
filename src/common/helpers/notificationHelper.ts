import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from '../constants';
import notifee, { AndroidImportance } from '@notifee/react-native';
import * as Speech from 'expo-speech';
import { FCM_ATTENDANCE_CHANNEL_ID } from '@/constants/fcmAndroid';
import type { AppLanguage } from '../contexts/parentTranslations';
import { buildLocalizedNotificationContent } from './attendanceNotificationBuilder';
import { buildLocalizedVoiceMessage } from './voiceAnnouncementBuilder';
import {
  getNotificationPreferences,
  shouldPlayVoiceForNotification,
  shouldShowAttendanceNotification,
} from '../../services/notificationPreferences';

export const isVoiceAnnouncementsEnabled = async () => {
  const raw = await AsyncStorage.getItem(
    localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED
  );

  return raw === null ? true : raw === 'true';
};

const playVoiceAnnouncement = async (
  voiceMessage: string,
  ttsLocale: string
) => {
  if (typeof voiceMessage === 'string' && voiceMessage.length > 0) {
    try {
      const enabled = await isVoiceAnnouncementsEnabled();

      const alreadySpeaking = await Speech.isSpeakingAsync();

      if (enabled && !alreadySpeaking) {
        Speech.speak(voiceMessage, {
          language: ttsLocale,
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

function fcmDataAsStrings(
  data: Record<string, string | object> | undefined
): Record<string, string> | undefined {
  if (!data) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (value != null) {
      out[key] = String(value);
    }
  }
  return out;
}

export const displayNotification = async (
  remoteMessage: { data?: Record<string, string | object> },
  language: AppLanguage = 'en'
) => {
  const data = fcmDataAsStrings(remoteMessage.data);
  const prefs = await getNotificationPreferences();
  if (data && !shouldShowAttendanceNotification(data, prefs)) {
    return;
  }
  const localizedPush = buildLocalizedNotificationContent(data, language);
  await notifee.displayNotification({
    title: localizedPush?.title ?? data?.title ?? 'New Notification',
    body:
      localizedPush?.body ??
      data?.body ??
      data?.short_message ??
      'You have a new message',
    data,
    android: {
      channelId: FCM_ATTENDANCE_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_launcher',
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      sound: 'default',
    },
  });

  const shouldPlayVoice =
    (data?.play_voice?.toLowerCase() === 'true' || Boolean(data?.voice_message)) &&
    data &&
    shouldPlayVoiceForNotification(data, prefs);

  if (!shouldPlayVoice) {
    return;
  }

  const localizedVoice = buildLocalizedVoiceMessage(data, language);

  if (localizedVoice) {
    await playVoiceAnnouncement(
      localizedVoice,
      mapNoticationLanguage(language)
    );
  }
};

export const mapNoticationLanguage = (language: string): string => {
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

export async function resolveStoredAppLanguage(): Promise<AppLanguage> {
  const stored = await AsyncStorage.getItem(localStorageKeys.APP_LANGUAGE);
  if (
    stored === 'hi' ||
    stored === 'bn' ||
    stored === 'ta' ||
    stored === 'en'
  ) {
    return stored;
  }
  return 'en';
}
