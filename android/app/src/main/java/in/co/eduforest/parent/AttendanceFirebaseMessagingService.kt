package `in`.co.eduforest.parent

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.random.Random

class AttendanceFirebaseMessagingService : FirebaseMessagingService() {

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)

    val data = remoteMessage.data
    val language = AppLanguageStorage.get(this)
    val englishTitle = remoteMessage.notification?.title
      ?: data["title"]
      ?: "Attendance Update"
    val englishBody = remoteMessage.notification?.body
      ?: data["short_message"]
      ?: "Attendance updated."
    val title = VoiceMessageBuilder.notificationTitle(language).ifBlank { englishTitle }
    val body = VoiceMessageBuilder.notificationBody(
      languageCode = language,
      statusRaw = data["status"],
      studentName = data["studentName"] ?: data["child_name"],
      timestampIso = data["timestamp"],
      englishFallback = englishBody
    ).ifBlank { englishBody }

    showNotification(title, body)

    val playVoice = data["play_voice"]?.equals("true", ignoreCase = true) ?: false
    if (!playVoice) return

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

  private fun showNotification(title: String, body: String) {
    val notification = NotificationCompat.Builder(this, "eduforest_attendance")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .build()

    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(Random.nextInt(100000, 999999), notification)
  }
}
