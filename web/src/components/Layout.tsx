import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Mail, Menu, MessageCircle, Moon, Phone, Sun, X } from 'lucide-react';
import { LANGS, useI18n, type Lang } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { useTheme } from '@/lib/theme';
import { local } from '@/lib/storage';
import { DEMO } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FacebookIcon, InstagramIcon, LineIcon, TelegramIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon } from './icons';

export const NAV: [string, string][] = [
  ['/', 'nav.home'], ['/goi-thue', 'nav.styles'], ['/bang-gia', 'nav.pricing'], ['/chup-anh', 'nav.photo'], ['/hoi-dap', 'nav.faq'], ['/lien-he', 'nav.access']
];
const MORE: [string, string][] = [['/mau-toc', 'nav.hair'], ['/tinh-gia', 'nav.calc'], ['/album', 'nav.gallery'], ['/blog', 'nav.blog'], ['/tra-cuu', 'nav.lookup']];
const LABEL: Record<Lang, string> = { vi: 'VI', en: 'EN' };

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const { site } = useSite();
  const name = site?.settings.shop_name || 'Sakura Yuki Kimono Rental';
  const [first, second, ...rest] = name.split(' ');
  return (
    <Link to="/" className={cn('block leading-tight', className)} aria-label={name}>
      <span className={cn('block font-serif text-[1.05rem]', light ? 'text-white' : 'text-foreground')}>{first} {second || ''}</span>
      <span className={cn('block text-[0.625rem] uppercase tracking-[0.28em]', light ? 'text-white/75' : 'text-muted-foreground')}>{rest.join(' ') || 'Kimono Rental'} · Tokyo</span>
    </Link>
  );
}

export function LangSwitch({ className, light }: { className?: string; light?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn('inline-flex items-center gap-1 text-xs', className)} role="group" aria-label="Language">
      {LANGS.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          {i > 0 && <span className={light ? 'text-white/40' : 'text-border'}>|</span>}
          <button type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
            className={cn('rounded-full px-2 py-1 font-medium transition-colors', lang === l ? (light ? 'bg-white/20 text-white' : 'bg-accent text-accent-foreground') : (light ? 'text-white/75 hover:text-white' : 'text-muted-foreground hover:text-foreground'))}>{LABEL[l]}</button>
        </span>
      ))}
    </div>
  );
}

export function ThemeToggle({ light }: { light?: boolean }) {
  const { dark, toggle, allowToggle } = useTheme();
  const { t } = useI18n();
  if (!allowToggle) return null;
  return (
    <Button variant="ghost" size="icon" className={light ? 'text-white hover:bg-white/15 hover:text-white' : ''} onClick={toggle} aria-label={dark ? t('theme.light') : t('theme.dark')} title={dark ? t('theme.light') : t('theme.dark')}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
}

/** Dòng thông báo đầu trang — khách tắt được, nhớ lựa chọn theo nội dung thông báo */
function Announcement() {
  const { site } = useSite(); const { lang, t } = useI18n();
  const st = site?.settings;
  const text = st?.announcement_enabled ? (st['announcement_' + lang] || st.announcement_vi) : '';
  // khoá nhớ gắn với nội dung: đổi thông báo thì hiện lại cho người đã tắt
  const key = 'sy_notice_' + (text ? String(text).length + '_' + String(text).slice(0, 12) : '');
  const [closed, setClosed] = useState<boolean>(() => !!text && local.get(key, false));
  if (!text || closed) return null;
  const inner = <span className="inline-flex items-center gap-1.5">{text}{st!.announcement_link && <ChevronRight className="h-3.5 w-3.5" />}</span>;
  return (
    <div className="relative bg-primary px-10 py-2 text-center text-xs text-primary-foreground md:text-sm">
      {st!.announcement_link ? <a href={st!.announcement_link} className="hover:underline">{inner}</a> : inner}
      <button type="button" aria-label={t('notice.close')} onClick={() => { local.set(key, true); setClosed(true); }}
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full transition-colors hover:bg-white/15">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(true);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  // Menu trượt là hộp thoại: đóng được bằng phím Esc
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open]);
  useEffect(() => { const on = () => setTop(window.scrollY < 40); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  // Trang chủ: menu trong suốt nằm trên ảnh bìa, cuộn xuống thì thành nền trắng
  const light = loc.pathname === '/' && top && !open;
  return (
    <header className={cn('top-0 z-40 w-full transition-colors duration-300', 'sticky', loc.pathname === '/' && '-mb-16 md:-mb-[4.5rem]', light ? 'bg-gradient-to-b from-black/55 to-transparent' : 'border-b bg-background/95 backdrop-blur')}>
      <div className="container-x flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <Logo light={light} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map(([to, k]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('border-b px-3 py-2 font-serif text-[0.9375rem] transition-colors', light ? 'text-white hover:text-white/80' : 'hover:text-primary', isActive ? (light ? 'border-white/80' : 'border-primary text-primary') : 'border-transparent')}>{t(k)}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LangSwitch light={light} className="hidden sm:inline-flex" />
          <ThemeToggle light={light} />
          <Link to="/dat-lich" className={cn('inline-flex h-10 items-center rounded-full border px-5 text-sm tracking-[0.02em] transition-colors', light ? 'border-white/70 bg-white/10 text-white hover:bg-white/20' : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}>{t('cta.book')}</Link>
          <Button variant="ghost" size="icon" className={cn('lg:hidden', light && 'text-white hover:bg-white/15 hover:text-white')} onClick={() => setOpen(true)} aria-label={t('menu')} aria-expanded={open}><Menu className="h-5 w-5" /></Button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-background shadow-soft animate-in slide-in-from-right">
            <div className="flex h-16 items-center justify-between border-b px-4"><Logo /><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></Button></div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {[...NAV, ...MORE].map(([to, k]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('flex items-center justify-between rounded-sm px-3 py-3 font-serif text-base', isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary')}>{t(k)}<ChevronRight className="h-4 w-4 opacity-40" /></NavLink>
              ))}
            </nav>
            <div className="space-y-3 border-t p-4">
              <LangSwitch className="w-full justify-center" />
              <Button asChild className="w-full"><Link to="/dat-lich">{t('cta.book')}</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SocialLinks({ className }: { className?: string }) {
  const { site } = useSite();
  const st = site?.settings || {};
  const items: [string, string, ReactNode][] = [
    [st.facebook, 'Facebook', <FacebookIcon />], [st.instagram, 'Instagram', <InstagramIcon />], [st.tiktok, 'TikTok', <TikTokIcon />], [st.threads, 'Threads', <ThreadsIcon />]
  ];
  const list = items.filter(([u]) => u);
  if (!list.length) return null;
  return <div className={cn('flex gap-2', className)}>{list.map(([u, n, ic]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer" aria-label={n} title={n} className="grid h-9 w-9 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary">{ic}</a>)}</div>;
}

export function chatLinks(st: Record<string, any>) {
  const out: { key: string; label: string; href: string; icon: ReactNode }[] = [];
  if (st.line_url || st.line_id) out.push({ key: 'line', label: 'LINE' + (st.line_id ? ' ' + st.line_id : ''), href: st.line_url || 'https://line.me/R/ti/p/' + encodeURIComponent(st.line_id), icon: <LineIcon /> });
  if (st.telegram_url || st.telegram_user) out.push({ key: 'tg', label: 'Telegram' + (st.telegram_user ? ' @' + String(st.telegram_user).replace(/^@/, '') : ''), href: st.telegram_url || 'https://t.me/' + String(st.telegram_user).replace(/^@/, ''), icon: <TelegramIcon /> });
  if (st.shop_whatsapp) out.push({ key: 'wa', label: 'WhatsApp', href: 'https://wa.me/' + String(st.shop_whatsapp).replace(/\D/g, ''), icon: <WhatsAppIcon /> });
  return out;
}

function Footer() {
  const { t, L, lang } = useI18n(); const { site } = useSite();
  const st = site?.settings || {};
  const H = ({ children }: { children: ReactNode }) => <h3 className="mb-4 font-serif text-base text-rose">{children}</h3>;
  const links = (arr: [string, string][]) => <ul className="space-y-2.5 text-sm">{arr.map(([to, k]) => <li key={to}><Link to={to} className="hover:text-primary">{t(k)}</Link></li>)}</ul>;
  return (
    <footer className="mt-auto bg-secondary/70">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{st['shop_tagline_' + lang] || t('f.desc')}</p>
          <ul className="space-y-3 text-sm text-muted-foreground">{(site?.branches || []).map(b => (
            <li key={b.id}><span className="font-medium text-foreground">{L(b.name)}</span><br />{b.address}{b.hours && <><br />{b.hours}</>}</li>
          ))}</ul>
        </div>
        <div><H>{t('f.explore')}</H>{links([...NAV.slice(1), ['/dat-lich', 'nav.booking']])}</div>
        <div><H>{t('f.experience')}</H>{links(MORE)}</div>
        <div>
          <H>{t('f.contact')}</H>
          <ul className="space-y-2.5 text-sm">
            {chatLinks(st).map(c => <li key={c.key}><a href={c.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary">{c.icon}{c.label}</a></li>)}
            {st.shop_phone && <li><a href={'tel:' + String(st.shop_phone).replace(/[^\d+]/g, '')} className="inline-flex items-center gap-2 hover:text-primary"><Phone className="h-4 w-4" />{st.shop_phone}</a></li>}
            {st.shop_email && <li><a href={'mailto:' + st.shop_email} className="inline-flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4" />{st.shop_email}</a></li>}
          </ul>
          <SocialLinks className="mt-5" />
        </div>
      </div>
      <div className="border-t"><div className="container-x flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} {st.shop_name || 'Sakura Yuki Kimono Rental'}</span>
        <LangSwitch />
      </div></div>
    </footer>
  );
}

/** Nút chat nổi góc phải dưới */
function FloatingChat() {
  const { t } = useI18n(); const { site } = useSite();
  const [open, setOpen] = useState(false);
  const links = chatLinks(site?.settings || {});
  if (!links.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {open && <div className="grid gap-2 rounded-2xl border bg-card p-2 shadow-soft">{links.map(c => <a key={c.key} href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm hover:bg-secondary">{c.icon}{c.label}</a>)}</div>}
      <div className="flex items-center gap-2">
        {!open && <span className="hidden rounded-full border bg-card px-3 py-1.5 text-xs shadow-soft sm:block">{t('chat.with')}</span>}
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={t('chat.with')} className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105">{open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}</button>
      </div>
    </div>
  );
}

function DemoBar() {
  const { t } = useI18n();
  if (!DEMO) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/40 bg-gold/15 px-4 py-1.5 text-center text-xs">
      <span>{t('demo.bar')}</span>
      <Link to="/admin" className="font-medium text-primary underline underline-offset-2">{t('demo.admin')}</Link>
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const loc = useLocation(); const { t } = useI18n();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">{t('skip')}</a>
      <DemoBar />
      <Announcement />
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <FloatingChat />
    </div>
  );
}

