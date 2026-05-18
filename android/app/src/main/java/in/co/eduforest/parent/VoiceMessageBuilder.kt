package `in`.co.eduforest.parent

import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.regex.Pattern

object VoiceMessageBuilder {

  private val voiceTimeFormatter =
    DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH)

  fun build(
    languageCode: String,
    statusRaw: String?,
    studentName: String?,
    parentTitle: String?,
    timestampIso: String?,
    englishFallback: String?
  ): String {
    val lang = languageCode.ifBlank { "en" }
    val fallback = englishFallback?.trim().orEmpty()
    var status = normalizeStatus(statusRaw)
    if (status == "updated") {
      inferStatusFromLegacy(fallback)?.let { status = it }
    }

    var student = studentName?.trim().orEmpty()
    if (student.isBlank()) {
      extractStudentFromLegacy(fallback)?.let { student = it }
    }
    student = student.ifBlank { defaultStudent(lang) }

    val parent = parentTitle?.trim().orEmpty().ifBlank { defaultParent(lang) }
    val refTime = resolveReferenceTime(timestampIso)
    val greeting = greeting(lang, refTime.hour)
    val timePart = formatTimePart(lang, timestampIso)

    return when (status) {
      "present" -> present(lang, greeting, parent, student, timePart)
      "absent" -> absent(lang, greeting, parent, student)
      "late" -> late(lang, greeting, parent, student, timePart)
      "leave" -> leave(lang, greeting, parent, student, timePart)
      else -> updated(lang, greeting, parent, student, timePart)
    }
  }

  fun notificationTitle(languageCode: String): String {
    return when (languageCode.lowercase(Locale.ENGLISH)) {
      "hi" -> "उपस्थिति अपडेट"
      "bn" -> "উপস্থিতি আপডেট"
      "ta" -> "வருகை புதுப்பிப்பு"
      else -> "Attendance update"
    }
  }

  fun notificationBody(
    languageCode: String,
    statusRaw: String?,
    studentName: String?,
    timestampIso: String?,
    englishFallback: String?
  ): String {
    val lang = languageCode.ifBlank { "en" }
    val fallback = englishFallback?.trim().orEmpty()
    var status = normalizeStatus(statusRaw)
    if (status == "updated") {
      inferStatusFromLegacy(fallback)?.let { status = it }
    }

    var student = studentName?.trim().orEmpty()
    if (student.isBlank()) {
      extractStudentFromLegacy(fallback)?.let { student = it }
    }
    student = student.ifBlank { defaultStudent(lang) }

    val timePart = formatTimePart(lang, timestampIso)

    val body = when (status) {
      "present" -> when (lang) {
        "hi" -> "$student ने उपस्थिति दर्ज की$timePart"
        "bn" -> "$student উপস্থিতি দিয়েছেন$timePart"
        "ta" -> "$student வருகை பதிவு செய்தார்$timePart"
        else -> "$student checked in$timePart"
      }
      "absent" -> when (lang) {
        "hi" -> "$student अनुपस्थित हैं"
        "bn" -> "$student অনুপস্থিত"
        "ta" -> "$student வரவில்லை"
        else -> "$student marked absent"
      }
      "late" -> when (lang) {
        "hi" -> "$student देर से पहुँचे$timePart"
        "bn" -> "$student দেরিতে এসেছেন$timePart"
        "ta" -> "$student தாமதமாக வந்தார்$timePart"
        else -> "$student arrived late$timePart"
      }
      "leave" -> when (lang) {
        "hi" -> "$student अवकाश पर हैं$timePart"
        "bn" -> "$student ছুটিতে আছেন$timePart"
        "ta" -> "$student விடுப்பில் உள்ளார்$timePart"
        else -> "$student is on leave$timePart"
      }
      else -> when (lang) {
        "hi" -> "$student की उपस्थिति अपडेट हुई$timePart"
        "bn" -> "$student-এর উপস্থিতি আপডেট হয়েছে$timePart"
        "ta" -> "$student வருகை புதுப்பிக்கப்பட்டது$timePart"
        else -> "$student attendance updated$timePart"
      }
    }

    return body.ifBlank { fallback }
  }

  fun ttsLocale(languageCode: String): Locale {
    return when (languageCode.lowercase(Locale.ENGLISH)) {
      "hi" -> Locale.forLanguageTag("hi-IN")
      "bn" -> Locale.forLanguageTag("bn-IN")
      "ta" -> Locale.forLanguageTag("ta-IN")
      else -> Locale.US
    }
  }

  private fun normalizeStatus(raw: String?): String {
    val value = raw?.trim()?.lowercase(Locale.ENGLISH)?.replace('_', ' ') ?: ""
    return when (value) {
      "present", "p" -> "present"
      "absent", "a" -> "absent"
      "late", "l" -> "late"
      "leave", "on leave" -> "leave"
      else -> "updated"
    }
  }

  private fun inferStatusFromLegacy(text: String): String? {
    if (text.isBlank()) return null
    val lower = text.lowercase(Locale.ENGLISH)
    return when {
      lower.contains("marked present") ||
        lower.contains("checked in") ||
        lower.contains("is present") -> "present"
      lower.contains("marked absent") || lower.contains("is absent") -> "absent"
      lower.contains("arrived late") || lower.contains("is late") -> "late"
      lower.contains("on leave") ||
        lower.contains("marked leave") ||
        lower.contains("is leave") -> "leave"
      else -> null
    }
  }

  private fun extractStudentFromLegacy(text: String): String? {
    if (text.isBlank()) return null
    val patterns = listOf(
      Pattern.compile("Your child (.+?)'s attendance was updated", Pattern.CASE_INSENSITIVE),
      Pattern.compile("Your child (.+?)'s attendance", Pattern.CASE_INSENSITIVE),
      Pattern.compile(",\\s*(.+?)\\s+was marked present", Pattern.CASE_INSENSITIVE),
      Pattern.compile(",\\s*(.+?)\\s+was marked absent", Pattern.CASE_INSENSITIVE),
      Pattern.compile(",\\s*(.+?)\\s+(?:is on leave|was marked on leave|marked on leave)", Pattern.CASE_INSENSITIVE),
      Pattern.compile(",\\s*(.+?)\\s+arrived late", Pattern.CASE_INSENSITIVE),
      Pattern.compile(",\\s*(.+?)\\s+attendance was updated", Pattern.CASE_INSENSITIVE),
      Pattern.compile("^(.+?)\\s+checked in", Pattern.CASE_INSENSITIVE),
      Pattern.compile("^(.+?)\\s+marked absent", Pattern.CASE_INSENSITIVE),
      Pattern.compile("^(.+?)\\s+(?:is on leave|on leave)", Pattern.CASE_INSENSITIVE),
      Pattern.compile("^(.+?)\\s+arrived late", Pattern.CASE_INSENSITIVE),
      Pattern.compile("^(.+?)\\s+attendance updated", Pattern.CASE_INSENSITIVE),
    )
    for (pattern in patterns) {
      val matcher = pattern.matcher(text)
      if (matcher.find()) {
        val name = matcher.group(1)?.trim().orEmpty()
        if (name.isNotEmpty() && name.length < 80) {
          return name
        }
      }
    }
    return null
  }

  private fun resolveReferenceTime(timestampIso: String?): LocalTime {
    if (!timestampIso.isNullOrBlank()) {
      try {
        return LocalDateTime.parse(timestampIso).toLocalTime()
      } catch (_: Exception) {
        try {
          return java.time.OffsetDateTime.parse(timestampIso).toLocalTime()
        } catch (_: Exception) {
          /* fall through */
        }
      }
    }
    return LocalTime.now()
  }

  private fun formatTimePart(language: String, timestampIso: String?): String {
    if (timestampIso.isNullOrBlank()) return ""
    return try {
      val time = try {
        LocalDateTime.parse(timestampIso).format(voiceTimeFormatter)
      } catch (_: Exception) {
        java.time.OffsetDateTime.parse(timestampIso).format(voiceTimeFormatter)
      }
      when (language) {
        "hi" -> " $time बजे"
        "bn" -> " $time-এ"
        "ta" -> " $time மணிக்கு"
        else -> " at $time"
      }
    } catch (_: Exception) {
      ""
    }
  }

  private fun greeting(language: String, hour: Int): String {
    val key = when {
      hour < 12 -> "morning"
      hour < 17 -> "afternoon"
      else -> "evening"
    }
    return when (language) {
      "hi" -> when (key) {
        "morning" -> "सुप्रभात"
        "afternoon" -> "नमस्कार"
        else -> "शुभ संध्या"
      }
      "bn" -> when (key) {
        "morning" -> "সুপ্রভাত"
        "afternoon" -> "নমস্কার"
        else -> "শুভ সন্ধ্যা"
      }
      "ta" -> when (key) {
        "morning" -> "காலை வணக்கம்"
        "afternoon" -> "மதிய வணக்கம்"
        else -> "மாலை வணக்கம்"
      }
      else -> when (key) {
        "morning" -> "Good morning"
        "afternoon" -> "Good afternoon"
        else -> "Good evening"
      }
    }
  }

  private fun defaultParent(language: String) = when (language) {
    "hi" -> "अभिभावक"
    "bn" -> "অভিভাবক"
    "ta" -> "பாதுகாவலர்"
    else -> "Parent"
  }

  private fun defaultStudent(language: String) = when (language) {
    "hi" -> "आपके बच्चे"
    "bn" -> "আপনার সন্তান"
    "ta" -> "உங்கள் குழந்தை"
    else -> "your child"
  }

  private fun present(lang: String, greeting: String, parent: String, student: String, timePart: String) =
    when (lang) {
      "hi" -> "$greeting $parent, $student की उपस्थिति दर्ज की गई$timePart"
      "bn" -> "$greeting $parent, $student উপস্থিত হিসেবে চিহ্নিত হয়েছে$timePart"
      "ta" -> "$greeting $parent, $student வருகை பதிவு செய்யப்பட்டது$timePart"
      else -> "$greeting $parent, $student was marked present$timePart"
    }

  private fun absent(lang: String, greeting: String, parent: String, student: String) =
    when (lang) {
      "hi" -> "$greeting $parent, $student को अनुपस्थित दर्ज किया गया"
      "bn" -> "$greeting $parent, $student অনুপস্থিত চিহ্নিত হয়েছে"
      "ta" -> "$greeting $parent, $student வரவில்லை என பதிவு செய்யப்பட்டது"
      else -> "$greeting $parent, $student was marked absent"
    }

  private fun late(lang: String, greeting: String, parent: String, student: String, timePart: String) =
    when (lang) {
      "hi" -> "$greeting $parent, $student देर से पहुँचे$timePart। कृपया ऐप में विवरण देखें।"
      "bn" -> "$greeting $parent, $student দেরিতে এসেছেন$timePart। বিস্তারিত দেখতে অ্যাপ খুলুন।"
      "ta" -> "$greeting $parent, $student தாமதமாக வந்துள்ளார்$timePart। விவரங்களுக்கு செயலியைப் பார்க்கவும்."
      else -> "$greeting $parent, $student arrived late$timePart. Please check the app for details."
    }

  private fun leave(lang: String, greeting: String, parent: String, student: String, timePart: String) =
    when (lang) {
      "hi" -> "$greeting $parent, $student अवकाश पर हैं$timePart"
      "bn" -> "$greeting $parent, $student ছুটিতে আছেন$timePart"
      "ta" -> "$greeting $parent, $student விடுப்பில் உள்ளார்$timePart"
      else -> "$greeting $parent, $student is on leave$timePart"
    }

  private fun updated(lang: String, greeting: String, parent: String, student: String, timePart: String) =
    when (lang) {
      "hi" -> "$greeting $parent, $student की उपस्थिति अपडेट की गई$timePart"
      "bn" -> "$greeting $parent, $student-এর উপস্থিতি আপডেট হয়েছে$timePart"
      "ta" -> "$greeting $parent, $student வருகை புதுப்பிக்கப்பட்டது$timePart"
      else -> "$greeting $parent, $student attendance was updated$timePart"
    }
}
