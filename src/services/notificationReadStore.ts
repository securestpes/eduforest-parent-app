import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getNotificationReads, mergeNotificationReads } from './parent';
import { NOTIFICATION_READS_CHANGED_EVENT } from '../constants/notifications';

const STORAGE_KEY = 'eduforest_parent_notification_read_ids_v1';

export async function loadReadNotificationIds(): Promise<Set<string>> {
  try {
    const local = await loadLocalReadIds();
    try {
      const server = await getNotificationReads();
      const merged = new Set([...local, ...server]);
      await saveLocalReadIds(merged);
      return merged;
    } catch {
      return local;
    }
  } catch {
    return new Set();
  }
}

async function loadLocalReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function saveLocalReadIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export async function saveReadNotificationIds(ids: Set<string>): Promise<void> {
  await saveLocalReadIds(ids);
  const toSync = [...ids].filter((id) => id.startsWith('cn-')).slice(0, 500);
  if (toSync.length > 0) {
    try {
      await mergeNotificationReads(toSync);
    } catch {
      /* keep local copy; sync on next attempt */
    }
  }
  DeviceEventEmitter.emit(NOTIFICATION_READS_CHANGED_EVENT);
}

export async function markNotificationRead(id: string, current: Set<string>): Promise<Set<string>> {
  const next = new Set(current);
  next.add(id);
  await saveReadNotificationIds(next);
  return next;
}
