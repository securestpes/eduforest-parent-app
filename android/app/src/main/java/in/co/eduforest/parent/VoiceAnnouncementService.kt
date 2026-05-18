package `in`.co.eduforest.parent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.NotificationCompat

class VoiceAnnouncementService : Service(), TextToSpeech.OnInitListener {

  companion object {
    const val EXTRA_MESSAGE = "message"
    const val EXTRA_STATUS = "status"
    const val EXTRA_STUDENT_NAME = "student_name"
    const val EXTRA_PARENT_TITLE = "parent_title"
    const val EXTRA_TIMESTAMP = "timestamp"
    const val CHANNEL_ID = "voice_announcements"
    const val NOTIFICATION_ID = 42001
  }

  private var tts: TextToSpeech? = null
  private var pendingMessage: String? = null
  private var ttsLocale: java.util.Locale = java.util.Locale.US

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    tts = TextToSpeech(this, this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val language = AppLanguageStorage.get(this)
    val englishFallback = intent?.getStringExtra(EXTRA_MESSAGE)?.trim().orEmpty()
    val localized = VoiceMessageBuilder.build(
      languageCode = language,
      statusRaw = intent?.getStringExtra(EXTRA_STATUS),
      studentName = intent?.getStringExtra(EXTRA_STUDENT_NAME),
      parentTitle = intent?.getStringExtra(EXTRA_PARENT_TITLE),
      timestampIso = intent?.getStringExtra(EXTRA_TIMESTAMP),
      englishFallback = englishFallback
    )

    if (localized.isBlank()) {
      stopSelf()
      return START_NOT_STICKY
    }

    pendingMessage = localized
    ttsLocale = VoiceMessageBuilder.ttsLocale(language)
    startForeground(NOTIFICATION_ID, buildForegroundNotification(localized))
    speakIfReady()
    return START_NOT_STICKY
  }

  override fun onInit(status: Int) {
    if (status == TextToSpeech.SUCCESS) {
      tts?.language = ttsLocale
      tts?.setSpeechRate(0.82f)
      tts?.setPitch(0.95f)
      speakIfReady()
    } else {
      stopSelf()
    }
  }

  private fun speakIfReady() {
    val engine = tts ?: return
    val message = pendingMessage ?: return
    pendingMessage = null
    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String?) = Unit

      override fun onDone(utteranceId: String?) {
        stopSelf()
      }

      override fun onError(utteranceId: String?) {
        stopSelf()
      }
    })
    val params = Bundle().apply {
      putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
    }
    engine.speak(message, TextToSpeech.QUEUE_FLUSH, params, "attendance_voice")
  }

  private fun buildForegroundNotification(message: String): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Voice announcement")
      .setContentText(message)
      .setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setSilent(true)
      .setOngoing(true)
      .build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Voice announcements",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Foreground service for attendance voice playback"
      setSound(null, null)
      enableVibration(false)
    }
    nm.createNotificationChannel(channel)
  }

  override fun onDestroy() {
    tts?.stop()
    tts?.shutdown()
    tts = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
