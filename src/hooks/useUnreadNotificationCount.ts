import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyStudents, getStudentAttendance, type ParentAttendanceRow } from '../services/parent';
import { loadReadNotificationIds } from '../services/notificationReadStore';
import { collectCenterNotifications } from '../utils/notificationCenter';
import {
  computeUnreadNotificationCount,
  clearStalePendingPushNotifications,
} from '../services/pendingPushNotifications';
import {
  APP_NOTIFICATION_RECEIVED_EVENT,
  NOTIFICATION_READS_CHANGED_EVENT,
} from '../constants/notifications';
import { useAppLanguage } from '../../common';

const RETRY_DELAYS_MS = [1500, 4000, 10000];

export function useUnreadNotificationCount(): number {
  const { t } = useAppLanguage();
  const [count, setCount] = useState(0);
  const retryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const refresh = useCallback(async () => {
    try {
      clearStalePendingPushNotifications();
      const [readIds, stRes] = await Promise.all([loadReadNotificationIds(), getMyStudents()]);
      if (!stRes.status || !Array.isArray(stRes.data) || stRes.data.length === 0) {
        setCount(0);
        return;
      }

      const students = stRes.data;
      const rowsMap = new Map<number, ParentAttendanceRow[]>();
      await Promise.all(
        students.map(async (student) => {
          try {
            const attRes = await getStudentAttendance(student.id, 0, 100);
            if (attRes.status && attRes.data?.content) rowsMap.set(student.id, attRes.data.content);
            else rowsMap.set(student.id, []);
          } catch {
            rowsMap.set(student.id, []);
          }
        })
      );

      const items = collectCenterNotifications(students, rowsMap, t);
      setCount(computeUnreadNotificationCount(items, readIds, students));
    } catch {
      setCount(0);
    }
  }, [t]);

  const scheduleRefreshWithRetry = useCallback(() => {
    void refresh();
    retryTimers.current.forEach(clearTimeout);
    retryTimers.current = RETRY_DELAYS_MS.map((ms) => setTimeout(() => void refresh(), ms));
  }, [refresh]);

  useEffect(() => {
    void refresh();
    return () => {
      retryTimers.current.forEach(clearTimeout);
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    const onPush = DeviceEventEmitter.addListener(APP_NOTIFICATION_RECEIVED_EVENT, () => {
      scheduleRefreshWithRetry();
    });
    const onReadsChanged = DeviceEventEmitter.addListener(NOTIFICATION_READS_CHANGED_EVENT, () => {
      void refresh();
    });
    const onAppState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleRefreshWithRetry();
      }
    });

    return () => {
      onPush.remove();
      onReadsChanged.remove();
      onAppState.remove();
      retryTimers.current.forEach(clearTimeout);
    };
  }, [refresh, scheduleRefreshWithRetry]);

  return count;
}
