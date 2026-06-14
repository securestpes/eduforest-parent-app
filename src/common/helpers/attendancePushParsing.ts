import type { AttendancePushStatus } from './attendancePushContext';

/** Pull child name from legacy English API title/body/voice strings when FCM omits studentName. */
export function extractStudentNameFromLegacyPushText(
  ...texts: (string | undefined)[]
): string | null {
  const patterns = [
    /Your child (.+?)'s attendance was updated/i,
    /Your child (.+?)'s attendance/i,
    /,\s*(.+?)\s+was marked present/i,
    /,\s*(.+?)\s+was marked absent/i,
    /,\s*(.+?)\s+(?:is on leave|was marked on leave|marked on leave)/i,
    /,\s*(.+?)\s+arrived late/i,
    /,\s*(.+?)\s+attendance was updated/i,
    /^(.+?)\s+checked in/i,
    /^(.+?)\s+marked absent/i,
    /^(.+?)\s+(?:is on leave|on leave)/i,
    /^(.+?)\s+arrived late/i,
    /^(.+?)\s+attendance updated/i,
  ];

  for (const text of texts) {
    if (!text?.trim()) continue;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const name = match?.[1]?.trim();
      if (name && name.length > 0 && name.length < 80) {
        return name;
      }
    }
  }
  return null;
}

/** Infer present/absent/late/leave from legacy English voice_message when FCM omits status. */
export function inferAttendanceStatusFromLegacyPushText(
  text: string | undefined
): AttendancePushStatus | null {
  if (!text?.trim()) {
    return null;
  }
  const lower = text.toLowerCase();
  if (
    lower.includes('marked present') ||
    lower.includes('checked in') ||
    lower.includes('is present')
  ) {
    return 'present';
  }
  if (lower.includes('marked absent') || lower.includes('is absent')) {
    return 'absent';
  }
  if (lower.includes('arrived late') || lower.includes('is late')) {
    return 'late';
  }
  if (
    lower.includes('on leave') ||
    lower.includes('marked leave') ||
    lower.includes('is leave')
  ) {
    return 'leave';
  }
  return null;
}
