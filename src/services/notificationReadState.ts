import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_OPENED_KEY = 'parent_notifications_last_opened_at';

/** Epoch ms of last time the parent opened the Notifications screen. */
export async function getNotificationsLastOpenedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_OPENED_KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Call when leaving Notifications so the next visit can treat newer items as unread. */
export async function markNotificationsOpenedNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPENED_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function isNotificationUnread(
  at: Date,
  lastOpenedAt: number | null
): boolean {
  // First visit: don't flag the whole archive as unread.
  if (lastOpenedAt == null) return false;
  return at.getTime() > lastOpenedAt;
}
