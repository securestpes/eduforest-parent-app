/**
 * JS stubs for @react-native-firebase/* when EXPO_PUBLIC_DISABLE_FIREBASE=true.
 * Metro aliases packages here so Expo Go never loads native RNFB modules.
 */

const noop = () => {};
const noopUnsub = () => noop;

const authInstance = {
  currentUser: null,
  verifyPhoneNumber() {
    return {
      on(
        _event,
        onNext,
        onError,
        onComplete
      ) {
        const err = new Error(
          'Firebase phone auth is disabled (EXPO_PUBLIC_DISABLE_FIREBASE=true). Use backend SMS OTP.'
        );
        if (typeof onError === 'function') onError(err);
        else if (typeof onNext === 'function') {
          onNext({ state: 'error', error: err });
        }
        if (typeof onComplete === 'function') onComplete({ state: 'error' });
      },
    };
  },
  async signInWithCredential() {},
  async signOut() {},
  onAuthStateChanged() {
    return noopUnsub;
  },
};

function auth() {
  return authInstance;
}
auth.PhoneAuthProvider = {
  credential() {
    return {};
  },
};

const messagingInstance = {
  async requestPermission() {
    return 1;
  },
  async getToken() {
    return '';
  },
  onMessage() {
    return noopUnsub;
  },
  onNotificationOpenedApp() {
    return noopUnsub;
  },
  async getInitialNotification() {
    return null;
  },
  setBackgroundMessageHandler: noop,
};

function messaging() {
  return messagingInstance;
}

function getApp() {
  return { name: '[DISABLED_FIREBASE]' };
}

function getMessaging() {
  return messagingInstance;
}

async function getToken() {
  return '';
}

module.exports = auth;
module.exports.default = auth;
module.exports.auth = auth;
module.exports.messaging = messaging;
module.exports.getApp = getApp;
module.exports.getMessaging = getMessaging;
module.exports.getToken = getToken;
module.exports.firebase = { apps: [] };
