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
    val title = remoteMessage.notification?.title
      ?: data["title"]
      ?: "Attendance Update"
    val body = remoteMessage.notification?.body
      ?: data["short_message"]
      ?: "Attendance updated."

    showNotification(title, body)

    val playVoice = data["play_voice"]?.equals("true", ignoreCase = true) ?: false
    val voiceMessage = data["voice_message"]?.trim().orEmpty()
    if (!playVoice || voiceMessage.isBlank()) return

    val serviceIntent = Intent(this, VoiceAnnouncementService::class.java).apply {
      putExtra(VoiceAnnouncementService.EXTRA_MESSAGE, voiceMessage)
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
