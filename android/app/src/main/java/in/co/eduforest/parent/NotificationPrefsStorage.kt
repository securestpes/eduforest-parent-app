package `in`.co.eduforest.parent

import android.content.Context
import org.json.JSONObject

object NotificationPrefsStorage {
  private const val PREFS = "eduforest_parent_prefs"
  private const val KEY = "notification_preferences"

  private const val DEFAULT_JSON =
    """{"alertPresent":true,"alertLate":true,"alertAbsent":true,"quietHoursEnabled":false,"quietStart":"22:00","quietEnd":"07:00","childIds":[]}"""

  fun set(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY, json)
      .apply()
  }

  fun getJson(context: Context): String {
    return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY, DEFAULT_JSON)
      ?: DEFAULT_JSON
  }

  fun shouldShow(context: Context, statusRaw: String?, studentIdRaw: String?): Boolean {
    return try {
      val obj = JSONObject(getJson(context))
      val studentId = studentIdRaw?.toLongOrNull()
      val childIds = obj.optJSONArray("childIds")
      if (childIds != null && childIds.length() > 0 && studentId != null) {
        var found = false
        for (i in 0 until childIds.length()) {
          if (childIds.optLong(i) == studentId) {
            found = true
            break
          }
        }
        if (!found) return false
      }

      val status = (statusRaw ?: "").lowercase()
      if (status.contains("present") && !obj.optBoolean("alertPresent", true)) return false
      if (status.contains("late") && !obj.optBoolean("alertLate", true)) return false
      if (status.contains("absent") && !obj.optBoolean("alertAbsent", true)) return false
      true
    } catch (_: Exception) {
      true
    }
  }

  fun shouldPlayVoice(context: Context, statusRaw: String?, studentIdRaw: String?): Boolean {
    if (!shouldShow(context, statusRaw, studentIdRaw)) return false
    return try {
      val obj = JSONObject(getJson(context))
      if (!obj.optBoolean("quietHoursEnabled", false)) return true
      val start = parseMinutes(obj.optString("quietStart", "22:00"))
      val end = parseMinutes(obj.optString("quietEnd", "07:00"))
      val now = java.util.Calendar.getInstance()
      val mins = now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE)
      if (start == end) return true
      if (start < end) return !(mins >= start && mins < end)
      !(mins >= start || mins < end)
    } catch (_: Exception) {
      true
    }
  }

  private fun parseMinutes(hhmm: String): Int {
    val parts = hhmm.split(":")
    if (parts.size < 2) return 0
    val h = parts[0].toIntOrNull() ?: 0
    val m = parts[1].toIntOrNull() ?: 0
    return h * 60 + m
  }
}
