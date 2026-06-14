import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getLocalBadgeCount } from '../services/localNotificationBadge';
import {
  APP_NOTIFICATION_RECEIVED_EVENT,
  NOTIFICATION_BADGE_CHANGED_EVENT,
} from '../constants/notifications';

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await getLocalBadgeCount());
  }, []);

  useEffect(() => {
    void refresh();

    const onPush = DeviceEventEmitter.addListener(APP_NOTIFICATION_RECEIVED_EVENT, () => {
      void refresh();
    });
    const onBadge = DeviceEventEmitter.addListener(NOTIFICATION_BADGE_CHANGED_EVENT, (value: number) => {
      setCount(typeof value === 'number' ? value : 0);
    });

    return () => {
      onPush.remove();
      onBadge.remove();
    };
  }, [refresh]);

  return count;
}
