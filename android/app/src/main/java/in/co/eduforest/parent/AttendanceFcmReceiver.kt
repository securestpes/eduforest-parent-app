package `in`.co.eduforest.parent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlin.random.Random

class AttendanceFcmReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != "com.google.android.c2dm.intent.RECEIVE") return

    val extras = intent.extras ?: return
    val type = extras.getString("type") ?: ""
    val language = AppLanguageStorage.get(context)
    val englishTitle = extras.getString("title") ?: "Attendance Update"
    val englishBody = extras.getString("short_message") ?: "Attendance updated."
    val title = VoiceMessageBuilder.notificationTitle(language).ifBlank { englishTitle }
    val body = VoiceMessageBuilder.notificationBody(
      languageCode = language,
      statusRaw = extras.getString("status"),
      studentName = extras.getString("studentName") ?: extras.getString("child_name"),
      timestampIso = extras.getString("timestamp"),
      englishFallback = englishBody
    ).ifBlank { englishBody }
    val playVoice = extras.getString("play_voice")?.equals("true", ignoreCase = true) ?: false
    val voiceMessage = extras.getString("voice_message")?.trim().orEmpty()

    if (type != "attendance_marked" && voiceMessage.isBlank()) return

    ensureAttendanceChannel(context)
    val notification = NotificationCompat.Builder(context, "eduforest_attendance")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .build()
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(Random.nextInt(100000, 999999), notification)

    if (playVoice) {
      val legacyText = listOfNotNull(
        voiceMessage,
        extras.getString("short_message"),
        extras.getString("body")
      ).joinToString(" ").trim()

      val serviceIntent = Intent(context, VoiceAnnouncementService::class.java).apply {
        putExtra(VoiceAnnouncementService.EXTRA_MESSAGE, legacyText)
        putExtra(VoiceAnnouncementService.EXTRA_STATUS, extras.getString("status"))
        putExtra(
          VoiceAnnouncementService.EXTRA_STUDENT_NAME,
          extras.getString("studentName") ?: extras.getString("child_name")
        )
        putExtra(VoiceAnnouncementService.EXTRA_PARENT_TITLE, extras.getString("parent_title"))
        putExtra(VoiceAnnouncementService.EXTRA_TIMESTAMP, extras.getString("timestamp"))
      }
      ContextCompat.startForegroundService(context, serviceIntent)
    }
  }

  private fun ensureAttendanceChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      "eduforest_attendance",
      "Attendance & updates",
      NotificationManager.IMPORTANCE_HIGH
    )
    nm.createNotificationChannel(channel)
  }
}
