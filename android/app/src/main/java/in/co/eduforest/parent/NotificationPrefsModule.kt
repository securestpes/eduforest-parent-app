package `in`.co.eduforest.parent

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationPrefsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NotificationPrefsModule"

  @ReactMethod
  fun setNotificationPreferences(json: String) {
    NotificationPrefsStorage.set(reactApplicationContext.applicationContext, json)
  }
}
