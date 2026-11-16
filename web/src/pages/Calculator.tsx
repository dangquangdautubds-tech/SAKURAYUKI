import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Minus, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite, yen } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Empty, NeedSite } from '@/components/common';
import { PageHero, PageTail } from '@/components/PageSections';
import { cn } from '@/lib/utils';

function Counter({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={label + ' −'}><Minus className="h-4 w-4" /></Button>
        <span className="w-6 text-center font-serif text-lg tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={label + ' +'}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={cn('rounded-xl border bg-card p-3 text-left text-sm transition-colors', on ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50')}>
      {children}
    </button>
  );
}

function Inner() {
  const { t, L } = useI18n(); const { site } = useSite();
  const st = site!.settings;
  const products = site!.products;
  const [planId, setPlan] = useState(products[0]?.id || '');
  const [women, setWomen] = useState(1); const [men, setMen] = useState(0); const [kids, setKids] = useState(0);
  const [hair, setHair] = useState(true);
  const [shootId, setShoot] = useState('');
  const [extras, setExtras] = useState<string[]>([]);

  const maxGuests = Number(st.max_guests) || 20;
  const guests = women + men + kids;
  const hairFee = Number(st.price_hair) || 0;
  const fee = Number(st.card_fee_percent) || 0;
  const plan = products.find(p => p.id === planId);
  const shoot = site!.photoshoots.find(s => s.id === shootId);
  const paidExtras = site!.services.filter(s => s.price > 0);

  const rows = useMemo(() => {
    const out: { label: string; note?: string; amount: number }[] = [];
    if (plan) out.push({ label: L(plan.name), note: `${yen(plan.price)} × ${guests}`, amount: plan.price * guests });
    if (hair) out.push({ label: t('calc.hair'), note: hairFee > 0 ? `${yen(hairFee)} × ${guests}` : t('calc.free'), amount: hairFee * guests });
    if (shoot) out.push({ label: L(shoot.name), note: shoot.kind === 'couple' ? t('photo.forTwo') : `${yen(shoot.price)} × ${guests}`, amount: shoot.kind === 'couple' ? shoot.price : shoot.price * guests });
    extras.forEach(id => { const s = paidExtras.find(x => x.id === id); if (s) out.push({ label: L(s.name), note: `${yen(s.price)} × ${guests}`, amount: s.price * guests }); });
    return out;
  }, [plan, shoot, extras, hair, guests, hairFee, paidExtras, L, t]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const deposit = guests * (Number(st.deposit_per_person) || 0);
  if (!products.length) return <div className="container-x section"><Empty /></div>;

  return (
    <div className="container-x section grid gap-10 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-10">
        <section>
          <h2 className="mb-4 text-lg">{t('calc.plan')}</h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('calc.plan')}>
            {products.map(p => (
              <Pick key={p.id} on={planId === p.id} onClick={() => setPlan(p.id)}>
                <span className="block text-xs text-muted-foreground">{p.category}</span>
                <span className="block font-medium leading-snug">{L(p.name)}</span>
                <span className="mt-1 block font-serif text-primary">{yen(p.price)} <span className="font-sans text-xs text-muted-foreground">{t('unit.person')}</span></span>
              </Pick>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg">{t('bk.guests')}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <Counter label={t('bk.women')} value={women} onChange={setWomen} max={maxGuests - men - kids} />
            <Counter label={t('bk.men')} value={men} onChange={setMen} max={maxGuests - women - kids} />
            <Counter label={t('bk.kids')} value={kids} onChange={setKids} max={maxGuests - men - women} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg">{t('calc.hair')}</h2>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} type="button" aria-pressed={hair === v} onClick={() => setHair(v)}
                className={cn('rounded-full border px-5 py-2 text-sm', hair === v ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50')}>
                {v ? (hairFee > 0 ? `${t('bk.hairYes')} · ${yen(hairFee)}` : t('bk.hairYes')) : t('bk.hairNo')}
              </button>
            ))}
          </div>
        </section>

        {site!.photoshoots.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg">{t('calc.shoot')}</h2>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('calc.shoot')}>
              <Pick on={!shootId} onClick={() => setShoot('')}><span className="font-medium">{t('calc.none')}</span></Pick>
              {site!.photoshoots.map(s => (
                <Pick key={s.id} on={shootId === s.id} onClick={() => setShoot(s.id)}>
                  <span className="block text-xs text-muted-foreground">{t('photo.kind.' + s.kind)}{s.duration && ' · ' + s.duration}</span>
                  <span className="block font-medium leading-snug">{L(s.name)}</span>
                  <span className="mt-1 block font-serif text-primary">{yen(s.price)}</span>
                </Pick>
              ))}
            </div>
          </section>
        )}

        {paidExtras.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg">{t('calc.extras')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {paidExtras.map(s => {
                const on = extras.includes(s.id);
                return (
                  <label key={s.id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm transition-colors', on ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50')}>
                    <input type="checkbox" checked={on} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                      onChange={e => setExtras(v => e.target.checked ? [...v, s.id] : v.filter(x => x !== s.id))} />
                    <span><span className="block font-medium leading-snug">{L(s.name)}</span>
                      <span className="mt-0.5 block font-serif text-primary">{yen(s.price)} <span className="font-sans text-xs text-muted-foreground">{t('unit.person')}</span></span></span>
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Bảng tổng tiền, dính theo khi cuộn trên máy tính */}
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-2xl border bg-card">
          <h2 className="border-b px-5 py-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('calc.total')}</h2>
          <dl className="divide-y px-5">
            {rows.map((r, i) => (
              <div key={r.label + i} className="flex items-start justify-between gap-4 py-3 text-sm">
                <dt className="min-w-0"><span className="block">{r.label}</span>
                  {r.note && <span className="block text-xs text-muted-foreground">{r.note}</span>}</dt>
                <dd className="shrink-0 font-medium tabular-nums">{r.amount > 0 ? yen(r.amount) : t('calc.free')}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3 border-t px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t('calc.total')}</span>
              <span className="font-serif text-2xl text-primary tabular-nums">{yen(total)}</span>
            </div>
            {fee > 0 && <p className="text-xs text-muted-foreground">{t('pricing.card')}: {yen(Math.ceil(total * (1 + fee / 100) / 10) * 10)}</p>}
            {deposit > 0 && <p className="text-xs text-muted-foreground">{t('bk.deposit')}: {yen(deposit)}</p>}
            <Button asChild size="lg" className="w-full" disabled={!plan}>
              <Link to={plan ? '/dat-lich?plan=' + encodeURIComponent(plan.id) : '/dat-lich'}>{t('calc.book')}</Link>
            </Button>
            <p className="flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t('calc.note')}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function Calculator() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker="Estimate" title={t('calc.title')} sub={t('calc.sub')}
        secondary={{ to: '/bang-gia', label: t('nav.pricing') }} primary={{ to: '/dat-lich', label: t('cta.book') }} />
      <NeedSite><Inner /></NeedSite>
      <PageTail faqLimit={3} />
    </>
  );
}
