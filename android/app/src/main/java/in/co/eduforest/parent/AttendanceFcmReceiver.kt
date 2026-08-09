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
    val typeLower = type.lowercase()
    val isFee = typeLower == "fee_payment" || typeLower == "fee_reminder"
    val language = AppLanguageStorage.get(context)
    val englishTitle = extras.getString("title") ?: if (isFee) "Fee update" else "Attendance Update"
    val englishBody = extras.getString("short_message")
      ?: extras.getString("body")
      ?: if (isFee) "Open Fees to view details." else "Attendance updated."
    val title = if (isFee) {
      englishTitle
    } else {
      VoiceMessageBuilder.notificationTitle(language).ifBlank { englishTitle }
    }
    val body = if (isFee) {
      englishBody
    } else {
      VoiceMessageBuilder.notificationBody(
        languageCode = language,
        statusRaw = extras.getString("status"),
        studentName = extras.getString("studentName") ?: extras.getString("child_name"),
        timestampIso = extras.getString("timestamp"),
        englishFallback = englishBody
      ).ifBlank { englishBody }
    }
    val playVoice = extras.getString("play_voice")?.equals("true", ignoreCase = true) ?: false
    val studentId = extras.getString("studentId") ?: extras.getString("child_id")
    val status = extras.getString("status")
    val voiceMessage = extras.getString("voice_message")?.trim().orEmpty()

    // Keep attendance-only voice gate; allow fee/bus alerts without voice_message.
    if (typeLower != "attendance_marked" && !isFee && typeLower != "bus_alert" && voiceMessage.isBlank()) return
    if (!NotificationPrefsStorage.shouldShow(context, status, studentId)) return

    val channelId = if (isFee) "fee_alerts" else "eduforest_attendance"
    ensureChannel(context, channelId, if (isFee) "Fee alerts" else "Attendance & updates")
    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .build()
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(Random.nextInt(100000, 999999), notification)

    if (isFee || !playVoice) return
    if (!NotificationPrefsStorage.shouldPlayVoice(context, status, studentId)) return
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

  private fun ensureChannel(context: Context, id: String, name: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      id,
      name,
      NotificationManager.IMPORTANCE_HIGH
    )
    nm.createNotificationChannel(channel)
  }
}
