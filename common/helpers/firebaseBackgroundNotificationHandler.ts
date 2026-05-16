import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from 'common/constants';
import {
  displayNotification,
  mapNoticationLanguage,
} from './notificationHelper';

const getStoredLanguage = async (): Promise<string> => {
  const storedLanguage = await AsyncStorage.getItem(
    localStorageKeys.APP_LANGUAGE
  );

  if (storedLanguage === null) {
    return 'en-US';
  }
  return mapNoticationLanguage(storedLanguage);
};

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('BACKGROUND MESSAGE:', remoteMessage);
  const language = await getStoredLanguage();
  await displayNotification(remoteMessage, language);
});
