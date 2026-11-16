/** Chế độ xem thử: bật bằng window.__SY_DEMO__ = true (chỉ có trong bản xem trước). Bản thật gọi /api của Cloudflare Worker. */
declare global { interface Window { __SY_DEMO__?: boolean } }
export const DEMO = typeof window !== 'undefined' && window.__SY_DEMO__ === true;
export const API = '/api';
