import { Env } from '../../../config/envConfig';

/**
 * Turn a backend upload path into a URL the Image component can load.
 * Absolute http(s) URLs are returned unchanged.
 */
export function normalizeUploadUrl(path: string | null | undefined): string {
  const raw = (path || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const p = raw.startsWith('/') ? raw : `/${raw}`;
  const base = (Env.apiUrl || '').replace(/\/+$/, '');

  if (p.startsWith('/clients/uploads')) return `${base}${p}`;
  if (p.startsWith('/uploads')) return `${base}/clients${p}`;
  if (/\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(p) && !p.slice(1).includes('/')) {
    return `${base}/clients/uploads/${encodeURIComponent(p.slice(1))}`;
  }
  return `${base}${p}`;
}
