package `in`.co.eduforest.parent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.random.Random

class AttendanceFirebaseMessagingService : FirebaseMessagingService() {

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)

    val data = remoteMessage.data
    val type = (data["type"] ?: "").lowercase()
    val language = AppLanguageStorage.get(this)
    val englishTitle = remoteMessage.notification?.title
      ?: data["title"]
      ?: defaultTitle(type)
    val englishBody = remoteMessage.notification?.body
      ?: data["short_message"]
      ?: data["body"]
      ?: defaultBody(type)

    val isFee = type == "fee_payment" || type == "fee_reminder"
    val isParentAlert = isFee
      || type == "exam_results_published"
      || type == "leave_request_status"
      || type == "homework_assigned"
      || type == "bus_alert"
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
        statusRaw = data["status"],
        studentName = data["studentName"] ?: data["child_name"],
        timestampIso = data["timestamp"],
        englishFallback = englishBody
      ).ifBlank { englishBody }
    }

    val studentId = data["studentId"] ?: data["child_id"]
    val status = data["status"]
    if (!NotificationPrefsStorage.shouldShow(this, status, studentId)) return

    val channelId = when {
      isFee || type == "exam_results_published" || type == "homework_assigned" || type == "leave_request_status" ->
        "school_alerts_v2"
      type == "bus_alert" -> "bus_alerts_v2"
      else -> "eduforest_attendance_v2"
    }
    ensureChannel(
      channelId,
      when (channelId) {
        "school_alerts_v2" -> "School alerts"
        "bus_alerts_v2" -> "Bus alerts"
        else -> "Attendance & updates"
      }
    )
    showNotification(channelId, title, body)

    if (isParentAlert) return

    val playVoice = data["play_voice"]?.equals("true", ignoreCase = true) ?: false
    if (!playVoice) return
    if (!NotificationPrefsStorage.shouldPlayVoice(this, status, studentId)) return

    val legacyText = listOfNotNull(
      data["voice_message"],
      data["short_message"],
      data["body"]
    ).joinToString(" ").trim()

    val serviceIntent = Intent(this, VoiceAnnouncementService::class.java).apply {
      putExtra(VoiceAnnouncementService.EXTRA_MESSAGE, legacyText)
      putExtra(VoiceAnnouncementService.EXTRA_STATUS, data["status"])
      putExtra(
        VoiceAnnouncementService.EXTRA_STUDENT_NAME,
        data["studentName"] ?: data["child_name"]
      )
      putExtra(VoiceAnnouncementService.EXTRA_PARENT_TITLE, data["parent_title"])
      putExtra(VoiceAnnouncementService.EXTRA_TIMESTAMP, data["timestamp"])
    }
    ContextCompat.startForegroundService(this, serviceIntent)
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

  private fun ensureChannel(id: String, name: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
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

  private fun showNotification(channelId: String, title: String, body: String) {
    val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val notification = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setSound(defaultSound)
      .build()

    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(Random.nextInt(100000, 999999), notification)
  }
}
