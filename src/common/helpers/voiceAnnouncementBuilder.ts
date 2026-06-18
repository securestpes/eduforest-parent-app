import type { AppLanguage } from '../contexts/parentTranslations';
import type { TranslationKey } from '../contexts/parentTranslations';
import { parsePushTimestamp } from '../../utils/localDateTime';
import { resolveAttendancePushParams } from './attendancePushContext';
import { translateKey } from './translateKey';

export {
  normalizeAttendancePushStatus,
  type AttendancePushStatus,
} from './attendancePushContext';

function resolveGreetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'voice.greeting.morning';
  if (hour < 17) return 'voice.greeting.afternoon';
  return 'voice.greeting.evening';
}

/**
 * Builds a localized voice line from FCM data. API {@code voice_message} stays English;
 * this uses structured fields ({@code status}, {@code studentName}, etc.) for TTS text.
 */
export function buildLocalizedVoiceMessage(
  data: Record<string, string | undefined> | null | undefined,
  language: AppLanguage
): string | null {
  const params = resolveAttendancePushParams(data, language);
  if (!params) {
    return null;
  }

  const timestamp = data?.timestamp?.trim();
  let hour = new Date().getHours();
  if (timestamp) {
    const d = parsePushTimestamp(timestamp);
    if (d) {
      hour = d.getHours();
    }
  }

  const greeting = translateKey(language, resolveGreetingKey(hour));
  const parentTitle =
    (data?.parent_title ?? '').trim() ||
    translateKey(language, 'voice.defaultParentTitle');

  const voiceParams = {
    greeting,
    parentTitle,
    studentName: params.studentName,
    timePart: params.timePart,
  };

  switch (params.status) {
    case 'present':
      return translateKey(language, 'voice.present', voiceParams);
    case 'absent':
      return translateKey(language, 'voice.absent', voiceParams);
    case 'late':
      return translateKey(language, 'voice.late', voiceParams);
    case 'leave':
      return translateKey(language, 'voice.leave', voiceParams);
    default:
      return translateKey(language, 'voice.updated', voiceParams);
  }
}
