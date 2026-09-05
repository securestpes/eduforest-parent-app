import { isFirebaseDisabled } from '../../../config/featureFlags';
import {
  displayNotification,
  resolveStoredAppLanguage,
} from './notificationHelper';
import { handleIncomingPushNotification } from '../../services/pendingPushNotifications';

if (isFirebaseDisabled) {
  console.log('[fcm] Firebase disabled — skipping background message handler');
} else {
  try {
    // Lazy require so web/Expo Go never evaluates getApp() at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler(
      async (remoteMessage: { data?: Record<string, string> }) => {
        console.log('BACKGROUND MESSAGE:', remoteMessage);
        const language = await resolveStoredAppLanguage();
        await displayNotification(remoteMessage, language);
        await handleIncomingPushNotification(remoteMessage.data);
      }
    );
  } catch (e) {
    console.warn('[fcm] background handler not registered', e);
  }
}
