import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useSite, yen, type Product } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductDialog } from '@/components/ProductCard';
import { Img } from '@/components/Img';
import { Empty, NeedSite } from '@/components/common';
import { IntroBlock, JumpLinks, outlineBtn, PageHero, PageTail, TitleTextList, pairs } from '@/components/PageSections';

/** Bỏ dấu + gạch nối để làm id neo cho link nhảy mục */
const slug = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'nhom';

function Inner() {
  const { t, L } = useI18n(); const { site } = useSite(); const tx = useTx();
  const [open, setOpen] = useState<Product | null>(null);
  const products = site!.products;

  /* Ghép nhóm có mô tả (NHOM_KIMONO) với nhóm thật sự có trang phục */
  const groups = useMemo(() => {
    const byCat = new Map<string, Product[]>();
    products.forEach(p => { if (!byCat.has(p.category)) byCat.set(p.category, []); byCat.get(p.category)!.push(p); });
    const described = site!.cats.filter(c => byCat.has(c.name.vi));
    const rest = [...byCat.keys()].filter(c => !described.some(d => d.name.vi === c));
    return [
      ...described.map(c => ({ key: c.name.vi, title: L(c.name), tag: L(c.tag), desc: L(c.desc), extra: c.images.slice(1), items: byCat.get(c.name.vi)! })),
      ...rest.map(c => ({ key: c, title: c, tag: '', desc: '', extra: [] as string[], items: byCat.get(c)! }))
    ];
  }, [products, site, L]);

  const chooseItems = pairs(tx('choose_items', 'choose.items'));
  if (!groups.length) return <div className="container-x section"><Empty /></div>;

  return (
    <>
      <IntroBlock text={tx('plans_intro', 'plans.intro')} links={[['/bang-gia', t('nav.pricing')], ['/chup-anh', t('nav.photo')], ['/mau-toc', t('nav.hair')]]} />
      <JumpLinks label={t('plans.browse')} items={groups.map(g => ({ id: slug(g.key), label: g.title }))} />

      {groups.map((g, gi) => {
        const from = Math.min(...g.items.map(p => p.price));
        return (
          <section key={g.key} id={slug(g.key)} className={'scroll-mt-20 py-12 md:py-16 ' + (gi % 2 ? 'bg-secondary/50' : '')}>
            <div className="container-x">
              <div className="max-w-3xl">
                {g.tag && <p className="kicker mb-2">{g.tag}</p>}
                <h2 className="text-[1.5rem] text-rose md:text-[1.875rem]">{g.title}</h2>
                <div className="rule mt-4" />
                {g.desc && <p className="mt-5 whitespace-pre-line leading-relaxed text-foreground/85">{g.desc}</p>}
                <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <p><span className="text-sm text-muted-foreground">{t('plans.from')} </span><span className="font-serif text-xl text-primary">{yen(from)}</span> <span className="text-xs text-muted-foreground">{t('unit.person')}</span></p>
                  <span className="text-sm text-muted-foreground">· {t('plans.count', { n: g.items.length })}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <Link to="/bang-gia" className="border-b border-rose pb-0.5 text-primary hover:text-rose">{t('plans.seePrices')} →</Link>
                  <Link to="/album" className="border-b border-rose pb-0.5 text-primary hover:text-rose">{t('plans.more')} →</Link>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {g.items.map(p => <ProductCard key={p.id} p={p} onOpen={setOpen} />)}
                {g.extra.map((src, i) => (
                  <Img key={src + i} src={src} alt="" className="aspect-[4/5] w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Lời mời sang trang chụp ảnh, đặt giữa trang */}
      <section className="border-y bg-ink py-10 text-center text-white">
        <div className="container-x">
          <p className="font-serif text-lg md:text-xl">{t('pricing.photoTitle')}</p>
          <Link to="/chup-anh" className="mt-4 inline-flex h-11 items-center rounded-full border border-white/70 bg-white/10 px-7 text-sm hover:bg-white/20">{t('nav.photo')} →</Link>
        </div>
      </section>

      {chooseItems.length > 0 && (
        <section className="section">
          <div className="container-x max-w-4xl">
            <h2 className="text-2xl text-rose">{tx('choose_title', 'choose.title')}</h2>
            <div className="rule mt-4" />
            <TitleTextList items={chooseItems} columns={2} className="mt-8" />
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild><Link to="/dat-lich">{t('cta.book')}</Link></Button>
              <Button asChild variant="outline" className={outlineBtn}><Link to="/tinh-gia">{t('photo.calc')}</Link></Button>
            </div>
          </div>
        </section>
      )}

      <ProductDialog p={open} onClose={() => setOpen(null)} />
    </>
  );
}

export default function Plans() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker="Kimono Styles" title={t('plans.title')} sub={t('plans.sub')}
        secondary={{ to: '/bang-gia', label: t('nav.pricing') }} primary={{ to: '/dat-lich', label: t('cta.book') }} />
      <NeedSite><Inner /></NeedSite>
      <PageTail faqGroup="Kimono" />
    </>
  );
}
