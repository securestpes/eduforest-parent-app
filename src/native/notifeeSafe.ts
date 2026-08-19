/**
 * Lazy-load Notifee after the RN runtime is ready.
 * Top-level `import '@notifee/react-native'` throws
 * "[runtime not ready]: Notifee native module not found" on Expo/RN new arch.
 */
type NotifeeApi = {
  createChannel: (...args: any[]) => Promise<string>;
  displayNotification: (...args: any[]) => Promise<string>;
  onForegroundEvent: (listener: (event: any) => void) => () => void;
  getInitialNotification: () => Promise<any>;
  AndroidImportance: { HIGH: number; DEFAULT: number; [key: string]: number };
  EventType: { PRESS: number; DISMISSED: number; [key: string]: number };
};

let cached: NotifeeApi | null = null;

export function getNotifee(): NotifeeApi {
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@notifee/react-native');
    const api = (mod.default ?? mod) as NotifeeApi;
    cached = Object.assign(api, {
      AndroidImportance: mod.AndroidImportance ?? api.AndroidImportance,
      EventType: mod.EventType ?? api.EventType,
    });
  } catch (e) {
    console.warn('[notifeeSafe] native module unavailable — using stub', e);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stub = require('../shims/notifeeStub');
    const api = (stub.default ?? stub) as NotifeeApi;
    cached = Object.assign(api, {
      AndroidImportance: stub.AndroidImportance,
      EventType: stub.EventType,
    });
  }

  return cached;
}
