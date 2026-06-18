import { NativeModules, Platform } from 'react-native';
import type { NotificationPreferences } from '../../services/notificationPreferences';

type NotificationPrefsModuleType = {
  setNotificationPreferences: (json: string) => void;
};

const nativeModule = NativeModules.NotificationPrefsModule as
  | NotificationPrefsModuleType
  | undefined;

/** Mirrors AsyncStorage notification prefs for Android FCM / voice handlers. */
export function syncNativeNotificationPrefs(prefs: NotificationPreferences): void {
  if (Platform.OS !== 'android') return;
  try {
    nativeModule?.setNotificationPreferences?.(JSON.stringify(prefs));
  } catch {
    /* optional until native rebuild */
  }
}
