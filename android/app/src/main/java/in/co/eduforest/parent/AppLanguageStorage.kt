package `in`.co.eduforest.parent

import android.content.Context

object AppLanguageStorage {
  private const val PREFS = "eduforest_parent_prefs"
  private const val KEY = "app_language"

  fun set(context: Context, language: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY, language)
      .apply()
  }

  fun get(context: Context): String {
    return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY, "en")
      ?.trim()
      ?.lowercase()
      .orEmpty()
      .ifBlank { "en" }
  }
}
