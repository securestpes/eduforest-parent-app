import messaging from '@react-native-firebase/messaging';
import {
  displayNotification,
  resolveStoredAppLanguage,
} from './notificationHelper';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('BACKGROUND MESSAGE:', remoteMessage);
  const language = await resolveStoredAppLanguage();
  await displayNotification(remoteMessage, language);
});
