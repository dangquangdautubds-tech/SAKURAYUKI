import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Camera, ClipboardList, HandHeart, Layers, Scissors, Sparkles, ExternalLink, FileText, Image, KeyRound, LayoutDashboard, Loader2, LogOut, Menu, MessagesSquare, Settings as SettingsIcon, Shirt, Star, Store, X } from 'lucide-react';
import { DEMO } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/common';
import { Logo, ThemeToggle } from '@/components/Layout';
import { AdminProvider, useAdmin } from './ctx';
import { cn } from '@/lib/utils';

const Dashboard = lazy(() => import('./Dashboard'));
const Orders = lazy(() => import('./Orders'));
const Posts = lazy(() => import('./Posts'));
const Images = lazy(() => import('./Images'));
const Settings = lazy(() => import('./Settings'));
const Products = lazy(() => import('./Collections').then(m => ({ default: m.Products })));
const Branches = lazy(() => import('./Collections').then(m => ({ default: m.Branches })));
const Faqs = lazy(() => import('./Collections').then(m => ({ default: m.Faqs })));
const Hairs = lazy(() => import('./Collections').then(m => ({ default: m.Hairs })));
const Concepts = lazy(() => import('./Collections').then(m => ({ default: m.Concepts })));
const Photoshoots = lazy(() => import('./Collections').then(m => ({ default: m.Photoshoots })));
const Services = lazy(() => import('./Collections').then(m => ({ default: m.Services })));
const Cats = lazy(() => import('./Collections').then(m => ({ default: m.Cats })));
const Reviews = lazy(() => import('./Collections').then(m => ({ default: m.Reviews })));

const MENU: [string, string, any][] = [
  ['/admin', 'Tổng quan', LayoutDashboard], ['/admin/don-hang', 'Đơn hàng', ClipboardList], ['/admin/trang-phuc', 'Trang phục', Shirt], ['/admin/nhom-kimono', 'Nhóm kimono', Layers],
  ['/admin/kieu-toc', 'Kiểu tóc', Scissors], ['/admin/concept', 'Concept', Sparkles], ['/admin/goi-chup', 'Gói chụp ảnh', Camera], ['/admin/dich-vu', 'Dịch vụ kèm', HandHeart],
  ['/admin/chi-nhanh', 'Chi nhánh', Store], ['/admin/blog', 'Blog', FileText], ['/admin/hoi-dap', 'Hỏi đáp', MessagesSquare],
  ['/admin/danh-gia', 'Đánh giá', Star], ['/admin/anh', 'Ảnh & album', Image], ['/admin/cai-dat', 'Cài đặt', SettingsIcon]
];

function Login() {
  const { login } = useAdmin();
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'Quản trị — Sakura Yuki'; }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-secondary/50 p-4">
      <form className="w-full max-w-sm rounded-md border bg-card p-6 shadow-soft md:p-8" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(await login(pw)); setBusy(false); }}>
        <Logo />
        <h1 className="mt-8 flex items-center gap-2 font-sans text-lg font-semibold"><KeyRound className="h-5 w-5 text-primary" />Đăng nhập quản trị</h1>
        {DEMO && <p className="mt-3 rounded-sm bg-gold/15 px-3 py-2 text-xs">Chế độ xem thử — mật khẩu: <b>demo</b></p>}
        <label htmlFor="pw" className="mt-5 block text-sm">Mật khẩu</label>
        <Input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" autoFocus className="mt-1.5" aria-invalid={!!err} />
        {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={busy || !pw}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Đăng nhập</Button>
        <Link to="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-primary">← Về website</Link>
      </form>
    </div>
  );
}

function Shell() {
  const { logout } = useAdmin(); const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useEffect(() => { const m = MENU.find(([p]) => p === loc.pathname); document.title = (m ? m[1] : 'Quản trị') + ' — Quản trị'; }, [loc.pathname]);
  const nav = (
    <nav className="space-y-0.5" aria-label="Quản trị">
      {MENU.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => cn('flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground/80 hover:bg-secondary')}>
          <Icon className="h-4 w-4" />{label}
        </NavLink>
      ))}
    </nav>
  );
  const foot = (
    <div className="space-y-1 border-t pt-3">
      <Link to="/" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"><ExternalLink className="h-4 w-4" />Xem website</Link>
      <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"><LogOut className="h-4 w-4" />Đăng xuất</button>
    </div>
  );
  return (
    <div className="min-h-screen bg-secondary/30 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r bg-background p-4 lg:flex">
        <Logo />{DEMO && <span className="-mt-3 rounded-sm bg-gold/15 px-2 py-1 text-[0.6875rem]">Chế độ xem thử</span>}
        <div className="flex-1 overflow-y-auto">{nav}</div>{foot}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></Button>
        <span className="font-serif">{MENU.find(([p]) => p === loc.pathname)?.[1] || 'Quản trị'}</span>
        <ThemeToggle />
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/50" aria-label="Đóng" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-5 bg-background p-4 shadow-soft">
            <div className="flex items-center justify-between"><Logo /><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng"><X className="h-5 w-5" /></Button></div>
            <div className="flex-1 overflow-y-auto">{nav}</div>{foot}
          </div>
        </div>
      )}
      <main className="min-w-0 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 hidden justify-end lg:flex"><ThemeToggle /></div>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/don-hang" element={<Orders />} />
              <Route path="/admin/trang-phuc" element={<Products />} />
              <Route path="/admin/nhom-kimono" element={<Cats />} />
              <Route path="/admin/chi-nhanh" element={<Branches />} />
              <Route path="/admin/kieu-toc" element={<Hairs />} />
              <Route path="/admin/concept" element={<Concepts />} />
              <Route path="/admin/goi-chup" element={<Photoshoots />} />
              <Route path="/admin/dich-vu" element={<Services />} />
              <Route path="/admin/blog" element={<Posts />} />
              <Route path="/admin/hoi-dap" element={<Faqs />} />
              <Route path="/admin/danh-gia" element={<Reviews />} />
              <Route path="/admin/anh" element={<Images />} />
              <Route path="/admin/cai-dat" element={<Settings />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function Gate() { const { token } = useAdmin(); return token ? <Shell /> : <Login />; }

export default function AdminApp() { return <AdminProvider><Gate /></AdminProvider>; }
