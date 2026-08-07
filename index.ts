import { registerRootComponent } from 'expo';
import { isFirebaseDisabled } from './config/featureFlags';

if (!isFirebaseDisabled) {
  require('./src/common/helpers/firebaseBackgroundNotificationHandler');
} else {
  console.log(
    '[index] Firebase disabled — skipping background message handler'
  );
}

import App from './src/App';

registerRootComponent(App);
