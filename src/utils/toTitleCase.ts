/**
 * Title-cases words separated by whitespace.
 * "mid term exam" → "Mid Term Exam"
 */
export function toTitleCase(value?: string | null): string {
  if (value == null || !String(value).trim()) {
    return '';
  }
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
