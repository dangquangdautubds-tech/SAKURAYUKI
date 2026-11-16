import { local } from './storage';
/** Ghi nhận khách đến từ đâu (lần đầu ghé trong 30 ngày) để lưu vào đơn hàng */
const MAP: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)yahoo\./, 'Yahoo'], [/facebook\.com$|fb\.com$|fb\.me$/, 'Facebook'],
  [/instagram\.com$/, 'Instagram'], [/tiktok\.com$/, 'TikTok'], [/threads\.(net|com)$/, 'Threads'], [/line\.me$|line\.naver/, 'LINE'],
  [/t\.me$|telegram\./, 'Telegram'], [/youtube\.com$|youtu\.be$/, 'YouTube'], [/zalo\.me$/, 'Zalo'], [/(x|twitter)\.com$|t\.co$/, 'X'],
  [/tripadvisor\./, 'Tripadvisor']
];
export function captureSource() {
  try {
    const saved = local.get<any>('sy_src', null);
    if (saved && Date.now() - saved.at < 30 * 864e5) return;
    const q = new URLSearchParams(location.search);
    let src = q.get('utm_source') || q.get('ref') || '';
    if (!src && q.get('fbclid')) src = 'Facebook';
    if (!src && q.get('gclid')) src = 'Google Ads';
    if (!src && q.get('ttclid')) src = 'TikTok Ads';
    if (!src && document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== location.hostname) src = (MAP.find(([re]) => re.test(host)) || [null, host])[1] as string;
    }
    const camp = q.get('utm_campaign');
    local.set('sy_src', { src: (src || 'Trực tiếp') + (camp ? ' / ' + camp : ''), at: Date.now() });
  } catch { /* bỏ qua */ }
}
export const getSource = () => local.get<any>('sy_src', null)?.src || 'Trực tiếp';
