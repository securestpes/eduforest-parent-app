package `in`.co.eduforest.parent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlin.random.Random

/**
 * Legacy FCM broadcast path. Tray sound for all types; TTS voice only for attendance.
 */
class AttendanceFcmReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != "com.google.android.c2dm.intent.RECEIVE") return

    val extras = intent.extras ?: return
    val type = (extras.getString("type") ?: "").lowercase()
    val isFee = type == "fee_payment" || type == "fee_reminder"
    val isParentAlert = isFee
      || type == "exam_results_published"
      || type == "leave_request_status"
      || type == "homework_assigned"
      || type == "bus_alert"
    val language = AppLanguageStorage.get(context)
    val englishTitle = extras.getString("title") ?: defaultTitle(type)
    val englishBody = extras.getString("short_message")
      ?: extras.getString("body")
      ?: defaultBody(type)
    val title = if (isParentAlert) {
      englishTitle
    } else {
      VoiceMessageBuilder.notificationTitle(language).ifBlank { englishTitle }
    }
    val body = if (isParentAlert) {
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

    // Show tray for attendance + school alerts. Do not require voice_message for alerts.
    val isAttendance = type == "attendance_marked" || type.isBlank()
    if (!isAttendance && !isParentAlert && voiceMessage.isBlank()) return
    if (!NotificationPrefsStorage.shouldShow(context, status, studentId)) return

    val channelId = when {
      isFee || type == "exam_results_published" || type == "homework_assigned" || type == "leave_request_status" ->
        "school_alerts_v2"
      type == "bus_alert" -> "bus_alerts_v2"
      else -> "eduforest_attendance_v2"
    }
    ensureChannel(
      context,
      channelId,
      when (channelId) {
        "school_alerts_v2" -> "School alerts"
        "bus_alerts_v2" -> "Bus alerts"
        else -> "Attendance & updates"
      }
    )
    val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setSound(defaultSound)
      .build()
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(Random.nextInt(100000, 999999), notification)

    // Voice (TTS) is attendance-only.
    if (isParentAlert || !playVoice) return
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

  private fun defaultTitle(type: String): String {
    return when (type) {
      "fee_payment" -> "Fee received"
      "fee_reminder" -> "Fee reminder"
      "bus_alert" -> "Bus update"
      "homework_assigned" -> "New homework"
      "exam_results_published" -> "Exam results"
      "leave_request_status" -> "Leave update"
      else -> "Attendance Update"
    }
  }

  private fun defaultBody(type: String): String {
    return when (type) {
      "fee_payment", "fee_reminder" -> "Open Fees to view details."
      "bus_alert" -> "Open the app to track the bus."
      "homework_assigned" -> "Open Homework to view details."
      "exam_results_published" -> "Open Results to view marks."
      "leave_request_status" -> "Open Leave to view status."
      else -> "Attendance updated."
    }
  }

  private fun ensureChannel(context: Context, id: String, name: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
      description = "EduForest parent alerts"
      enableVibration(true)
      enableLights(true)
      setSound(
        soundUri,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
    }
    nm.createNotificationChannel(channel)
  }
}
