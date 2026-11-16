import { useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Empty, PageHeader } from '@/components/common';
import { OrderCard, type CustomerOrder } from '@/components/OrderCard';

export default function Lookup() {
  const { t } = useI18n();
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const v = q.trim();
    if (!v || (!v.includes('@') && v.replace(/\D/g, '').length < 8)) { setErr(t('lk.need')); return; }
    setBusy(true);
    const r = await apiPost<{ orders: CustomerOrder[] }>({ action: 'lookup', q: v });
    setBusy(false);
    if (!r.ok) { setErr(r.error || t('state.error')); setOrders(null); return; }
    setOrders(r.orders);
  };
  return (
    <>
      <PageHeader kicker="Booking" title={t('lk.title')} sub={t('lk.sub')} />
      <div className="container-x section max-w-2xl pt-10 md:pt-12">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1 space-y-2"><Label htmlFor="lk">{t('lk.label')}</Label><Input id="lk" value={q} onChange={e => setQ(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={!!err} aria-describedby={err ? 'lk-err' : undefined} /></div>
          <Button type="submit" disabled={busy} className="sm:w-36"><Search className="h-4 w-4" />{busy ? t('state.loading') : t('lk.btn')}</Button>
        </form>
        {err && <p id="lk-err" role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        {orders && (
          <div className="mt-10 space-y-4" aria-live="polite">
            {orders.length ? <><p className="text-sm text-muted-foreground">{t('lk.count', { n: orders.length })}</p>{orders.map(o => <OrderCard key={o.id} o={o} />)}<p className="pt-2 text-sm text-muted-foreground">{t('lk.help')}</p></> : <Empty>{t('lk.none')}</Empty>}
          </div>
        )}
      </div>
    </>
  );
}
