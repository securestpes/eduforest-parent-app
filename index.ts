import { registerRootComponent } from 'expo';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';

setBackgroundMessageHandler(getMessaging(getApp()), async (remoteMessage) => {
  console.log('Background FCM message:', remoteMessage);
});

registerRootComponent(App);
