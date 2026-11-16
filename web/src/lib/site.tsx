import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet } from './api';
import { session } from './storage';
import { useTheme, type ThemeMode } from './theme';

export type L3 = { vi: string; en: string };
export type Card = { id: string; name: L3; tag: L3; desc: L3; price: number; image: string; images: string[]; video: string };
/** Gói chụp ảnh có thêm thời lượng, số ảnh và loại nhóm */
export type Shoot = Card & { duration: string; photos: string; kind: 'solo' | 'couple' | 'group' };
export type Branch = { id: string; name: L3; address: string; addressNote: string; phone: string; hours: string; mapLink: string; mapEmbed: string; slotStart: string; slotEnd: string; slotMinutes: number; capacity: number; closedDates: string[] };
export type Product = { id: string; category: string; price: number; image: string; images: string[]; video: string; status: string; name: L3; desc: L3; branches: string[] };
export type Post = { id: string; slug: string; title: string; summary: string; cover: string; lang: string; date: string; updated: string; content?: string };
export type Faq = { id: string; q: L3; a: L3; group: L3 };
export type Review = { id: string; name: string; lang: string; stars: number; text: string };
export type Settings = Record<string, any>;
export type Site = {
  settings: Settings; branches: Branch[]; products: Product[]; faqs: Faq[]; reviews: Review[]; posts: Post[];
  hairs: Card[]; concepts: Card[]; photoshoots: Shoot[]; services: Card[]; cats: Card[]; images: Record<string, string>;
};

type Ctx = { site: Site | null; error: string; loading: boolean; reload: () => void };
const SiteContext = createContext<Ctx>(null as any);
const KEY = 'sy_site_v3';

export function SiteProvider({ children }: { children: ReactNode }) {
  const cached = session.get<Site | null>(KEY, null);
  const [site, setSite] = useState<Site | null>(cached);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cached);
  const { applyDefault } = useTheme();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await apiGet<{ site: Site }>({ action: 'site' });
      if (!r.ok) throw new Error(r.error || 'error');
      setSite(r.site); session.set(KEY, r.site);
    } catch (e: any) { setError(String(e?.message || e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (site) applyDefault((site.settings.theme_default || 'light') as ThemeMode, site.settings.theme_toggle !== false); }, [site, applyDefault]);
  useEffect(() => {
    const on = () => load();
    window.addEventListener('sy:site-changed', on);
    return () => window.removeEventListener('sy:site-changed', on);
  }, [load]);
  return <SiteContext.Provider value={{ site, error, loading, reload: load }}>{children}</SiteContext.Provider>;
}
export const useSite = () => useContext(SiteContext);

export const yen = (n: number) => '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP');
export const branchName = (site: Site | null, id: string, lang: string) => {
  const b = site?.branches.find(x => x.id === id); return b ? ((b.name as any)[lang] || b.name.vi) : id;
};
/** Cho trang khác báo "dữ liệu website đã đổi" (dùng sau khi quản trị lưu) */
export const notifySiteChanged = () => { session.del(KEY); window.dispatchEvent(new Event('sy:site-changed')); };
