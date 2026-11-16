import { DEMO } from './config';
import { kimonoArt, sceneArt } from './art';

/** Ảnh trong chế độ xem thử được lưu tạm trên trình duyệt (https://demo.local/...) */
export const DEMO_UPLOAD_KEY = 'sy_demo_uploads';
let uploads: Record<string, string> | null = null;
export function demoUploads(): Record<string, string> {
  if (!uploads) { try { uploads = JSON.parse(localStorage.getItem(DEMO_UPLOAD_KEY) || '{}'); } catch { uploads = {}; } }
  return uploads!;
}
export function saveDemoUpload(id: string, dataUrl: string) {
  const u = demoUploads(); u[id] = dataUrl;
  try { localStorage.setItem(DEMO_UPLOAD_KEY, JSON.stringify(u)); } catch { /* đầy bộ nhớ: chỉ giữ trong phiên */ }
}

export function resolveImg(url: string | undefined | null): string {
  const s = String(url || '');
  if (!s) return '';
  if (s.startsWith('https://demo.local/')) {
    if (!DEMO) return '';
    const [, kind, key] = s.replace('https://demo.local/', '/').split('/');
    if (kind === 'art') return kimonoArt(key);
    if (kind === 'scene') return sceneArt(key);
    if (kind === 'u') return demoUploads()[key] || '';
    return '';
  }
  return s;
}
