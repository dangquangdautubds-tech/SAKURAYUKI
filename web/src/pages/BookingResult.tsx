import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, Hourglass, Loader2, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { apiPost, startCheckout } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { chatLinks } from '@/components/Layout';
import { ErrorState, Loading, useTitle } from '@/components/common';
import { OrderCard, type CustomerOrder } from '@/components/OrderCard';

export default function BookingResult() {
  const { t, lang } = useI18n(); const { site } = useSite(); const nav = useNavigate();
  const [q] = useSearchParams();
  const id = q.get('order') || ''; const email = q.get('email') || '';
  const paidFlag = q.get('paid') === '1'; const cancelled = q.get('cancelled') === '1'; const payfail = q.get('payfail') === '1';
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [waiting, setWaiting] = useState(false); const [paying, setPaying] = useState(false); const [payErr, setPayErr] = useState('');
  const tries = useRef(0);
  useTitle(t('res.title'));

  const load = async () => {
    const r = await apiPost<{ order: CustomerOrder }>({ action: 'orderStatus', id, email });
    if (!r.ok) { setState(r.error === 'not_found' ? 'missing' : 'error'); return; }
    setOrder(r.order); setState('ok');
    // Stripe báo về qua webhook có thể chậm vài giây → chờ thêm
    if (paidFlag && r.order.status === 'Chờ thanh toán' && tries.current < 15) { tries.current++; setWaiting(true); setTimeout(load, 2500); }
    else setWaiting(false);
  };
  useEffect(() => { if (id && email) load(); else setState('missing'); }, [id, email]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    setPaying(true); setPayErr('');
    const c = await startCheckout(id, email, lang);
    if (c.ok && c.url) {
      if (c.url.startsWith('#demo-checkout:')) { nav(`/thanh-toan-thu?order=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`); return; }
      location.href = c.url; return;
    }
    setPaying(false); setPayErr(c.error === 'expired' ? t('pay.expired') : (c.error || t('pay.failed')));
  };

  if (state === 'loading') return <Loading className="min-h-[60vh]" />;
  if (state === 'missing') return <div className="container-x section max-w-xl"><h1 className="text-2xl">{t('res.notFound')}</h1><Button asChild className="mt-6"><Link to="/tra-cuu">{t('ok.lookup')}</Link></Button></div>;
  if (state === 'error' || !order) return <ErrorState onRetry={load} />;

  const paid = order.status === 'Đã nhận cọc';
  const unpaid = order.status === 'Chờ thanh toán';
  const dead = order.status === 'Đã huỷ';
  const chats = chatLinks(site?.settings || {});
  const head = dead ? { Icon: TriangleAlert, cls: 'text-destructive', title: t('pay.expired') }
    : unpaid && !waiting ? { Icon: Hourglass, cls: 'text-warning', title: t('st.Chờ thanh toán') }
    : { Icon: CircleCheck, cls: 'text-success', title: t('ok.title') };

  return (
    <div className="container-x section max-w-2xl pt-12">
      <head.Icon className={'h-10 w-10 ' + head.cls} strokeWidth={1.5} />
      <h1 className="mt-4 text-3xl">{head.title}</h1>
      <div className="mt-3 space-y-2 text-muted-foreground" aria-live="polite">
        {waiting && <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('pay.waiting')}</p>}
        {paid && <p className="text-success">{t('ok.paid')}</p>}
        {order.status === 'Chờ xác nhận' && <p>{t('ok.text')}</p>}
        {unpaid && !waiting && <p>{cancelled ? t('pay.cancelled') : payfail ? t('pay.failed') : t('bk.payOnline')}</p>}
        {!dead && !unpaid && <p className="text-sm">{t('ok.email', { e: email })}</p>}
      </div>
      {unpaid && !waiting && (
        <div className="mt-6">
          <Button size="lg" onClick={pay} disabled={paying}>{paying ? <><Loader2 className="h-4 w-4 animate-spin" />{t('pay.redirect')}</> : t('pay.retry')}</Button>
          {payErr && <p role="alert" className="mt-3 text-sm text-destructive">{payErr}</p>}
        </div>
      )}
      <div className="mt-8"><OrderCard o={order} /></div>
      <div className="mt-8 flex flex-wrap gap-3">
        {dead && <Button asChild><Link to="/dat-lich">{t('cta.book')}</Link></Button>}
        {chats.map(c => <Button key={c.key} asChild variant="outline"><a href={c.href} target="_blank" rel="noopener noreferrer">{c.icon}{c.label.split(' ')[0]}</a></Button>)}
        <Button asChild variant="ghost"><Link to="/">{t('nf.back')}</Link></Button>
      </div>
    </div>
  );
}
