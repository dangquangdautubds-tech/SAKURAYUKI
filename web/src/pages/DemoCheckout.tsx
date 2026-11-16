import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { DEMO } from '@/lib/config';
import { apiPost } from '@/lib/api';
import { yen } from '@/lib/site';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';

/** CHỈ CÓ Ở CHẾ ĐỘ XEM THỬ — thay cho trang thanh toán Stripe (bản thật chuyển sang Stripe Checkout) */
export default function DemoCheckout() {
  const [q] = useSearchParams(); const nav = useNavigate();
  const id = q.get('order') || ''; const email = q.get('email') || '';
  const [amount, setAmount] = useState<number | null>(null); const [busy, setBusy] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { apiPost<any>({ action: 'orderStatus', id, email }).then(r => r.ok && setAmount(r.order.deposit)); }, [id, email]);
  if (!DEMO) return <NotFound />;
  const back = `/dat-lich/ket-qua?order=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
  const pay = async () => {
    setBusy('pay'); setErr('');
    const { payDemo } = await import('../demo/demoBackend');
    const r = await payDemo(id);
    if (!r.ok) { setBusy(''); setErr(r.error === 'expired' ? 'Đơn đã quá hạn thanh toán.' : r.error); return; }
    nav(back + '&paid=1', { replace: true });
  };
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-md border bg-card p-6 shadow-soft md:p-8">
        <p className="rounded-sm bg-gold/15 px-3 py-2 text-xs">Trang thanh toán GIẢ LẬP của chế độ xem thử — không trừ tiền thật. Bản chạy thật sẽ chuyển sang Stripe Checkout (thẻ / PayPay).</p>
        <h1 className="mt-6 flex items-center gap-2 font-sans text-lg font-semibold"><CreditCard className="h-5 w-5 text-primary" />Tiền cọc · {id}</h1>
        <p className="mt-4 font-serif text-4xl text-primary">{amount === null ? '…' : yen(amount)}</p>
        <div className="mt-6 space-y-2 rounded-sm border border-dashed p-4 text-sm text-muted-foreground">
          <p>Số thẻ: 4242 4242 4242 4242 (mẫu)</p><p>Hạn: 12/30 · CVC: 123</p>
        </div>
        {err && <p role="alert" className="mt-4 text-sm text-destructive">{err}</p>}
        <Button size="lg" className="mt-6 w-full" onClick={pay} disabled={!!busy || amount === null}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Thanh toán thử</Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => nav(back + '&cancelled=1', { replace: true })} disabled={!!busy}>Huỷ thanh toán</Button>
      </div>
    </div>
  );
}
