import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { branchName, useSite, yen, type Product } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { Empty, NeedSite } from '@/components/common';
import { lines, outlineBtn, pairs, PageHero, PageTail, TitleTextList, ValueStrip } from '@/components/PageSections';

const slug = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'nhom';

function Inner() {
  const { t, L, lang } = useI18n(); const { site } = useSite(); const tx = useTx();
  const st = site!.settings;
  const fee = Number(st.card_fee_percent) || 0;
  /** Giá khi trả bằng thẻ / ví điện tử (0% = không hiện) */
  const cardPrice = (n: number) => fee > 0 ? yen(Math.ceil(n * (1 + fee / 100) / 10) * 10) : '';

  const groups = useMemo(() => {
    const byCat = new Map<string, Product[]>();
    site!.products.forEach(p => { if (!byCat.has(p.category)) byCat.set(p.category, []); byCat.get(p.category)!.push(p); });
    const described = site!.cats.filter(c => byCat.has(c.name.vi));
    const rest = [...byCat.keys()].filter(c => !described.some(d => d.name.vi === c));
    return [
      ...described.map(c => ({ key: c.name.vi, title: L(c.name), items: byCat.get(c.name.vi)! })),
      ...rest.map(c => ({ key: c, title: c, items: byCat.get(c)! }))
    ];
  }, [site, L]);

  if (!groups.length) return <div className="container-x section"><Empty /></div>;
  const note = tx('pricing_note', 'pricing.note');
  const policies = pairs(tx('policies_items', 'policies.items'));
  const hairPrice = Number(st.price_hair) || 0;

  /** Một hàng giá: tên bên trái, giá bên phải, giá thẻ ở dưới */
  const PriceRow = ({ name, price, right, small }: { name: React.ReactNode; price: number; right?: React.ReactNode; small?: boolean }) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className={small ? 'text-sm' : 'font-medium'}>{name}</p>
        {right}
      </div>
      <div className="shrink-0 text-right">
        <p className={small ? 'font-serif text-base text-primary' : 'font-serif text-xl text-primary'}>{yen(price)}</p>
        {cardPrice(price) && <p className="text-[0.6875rem] text-muted-foreground">{t('pricing.card')} {cardPrice(price)}</p>}
      </div>
    </div>
  );

  return (
    <>
      <ValueStrip items={lines(tx('include_items', 'pricing.includeItems'))} />

      <section className="container-x section max-w-3xl">
        {note && (
          <p className="mb-8 flex gap-3 rounded-2xl border bg-secondary/50 p-5 text-sm leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{note}
          </p>
        )}

        <div className="space-y-4">
          {groups.map(g => {
            const from = Math.min(...g.items.map(p => p.price));
            return (
              <article key={g.key} className="rounded-2xl border bg-card p-5 md:p-6">
                <PriceRow name={<span className="font-serif text-lg text-rose">{g.title}</span>} price={from}
                  right={<Link to={'/goi-thue#' + slug(g.key)} className="mt-1 inline-block border-b border-rose pb-0.5 text-sm text-primary hover:text-rose">{t('pricing.seeStyles')} →</Link>} />
                {g.items.length > 1 && (
                  <div className="mt-2 divide-y border-t">
                    {g.items.map(p => (
                      <PriceRow key={p.id} small price={p.price}
                        name={<Link to={'/dat-lich?plan=' + encodeURIComponent(p.id)} className="hover:text-primary">{L(p.name)}</Link>}
                        right={p.branches.length > 0 ? <p className="text-xs text-muted-foreground">{t('plans.onlyAt')}: {p.branches.map(id => branchName(site, id, lang)).join(', ')}</p> : undefined} />
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {/* Dịch vụ kèm theo tính phí riêng */}
          {(hairPrice > 0 || site!.services.some(s => s.price > 0)) && (
            <article className="rounded-2xl border bg-card p-5 md:p-6">
              <h2 className="font-serif text-lg text-rose">{t('calc.extras')}</h2>
              <div className="mt-2 divide-y border-t">
                {hairPrice > 0 && <PriceRow small name={t('calc.hair')} price={hairPrice} />}
                {site!.services.filter(s => s.price > 0).map(s => <PriceRow key={s.id} small name={L(s.name)} price={s.price} />)}
              </div>
            </article>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-secondary/50 p-6">
            <h2 className="text-lg text-rose">{t('pricing.browseTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('pricing.browseText')}</p>
            <Button asChild variant="outline" size="sm" className={outlineBtn + ' mt-4'}><Link to="/goi-thue">{t('nav.styles')}</Link></Button>
          </div>
          <div className="rounded-2xl border bg-secondary/50 p-6">
            <h2 className="text-lg text-rose">{t('pricing.photoTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('pricing.photoText')}</p>
            <Button asChild variant="outline" size="sm" className={outlineBtn + ' mt-4'}><Link to="/chup-anh">{t('nav.photo')}</Link></Button>
          </div>
        </div>
      </section>

      {policies.length > 0 && (
        <section className="section bg-secondary/50">
          <div className="container-x max-w-4xl">
            <h2 className="text-2xl text-rose">{tx('policies_title', 'policies.title')}</h2>
            <div className="rule mt-4" />
            <TitleTextList items={policies} columns={2} className="mt-8" />
            {Number(st.deposit_per_person) > 0 && <p className="mt-8 text-sm text-muted-foreground">{t('pricing.n2', { d: yen(st.deposit_per_person) })}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{t('contact.return')}: <span className="font-medium text-foreground">{st.return_by}</span></p>
          </div>
        </section>
      )}
    </>
  );
}

export default function Pricing() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker="Pricing" title={t('pricing.title')} sub={t('pricing.sub')}
        secondary={{ to: '/goi-thue', label: t('nav.styles') }} primary={{ to: '/dat-lich', label: t('cta.book') }} />
      <NeedSite><Inner /></NeedSite>
      <PageTail faqLimit={3} />
    </>
  );
}
