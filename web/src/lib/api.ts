import { API, DEMO } from './config';

let demoMod: Promise<typeof import('../demo/demoBackend')> | null = null;
const demo = () => (demoMod ||= import('../demo/demoBackend'));

export type ApiResult<T = any> = { ok: boolean; error?: string; unauthorized?: boolean } & T;

async function parse(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: 'Máy chủ phản hồi không hợp lệ (' + res.status + ')' }; }
}

export async function apiGet<T = any>(params: Record<string, string>): Promise<ApiResult<T>> {
  if (DEMO) return (await demo()).call('GET', params);
  return parse(await fetch(API + '?' + new URLSearchParams(params)));
}

export async function apiPost<T = any>(body: Record<string, any>, timeoutMs = 45000): Promise<ApiResult<T>> {
  if (DEMO) return (await demo()).call('POST', body);
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return parse(await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }));
  } catch (e: any) {
    return { ok: false, error: e?.name === 'AbortError' ? 'Máy chủ phản hồi quá lâu, vui lòng thử lại' : 'Không kết nối được máy chủ' } as any;
  } finally { clearTimeout(timer); }
}

export async function startCheckout(id: string, email: string, lang: string): Promise<ApiResult<{ url?: string }>> {
  if (DEMO) return { ok: true, url: '#demo-checkout:' + id };
  return parse(await fetch(API + '/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, email, lang }) }));
}

/** Nén ảnh trên trình duyệt trước khi tải lên (JPEG, cạnh dài tối đa `max`) → base64 */
export async function compressImage(file: File, max = 1600, q = 0.85): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh')); i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}
