import type { AppLanguage } from '../contexts/parentTranslations';
import type { TranslationKey } from '../contexts/parentTranslations';
import { resolveAttendancePushParams } from './attendancePushContext';
import { translateKey } from './translateKey';

function bodyKeyForStatus(
  status: string
): TranslationKey {
  switch (status) {
    case 'present':
      return 'push.body.present';
    case 'absent':
      return 'push.body.absent';
    case 'late':
      return 'push.body.late';
    case 'leave':
      return 'push.body.leave';
    default:
      return 'push.body.updated';
  }
}

/**
 * Localized notification title/body from FCM data (API title/short_message may stay English).
 */
export function buildLocalizedNotificationContent(
  data: Record<string, string | undefined> | null | undefined,
  language: AppLanguage
): { title: string; body: string } | null {
  const params = resolveAttendancePushParams(data, language);
  if (!params) {
    return null;
  }

  const title = translateKey(language, 'push.title.attendance');
  const body = translateKey(language, bodyKeyForStatus(params.status), {
    studentName: params.studentName,
    timePart: params.timePart,
  });

  return { title, body };
}
