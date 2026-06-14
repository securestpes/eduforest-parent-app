import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { NOTIFICATION_BADGE_CHANGED_EVENT } from '../constants/notifications';

const COUNT_KEY = 'parent_notification_badge_count';
const SEEN_IDS_KEY = 'parent_notification_badge_seen_ids';
const MAX_SEEN = 100;
const MAX_BADGE = 99;

function emitChange(count: number): void {
  DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT, count);
}

export async function getLocalBadgeCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COUNT_KEY);
    const n = raw != null ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_BADGE) : 0;
  } catch {
    return 0;
  }
}

async function setLocalBadgeCount(count: number): Promise<number> {
  const value = Math.max(0, Math.min(count, MAX_BADGE));
  await AsyncStorage.setItem(COUNT_KEY, String(value));
  emitChange(value);
  return value;
}

async function getSeenPushIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function rememberSeenPushId(id: string): Promise<void> {
  const seen = await getSeenPushIds();
  if (seen.includes(id)) return;
  const next = [id, ...seen].slice(0, MAX_SEEN);
  await AsyncStorage.setItem(SEEN_IDS_KEY, JSON.stringify(next));
}

/** Increment badge once per unique push id (deduped in AsyncStorage). */
export async function incrementLocalBadgeFromPush(pushId: string): Promise<number> {
  const seen = await getSeenPushIds();
  if (seen.includes(pushId)) {
    return getLocalBadgeCount();
  }
  await rememberSeenPushId(pushId);
  const current = await getLocalBadgeCount();
  return setLocalBadgeCount(current + 1);
}

/** Clears the bell badge when the user opens notifications from Home. */
export async function resetLocalBadgeCount(): Promise<number> {
  return setLocalBadgeCount(0);
}
