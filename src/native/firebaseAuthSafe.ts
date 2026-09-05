/**
 * Lazy-load RNFB Auth. A static `import '@react-native-firebase/auth'`
 * evaluates getApp() at module load and crashes Expo Go / web with
 * "No Firebase App '[DEFAULT]' has been created".
 */
import { isFirebaseDisabled } from '../../config/featureFlags';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirebaseAuthNs = any;

let cached: FirebaseAuthNs | null = null;

export function getFirebaseAuth(): FirebaseAuthNs {
  if (cached) {
    return cached;
  }

  if (isFirebaseDisabled) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stub = require('../shims/rnfbStub');
    cached = stub.default ?? stub.auth ?? stub;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/auth');
    cached = mod.default ?? mod;
    return cached;
  } catch (e) {
    console.warn('[firebaseAuth] native module unavailable — using stub', e);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stub = require('../shims/rnfbStub');
    cached = stub.default ?? stub.auth ?? stub;
    return cached;
  }
}
