/**
 * Stub for @notifee/react-native when Firebase/native push is disabled (Expo Go).
 */

const AndroidImportance = { HIGH: 4, DEFAULT: 3 };
const EventType = { PRESS: 1, DISMISSED: 0 };

const notifee = {
  async createChannel() {
    return 'stub';
  },
  async displayNotification() {
    return 'stub';
  },
  onForegroundEvent() {
    return () => {};
  },
  async getInitialNotification() {
    return null;
  },
};

module.exports = notifee;
module.exports.default = notifee;
module.exports.AndroidImportance = AndroidImportance;
module.exports.EventType = EventType;
