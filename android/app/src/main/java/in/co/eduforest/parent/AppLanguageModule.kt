package `in`.co.eduforest.parent

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppLanguageModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppLanguageModule"

  @ReactMethod
  fun setAppLanguage(language: String) {
    AppLanguageStorage.set(reactApplicationContext.applicationContext, language)
  }
}
