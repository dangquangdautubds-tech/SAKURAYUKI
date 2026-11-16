import type { SVGProps } from 'react';
/** Biểu tượng mạng xã hội đơn giản (nét 1.75, cùng phong cách lucide) */
const base = (p: SVGProps<SVGSVGElement>) => ({ width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p });
export const FacebookIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>;
export const InstagramIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></svg>;
export const TikTokIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.4 2.6 2.2 4.4 5 4.6" /></svg>;
export const ThreadsIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M16.5 11.2c-.4-2.6-2.1-3.7-4.3-3.7-2.4 0-4 1.6-4 4.5s1.6 4.8 4.3 4.8c2.3 0 3.8-1.3 3.8-3.1 0-2.2-2.3-2.8-4.4-2.6-1.6.1-2.6 1-2.4 2.1.2 1 1.3 1.5 2.4 1.4 1.9-.2 2.9-1.7 2.9-4" /><path d="M20 12c0 5-3 9-8 9s-8-3.6-8-9 3-9 8-9c3.6 0 6.2 1.8 7.4 5" /></svg>;
export const LineIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3.5c5 0 9 3.2 9 7.2 0 3.9-3.6 7-8.4 7.2L8 21l.6-3.6C5.3 16.4 3 13.8 3 10.7c0-4 4-7.2 9-7.2z" /><path d="M8 9v3.5h1.8M11.5 9v3.5M13.8 12.5V9l2.4 3.5V9" /></svg>;
export const TelegramIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M21 4 3 11l6 2 2 6 3-4 5 4z" /><path d="m9 13 8-6" /></svg>;
export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 20l1.2-3.6A8 8 0 1 1 8 19z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z" /></svg>;
