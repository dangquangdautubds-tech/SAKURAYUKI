import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DEMO } from '@/lib/config';
import { LangProvider } from '@/lib/i18n';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { SiteProvider } from '@/lib/site';
import { captureSource } from '@/lib/source';
import { SiteLayout } from '@/components/Layout';
import { Loading } from '@/components/common';
import Home from '@/pages/Home';

const Plans = lazy(() => import('@/pages/Plans'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Booking = lazy(() => import('@/pages/Booking'));
const BookingResult = lazy(() => import('@/pages/BookingResult'));
const DemoCheckout = lazy(() => import('@/pages/DemoCheckout'));
const Lookup = lazy(() => import('@/pages/Lookup'));
const Photoshoot = lazy(() => import('@/pages/Photoshoot'));
const Calculator = lazy(() => import('@/pages/Calculator'));
const Hair = lazy(() => import('@/pages/Hair'));
const Faq = lazy(() => import('@/pages/Faq'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const Blog = lazy(() => import('@/pages/Blog'));
const Post = lazy(() => import('@/pages/Post'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Admin = lazy(() => import('@/admin/AdminApp'));

function Public() {
  return (
    <SiteLayout>
      <Suspense fallback={<Loading className="min-h-[60vh]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/goi-thue" element={<Plans />} />
          <Route path="/bang-gia" element={<Pricing />} />
          <Route path="/dat-lich" element={<Booking />} />
          <Route path="/dat-lich/ket-qua" element={<BookingResult />} />
          <Route path="/thanh-toan-thu" element={<DemoCheckout />} />
          <Route path="/tra-cuu" element={<Lookup />} />
          <Route path="/mau-toc" element={<Hair />} />
          <Route path="/chup-anh" element={<Photoshoot />} />
          <Route path="/tinh-gia" element={<Calculator />} />
          <Route path="/hoi-dap" element={<Faq />} />
          <Route path="/album" element={<Gallery />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Post />} />
          <Route path="/lien-he" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </SiteLayout>
  );
}

function Shell() {
  const loc = useLocation();
  const { dark } = useTheme();
  useEffect(() => { captureSource(); }, []);
  return (
    <>
      {loc.pathname === '/admin' || loc.pathname.startsWith('/admin/')
        ? <Suspense fallback={<Loading className="min-h-screen" />}><Admin /></Suspense>
        : <Public />}
      <Toaster position="top-center" theme={dark ? 'dark' : 'light'} toastOptions={{ className: 'font-sans' }} />
    </>
  );
}

export default function App() {
  const Router = DEMO ? MemoryRouter : BrowserRouter;
  return (
    <ThemeProvider>
      <LangProvider>
        <SiteProvider>
          <Router><Shell /></Router>
        </SiteProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
