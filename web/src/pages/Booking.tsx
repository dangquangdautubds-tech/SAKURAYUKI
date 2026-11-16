import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, Loader2, Minus, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite, yen } from '@/lib/site';
import { apiGet, apiPost, startCheckout } from '@/lib/api';
import { getSource } from '@/lib/source';
import { session } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Img } from '@/components/Img';
import { ErrorState, Loading, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';

type Slot = { time: string; left: number | null; available: boolean };
const tokyoDate = (offset = 0) => new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

function Step({ n, title, children, id }: { n: number; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-b py-8 first:pt-0 last:border-0">
      <h2 className="mb-5 flex items-center gap-3 text-lg"><span className="grid h-7 w-7 place-items-center rounded-full border border-gold/60 font-serif text-sm text-primary">{n}</span>{title}</h2>
      {children}
    </section>
  );
}

function Counter({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-sm border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={label + ' −'}><Minus className="h-4 w-4" /></Button>
        <span className="w-6 text-center font-serif text-lg tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={label + ' +'}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function Booking() {
  const { t, L, lang } = useI18n(); const { site, loading, reload } = useSite();
  const [params] = useSearchParams(); const nav = useNavigate();
  const draft = session.get<any>('sy_bk_draft', {});
  const [branchId, setBranch] = useState<string>(params.get('branch') || draft.branchId || '');
  const [productId, setProduct] = useState<string>(params.get('plan') || draft.productId || '');
  const [date, setDate] = useState<string>(draft.date && draft.date >= tokyoDate() ? draft.date : tokyoDate(1));
  const [time, setTime] = useState('');
  const [men, setMen] = useState<number>(draft.men ?? 0); const [women, setWomen] = useState<number>(draft.women ?? 1); const [kids, setKids] = useState<number>(draft.kids ?? 0);
  const [hair, setHair] = useState<boolean>(draft.hair ?? true);
  const [name, setName] = useState(draft.name || ''); const [email, setEmail] = useState(draft.email || ''); const [phone, setPhone] = useState(draft.phone || '');
  const [socialType, setSocialType] = useState<'LINE' | 'Telegram'>(draft.socialType || 'LINE'); const [socialId, setSocialId] = useState(draft.socialId || '');
  const [note, setNote] = useState(draft.note || ''); const [agree, setAgree] = useState(false); const [hp, setHp] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null); const [closed, setClosed] = useState(false); const [slotErr, setSlotErr] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(''); const [formErr, setFormErr] = useState('');
  const reqId = useRef(0);

  const st = site?.settings || {};
  const branch = site?.branches.find(b => b.id === branchId);
  const products = useMemo(() => (site?.products || []).filter(p => !branchId || !p.branches.length || p.branches.includes(branchId)), [site, branchId]);
  const product = site?.products.find(p => p.id === productId);
  const guests = men + women + kids;
  const maxGuests = Number(st.max_guests) || 20;
  const deposit = guests * (Number(st.deposit_per_person) || 0);
  const needPay = !!st.payment_online && deposit > 0;

  // một chi nhánh duy nhất → tự chọn; gói chỉ có ở 1 chi nhánh → tự chọn chi nhánh đó
  useEffect(() => {
    if (!site) return;
    if (!branchId && site.branches.length === 1) setBranch(site.branches[0].id);
    if (!branchId && product?.branches.length === 1) setBranch(product.branches[0]);
    if (branchId && !site.branches.some(b => b.id === branchId)) setBranch('');
  }, [site, branchId, product]);
  useEffect(() => { if (productId && site && !products.some(p => p.id === productId)) setProduct(''); }, [products, productId, site]);

  useEffect(() => {
    session.set('sy_bk_draft', { branchId, productId, date, men, women, kids, hair, name, email, phone, socialType, socialId, note });
  }, [branchId, productId, date, men, women, kids, hair, name, email, phone, socialType, socialId, note]);

  const loadSlots = () => {
    if (!branchId || !date) { setSlots(null); return; }
    const id = ++reqId.current; setSlots(null); setSlotErr(''); setClosed(false);
    apiGet<{ slots: Slot[]; closed: boolean }>({ action: 'availability', branch: branchId, date }).then(r => {
      if (id !== reqId.current) return;
      if (!r.ok) { setSlotErr(r.error || t('state.error')); setSlots([]); return; }
      setClosed(r.closed); setSlots(r.slots);
      setTime(cur => r.slots.some(s => s.time === cur && s.available && (s.left === null || s.left >= Math.max(1, guests))) ? cur : '');
    }).catch(() => { if (id === reqId.current) { setSlotErr(t('state.error')); setSlots([]); } });
  };
  useEffect(loadSlots, [branchId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => tokyoDate(i)), []);
  const fmtDay = (d: string) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd)); const loc = lang === 'vi' ? 'vi-VN' : 'en-GB'; return { wd: x.toLocaleDateString(loc, { weekday: 'short', timeZone: 'UTC' }), d: dd, m: x.toLocaleDateString(loc, { month: 'short', timeZone: 'UTC' }) }; };

  if (!site) return loading ? <Loading className="min-h-[60vh]" /> : <ErrorState onRetry={reload} />;
  if (st.booking_enabled === false) {
    return (<><PageHeader kicker="Booking" title={t('bk.closedTitle')} /><div className="container-x section max-w-2xl pt-10"><p className="whitespace-pre-line text-muted-foreground">{st.booking_closed_message}</p><Button asChild className="mt-6"><Link to="/lien-he">{t('nav.contact')}</Link></Button></div></>);
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!branchId) e.branch = t('bk.err.branch');
    if (!productId) e.product = t('bk.err.product');
    if (!date || !time) e.time = t('bk.err.time');
    if (guests < 1) e.guests = t('bk.err.guests');
    if (!name.trim() || !email.trim() || phone.replace(/\D/g, '').length < 6) e.contact = t('bk.err.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.contact = t('bk.err.email');
    if (!agree) e.agree = t('bk.err.agree');
    setErrors(e);
    const first = ['branch', 'product', 'time', 'guests', 'contact', 'agree'].find(k => e[k]);
    if (first) document.getElementById('bk-' + first)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return !first;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setFormErr('');
    if (busy || !validate()) return;
    setBusy('send');
    const r = await apiPost<any>({
      action: 'createOrder', branchId, productId, date, time, men, women, kids, hair, name: name.trim(), email: email.trim(), phone: phone.trim(),
      socialType, socialId: socialId.trim(), note: note.trim(), lang, source: getSource(), website: hp
    });
    if (!r.ok) { setBusy(''); setFormErr(r.error || t('bk.err.net')); if (/chỗ|giờ/i.test(r.error || '')) loadSlots(); return; }
    session.set('sy_last_order', { order: r.order, email: email.trim(), notify: r.notify });
    session.del('sy_bk_draft');
    const back = `/dat-lich/ket-qua?order=${encodeURIComponent(r.orderId)}&email=${encodeURIComponent(email.trim())}`;
    if (r.needsPayment) {
      setBusy('pay');
      const c = await startCheckout(r.orderId, email.trim(), lang);
      if (c.ok && c.url) {
        if (c.url.startsWith('#demo-checkout:')) { nav(`/thanh-toan-thu?order=${encodeURIComponent(r.orderId)}&email=${encodeURIComponent(email.trim())}`); return; }
        location.href = c.url; return;
      }
      nav(back + '&payfail=1'); return;
    }
    nav(back);
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-3 text-sm text-destructive">{errors[k]}</p>;

  return (
    <>
      <PageHeader kicker="Booking" title={t('bk.title')} sub={t('bk.sub')}>
        <p className="mt-4 text-sm text-muted-foreground">{t('bk.have')} <Link to="/tra-cuu" className="font-medium text-primary hover:underline">{t('bk.haveLink')}</Link></p>
      </PageHeader>
      <form onSubmit={submit} noValidate className="container-x grid gap-10 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <input type="text" name="website" value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <Step n={1} title={t('bk.s1')} id="bk-branch">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('bk.s1')}>
              {site.branches.map(b => (
                <button key={b.id} type="button" role="radio" aria-checked={branchId === b.id} onClick={() => setBranch(b.id)}
                  className={cn('relative flex flex-col rounded-md border bg-card p-4 text-left transition-colors', branchId === b.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50')}>
                  {branchId === b.id && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                  <span className="font-serif text-lg">{L(b.name)}</span>
                  <span className="mt-1 text-sm text-muted-foreground">{b.address}</span>
                  {b.hours && <span className="mt-1 text-xs text-muted-foreground">{b.hours}</span>}
                </button>
              ))}
            </div>
            {err('branch')}
          </Step>

          <Step n={2} title={t('bk.s2')} id="bk-product">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('bk.s2')}>
              {products.map(p => (
                <button key={p.id} type="button" role="radio" aria-checked={productId === p.id} onClick={() => setProduct(p.id)}
                  className={cn('flex items-center gap-3 rounded-md border bg-card p-2.5 text-left transition-colors', productId === p.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50')}>
                  <Img src={p.image} fallbackKey={p.id + p.category} alt="" className="h-20 w-16 shrink-0 rounded-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{p.category}</span>
                    <span className="block font-medium leading-snug">{L(p.name)}</span>
                    <span className="mt-1 block font-serif text-primary">{yen(p.price)} <span className="font-sans text-xs text-muted-foreground">{t('unit.person')}</span></span>
                  </span>
                  {productId === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
            {err('product')}
          </Step>

          <Step n={3} title={t('bk.s3')} id="bk-time">
            {!branchId ? <p className="text-sm text-muted-foreground">{t('bk.pickBranch')}</p> : (
              <>
                <div className="flex items-end gap-3">
                  <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label={t('bk.date')}>
                    {days.map(d => { const f = fmtDay(d); const off = branch?.closedDates.includes(d); return (
                      <button key={d} type="button" role="radio" aria-checked={date === d} onClick={() => setDate(d)}
                        className={cn('flex w-14 shrink-0 flex-col items-center rounded-sm border py-2 text-xs transition-colors', date === d ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50', off && date !== d && 'opacity-40')}>
                        <span>{f.wd}</span><span className="font-serif text-lg leading-tight">{f.d}</span><span className="opacity-80">{f.m}</span>
                      </button>
                    ); })}
                  </div>
                  <label className="relative mb-2 shrink-0">
                    <span className="sr-only">{t('bk.date')}</span>
                    <span className="pointer-events-none flex h-[4.6rem] w-14 flex-col items-center justify-center rounded-sm border bg-card text-xs text-muted-foreground"><CalendarDays className="mb-1 h-5 w-5" />…</span>
                    <input type="date" value={date} min={tokyoDate()} max={tokyoDate(180)} onChange={e => e.target.value && setDate(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </div>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">{t('bk.date')}: <span className="font-medium text-foreground">{(() => { const f = fmtDay(date); return `${f.wd} ${f.d} ${f.m}`; })()}</span></p>
                <p className="mb-2 text-sm font-medium">{t('bk.time')}</p>
                {slots === null ? <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('bk.loadingSlots')}</p>
                  : slotErr ? <p className="text-sm text-destructive">{slotErr}</p>
                  : closed ? <p className="rounded-sm bg-secondary px-4 py-3 text-sm">{t('bk.closed')}</p>
                  : !slots.some(s => s.available) ? <p className="rounded-sm bg-secondary px-4 py-3 text-sm">{t('bk.noSlots')}</p>
                  : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={t('bk.time')}>
                      {slots.map(s => { const fits = s.available && (s.left === null || s.left >= Math.max(1, guests)); return (
                        <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={!fits} onClick={() => setTime(s.time)}
                          className={cn('flex flex-col items-center rounded-sm border py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40', time === s.time ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50')}>
                          <span className="font-medium tabular-nums">{s.time}</span>
                          <span className="text-[0.6875rem] opacity-80">{!s.available ? (s.left === 0 ? t('bk.full') : '—') : s.left === null ? '' : t('bk.left', { n: s.left })}</span>
                        </button>
                      ); })}
                    </div>
                  )}
              </>
            )}
            {err('time')}
          </Step>

          <Step n={4} title={t('bk.s4')} id="bk-guests">
            <div className="grid gap-2 sm:grid-cols-3">
              <Counter label={t('bk.women')} value={women} onChange={setWomen} max={maxGuests - men - kids} />
              <Counter label={t('bk.men')} value={men} onChange={setMen} max={maxGuests - women - kids} />
              <Counter label={t('bk.kids')} value={kids} onChange={setKids} max={maxGuests - men - women} />
            </div>
            {err('guests')}
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium">{t('bk.hair')}</legend>
              <div className="flex gap-2">{[true, false].map(v => (
                <button key={String(v)} type="button" aria-pressed={hair === v} onClick={() => setHair(v)} className={cn('rounded-sm border px-4 py-2 text-sm', hair === v ? 'border-primary bg-accent text-accent-foreground' : 'bg-card')}>{v ? t('bk.hairYes') : t('bk.hairNo')}</button>
              ))}</div>
            </fieldset>
          </Step>

          <Step n={5} title={t('bk.s5')} id="bk-contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="bk-name">{t('bk.name')} *</Label><Input id="bk-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={80} /></div>
              <div className="space-y-2"><Label htmlFor="bk-email">{t('bk.email')} *</Label><Input id="bk-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" maxLength={120} /></div>
              <div className="space-y-2"><Label htmlFor="bk-phone">{t('bk.phone')} *</Label><Input id="bk-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} /></div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bk-social">{t('bk.social')} <span className="font-normal text-muted-foreground">({t('bk.optional')})</span></Label>
                <div className="flex gap-2">
                  <div className="inline-flex shrink-0 rounded-sm border bg-card p-0.5">{(['LINE', 'Telegram'] as const).map(s => <button key={s} type="button" aria-pressed={socialType === s} onClick={() => setSocialType(s)} className={cn('rounded-[1px] px-3 text-sm', socialType === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{s}</button>)}</div>
                  <Input id="bk-social" value={socialId} onChange={e => setSocialId(e.target.value)} placeholder={socialType === 'LINE' ? 'LINE ID' : '@username'} maxLength={60} />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="bk-note">{t('bk.note')} <span className="font-normal text-muted-foreground">({t('bk.optional')})</span></Label><Textarea id="bk-note" value={note} onChange={e => setNote(e.target.value)} placeholder={t('bk.notePh')} maxLength={500} rows={3} /></div>
            </div>
            {err('contact')}
          </Step>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-md border bg-card">
            <h2 className="border-b px-5 py-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('bk.summary')}</h2>
            <dl className="space-y-2 px-5 py-4 text-sm">
              {([[t('c.branch'), branch ? L(branch.name) : '—'], [t('c.package'), product ? L(product.name) : '—'], [t('c.datetime'), time ? `${date} · ${time}` : '—'], [t('bk.guests'), String(guests)]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
              {product && <div className="flex justify-between gap-4 border-t pt-3"><dt className="text-muted-foreground">{t('bk.estimate')}</dt><dd className="font-medium">{yen(product.price * guests)}</dd></div>}
              {deposit > 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('bk.deposit')}</dt><dd className="font-serif text-lg text-primary">{yen(deposit)}</dd></div>}
            </dl>
            <div className="space-y-4 border-t px-5 py-4" id="bk-agree">
              {deposit > 0 && <p className="text-xs text-muted-foreground">{needPay ? t('bk.payOnline') : t('bk.payLater')}</p>}
              <label className="flex cursor-pointer gap-3 text-sm">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                <span>{t('bk.agree', { r: st.return_by || '17:30' })}</span>
              </label>
              {err('agree')}
              {formErr && <p role="alert" className="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{formErr}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{busy === 'pay' ? t('pay.redirect') : t('bk.sending')}</> : needPay ? t('bk.submitPay') : t('bk.submit')}
              </Button>
              <div className="rounded-sm bg-secondary/70 p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">{t('bk.policyT')}</p><p className="mt-1">{t('bk.policy')}</p></div>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
