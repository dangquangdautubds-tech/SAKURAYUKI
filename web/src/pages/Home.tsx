import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, MapPin, Phone, Scissors, Shirt, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite, type Card, type Product } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Img } from '@/components/Img';
import { ProductCard, ProductDialog } from '@/components/ProductCard';
import { CardDialog, CardTile } from '@/components/CardDialog';
import { chatLinks } from '@/components/Layout';
import { ErrorState, Loading, SectionTitle, Stars, useTitle } from '@/components/common';

const safeEmbed = (s: string) => { const m = String(s || '').match(/https:\/\/www\.google\.com\/maps\/embed\?[^"'\s<>]+/); return m ? m[0] : ''; };
const outline = 'border-rose text-primary hover:bg-accent hover:text-primary';

export default function Home() {
  const { t, L } = useI18n(); const { site, loading, reload } = useSite(); const tx = useTx();
  const [product, setProduct] = useState<Product | null>(null);
  const [card, setCard] = useState<{ c: Card; kind: 'concept' | 'photo' | 'service' | 'hair' } | null>(null);
  useTitle();
  if (!site) return loading ? <Loading className="min-h-screen" /> : <div className="pt-24"><ErrorState onRetry={reload} /></div>;
  const st = site.settings;
  const r = st.return_by || '17:30';
  const chats = chatLinks(st);
  const show = (k: string) => st[k] !== false;
  const bullets = tx('intro_bullets', 'intro.bullets', { r }).split('\n').map(x => x.trim()).filter(Boolean);
  const whyIcons = [MapPin, Shirt, Scissors];

  return (
    <>
      {/* 1. ẢNH BÌA */}
      <section className="relative flex min-h-[38rem] items-end overflow-hidden bg-ink text-white md:min-h-[44rem]" style={{ height: '100svh', maxHeight: '56rem' }}>
        <Img src={site.images.hero} scene fallbackKey="hero" alt="" loading="eager" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" aria-hidden />
        <div className="container-x relative pb-16 md:pb-24">
          <div className="max-w-xl">
            <p className="text-[0.6875rem] uppercase tracking-[0.3em] text-white/85">{tx('hero_kicker', 'hero.kicker')}</p>
            <h1 className="mt-4 text-[2rem] leading-[1.2] md:text-[2.75rem]">{tx('hero_title', 'hero.title')}</h1>
            <p className="mt-4 font-serif text-base text-white/90 md:text-lg">{tx('hero_sub', 'hero.sub')}</p>
            {st.google_rating && (
              <a href={st.google_reviews_url || undefined} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/30 px-4 py-1.5 text-sm">
                <Star className="h-4 w-4 fill-current text-[hsl(36_60%_65%)]" />{st.google_rating}{st.google_reviews && <> · {st.google_reviews} {t('hero.reviews')}</>}
              </a>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/goi-thue" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] text-ink transition-colors hover:bg-white/90">{t('hero.browse')}<ArrowRight className="h-4 w-4" /></Link>
              <Link to="/dat-lich" className="inline-flex h-12 items-center rounded-full border border-white/70 bg-white/10 px-6 text-[0.9375rem] transition-colors hover:bg-white/20">{t('cta.book')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. GIỚI THIỆU */}
      <section className="section">
        <div className="container-x grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-[1.625rem] leading-snug text-rose md:text-[2rem]">{tx('intro_title', 'intro.title')}</h2>
            <div className="rule mt-5" />
            <p className="mt-6 leading-relaxed text-foreground/85">{tx('intro_text', 'intro.text')}</p>
            <ul className="mt-6 space-y-3">{bullets.map(b => <li key={b} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-rose" /><span>{b}</span></li>)}</ul>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <Link to="/goi-thue" className="border-b border-rose pb-0.5 text-primary hover:text-rose">{t('styles.all')} →</Link>
              <Link to="/bang-gia" className="border-b border-rose pb-0.5 text-primary hover:text-rose">{t('styles.prices')} →</Link>
            </div>
          </div>
          <Img src={site.images.intro} scene fallbackKey="intro" alt="" className="aspect-[4/3] w-full rounded-2xl md:aspect-[5/6]" />
        </div>
      </section>

      {/* 3. VÌ SAO CHỌN */}
      <section className="section bg-secondary/60">
        <div className="container-x">
          <SectionTitle title={tx('why_title', 'why.title')} />
          <div className="grid gap-10 md:grid-cols-3">
            {[1, 2, 3].map(i => { const Icon = whyIcons[i - 1]; return (
              <div key={i} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-rose/50 text-rose"><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
                <h3 className="mt-5 text-xl">{tx(`why${i}_title`, `why${i}.title`)}</h3>
                <p className="mx-auto mt-2 max-w-xs text-muted-foreground">{tx(`why${i}_text`, `why${i}.text`)}</p>
              </div>
            ); })}
          </div>
          <p className="mt-12 text-center text-sm tracking-wide text-muted-foreground">{t('why.strip')}</p>
        </div>
      </section>

      {/* 4. KIỂU KIMONO */}
      {show('home_show_featured') && site.products.length > 0 && (
        <section className="section">
          <div className="container-x">
            <SectionTitle title={tx('styles_title', 'styles.title')} sub={tx('styles_sub', 'styles.sub')} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">{site.products.slice(0, 9).map(p => <ProductCard key={p.id} p={p} onOpen={setProduct} />)}</div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className={outline}><Link to="/goi-thue">{t('styles.all')}</Link></Button>
              <Button asChild><Link to="/bang-gia">{t('styles.prices')}</Link></Button>
            </div>
          </div>
        </section>
      )}

      {/* 5. CONCEPT */}
      {show('home_show_concepts') && site.concepts.length > 0 && (
        <section className="section bg-secondary/60">
          <div className="container-x">
            <SectionTitle title={tx('concepts_title', 'concepts.title')} sub={tx('concepts_sub', 'concepts.sub')} />
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
              {site.concepts.map(c => <div key={c.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-auto"><CardTile c={c} scene aspect="aspect-[3/4]" onOpen={c => setCard({ c, kind: 'concept' })} /></div>)}
            </div>
          </div>
        </section>
      )}

      {/* 6. GÓI CHỤP ẢNH */}
      {show('home_show_photoshoot') && site.photoshoots.length > 0 && (
        <section className="section">
          <div className="container-x">
            <SectionTitle title={tx('photo_title', 'photo.title')} sub={tx('photo_sub', 'photo.sub')} />
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {site.photoshoots.slice(0, 4).map(c => <CardTile key={c.id} c={c} scene aspect="aspect-[4/5] md:aspect-[5/4]" priceLabel={t('photo.from')} cta={t('photo.view')} onOpen={c => setCard({ c, kind: 'photo' })} />)}
            </div>
            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-muted-foreground">{tx('photo_note', 'photo.note')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className={outline}><Link to="/chup-anh">{t('nav.photo')}</Link></Button>
              {chats[0] && <Button asChild><a href={chats[0].href} target="_blank" rel="noopener noreferrer">{t('photo.talk')}</a></Button>}
            </div>
          </div>
        </section>
      )}

      {/* 7. DỊCH VỤ KÈM THEO */}
      {show('home_show_services') && site.services.length > 0 && (
        <section className="section bg-secondary/60">
          <div className="container-x">
            <SectionTitle title={tx('services_title', 'services.title')} sub={tx('services_sub', 'services.sub')} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
              {site.services.map(c => <CardTile key={c.id} c={c} aspect="aspect-square" onOpen={c => setCard({ c, kind: 'service' })} />)}
            </div>
          </div>
        </section>
      )}

      {/* 8. KIỂU TÓC */}
      {show('home_show_hairs') && site.hairs.length > 0 && (
        <section className="section">
          <div className="container-x">
            <SectionTitle title={t('hairs.title')} sub={t('hairs.sub')} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {site.hairs.slice(0, 4).map(c => <CardTile key={c.id} c={c} aspect="aspect-[3/4]" onOpen={c => setCard({ c, kind: 'hair' })} />)}
            </div>
            <div className="mt-8 text-center"><Button asChild variant="outline" className={outline}><Link to="/mau-toc">{t('cta.all')}</Link></Button></div>
          </div>
        </section>
      )}

      {/* 9. QUY TRÌNH */}
      <section className="section bg-secondary/60">
        <div className="container-x">
          <SectionTitle title={t('flow.title')} />
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <li key={i} className="border-t border-gold pt-5">
                <span className="font-serif text-3xl text-rose">0{i}</span>
                <h3 className="mt-3 text-lg">{t(`step${i}.t`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`step${i}.d`, { r })}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center"><Button asChild><Link to="/dat-lich">{t('cta.book')}</Link></Button></div>
        </div>
      </section>

      {/* 10. ĐÁNH GIÁ */}
      {show('home_show_reviews') && (site.reviews.length > 0 || st.google_rating) && (
        <section className="section overflow-hidden">
          <div className="container-x"><SectionTitle title={t('reviews.title')} sub={st.google_rating ? `★ ${st.google_rating}${st.google_reviews ? ' · ' + st.google_reviews + ' ' + t('hero.reviews') : ''}` : undefined} /></div>
          {site.reviews.length > 0 && (
            <div className="group relative" tabIndex={0}>
              <div className="flex w-max gap-4 px-4 animate-marquee group-hover:[animation-play-state:paused] group-focus:[animation-play-state:paused] group-active:[animation-play-state:paused]">
                {[...site.reviews, ...site.reviews].map((rv, i) => (
                  <figure key={i} aria-hidden={i >= site.reviews.length} className="w-[18rem] shrink-0 rounded-2xl border bg-card p-6 md:w-[22rem]">
                    <Stars n={rv.stars} />
                    <blockquote className="mt-3 line-clamp-5 text-sm leading-relaxed">{rv.text}</blockquote>
                    <figcaption className="mt-4 text-xs text-muted-foreground">— {rv.name}{rv.lang ? ' · ' + rv.lang : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          {st.google_reviews_url && <div className="mt-10 text-center"><Button asChild variant="outline" className={outline}><a href={st.google_reviews_url} target="_blank" rel="noopener noreferrer">{t('reviews.google')}</a></Button></div>}
        </section>
      )}

      {/* 11. BĂNG ẢNH LỚN */}
      <section className="relative overflow-hidden bg-ink text-white">
        <Img src={site.images.banner} scene fallbackKey="banner" alt="" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="container-x relative py-24 text-center md:py-32">
          <p className="text-[0.6875rem] uppercase tracking-[0.3em] text-white/85">{tx('banner_eyebrow', 'banner.eyebrow')}</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[1.75rem] leading-snug md:text-[2.25rem]">{tx('banner_title', 'banner.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/90">{tx('banner_text', 'banner.text')}</p>
          <Link to="/album" className="mt-8 inline-flex h-11 items-center rounded-full border border-white/70 bg-white/10 px-7 text-sm hover:bg-white/20">{t('banner.cta')}</Link>
        </div>
      </section>

      {/* 12. CỬA HÀNG */}
      {site.branches.length > 0 && (
        <section className="section">
          <div className="container-x">
            <SectionTitle title={t('loc.title')} />
            <div className="grid gap-6 md:grid-cols-2">
              {site.branches.map(b => { const embed = safeEmbed(b.mapEmbed); return (
                <article key={b.id} className="overflow-hidden rounded-2xl border bg-card">
                  {embed ? <iframe src={embed} title={L(b.name)} className="aspect-[16/9] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                    : <Img src={site.images['branch-' + b.id.toLowerCase()]} scene fallbackKey={'branch' + b.id} alt={L(b.name)} className="aspect-[16/9] w-full" />}
                  <div className="p-6">
                    <h3 className="text-xl text-rose">{L(b.name)}</h3>
                    <p className="mt-3 flex gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose" /><span>{b.address}{b.addressNote && <span className="block text-muted-foreground">{b.addressNote}</span>}</span></p>
                    {b.hours && <p className="mt-2 flex gap-2 text-sm"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-rose" />{b.hours}</p>}
                    {b.phone && <p className="mt-2 flex gap-2 text-sm"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-rose" />{b.phone}</p>}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild size="sm"><Link to={'/dat-lich?branch=' + b.id}>{t('cta.bookHere')}</Link></Button>
                      {b.mapLink && <Button asChild size="sm" variant="outline" className={outline}><a href={b.mapLink} target="_blank" rel="noopener noreferrer">{t('cta.directions')}</a></Button>}
                    </div>
                  </div>
                </article>
              ); })}
            </div>
          </div>
        </section>
      )}

      {/* 13. HỎI ĐÁP */}
      {site.faqs.length > 0 && (
        <section className="section bg-secondary/60">
          <div className="container-x max-w-3xl">
            <SectionTitle title={t('faqh.title')} />
            <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
              {site.faqs.slice(0, 4).map(f => (
                <AccordionItem key={f.id} value={f.id} className="last:border-0">
                  <AccordionTrigger className="py-5 text-left font-serif text-base">{L(f.q)}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line pb-5 text-muted-foreground">{L(f.a)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-6 text-center text-sm"><Link to="/hoi-dap" className="border-b border-rose pb-0.5 text-primary">{t('faqh.all')} →</Link></p>
          </div>
        </section>
      )}

      {/* 14. CẨM NANG */}
      {show('home_show_blog') && site.posts.length > 0 && (
        <section className="section">
          <div className="container-x">
            <h2 className="text-2xl text-rose">{t('guide.title')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('guide.sub')}</p>
            <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {site.posts.slice(0, 4).map(p => <Link key={p.id} to={'/blog/' + p.slug} className="border-t-2 border-gold pt-4 font-medium leading-snug hover:text-primary">{p.title}</Link>)}
            </div>
            <p className="mt-8 text-sm"><Link to="/blog" className="border-b border-rose pb-0.5 text-primary">{t('guide.all')} →</Link></p>
          </div>
        </section>
      )}

      {/* 15. LỜI KÊU GỌI CUỐI */}
      <section className="border-t py-20 text-center md:py-24">
        <div className="container-x">
          <h2 className="text-[1.75rem] text-rose md:text-[2.25rem]">{tx('cta_title', 'cta.title')}</h2>
          <p className="mt-4 font-serif text-muted-foreground">{tx('cta_sub', 'cta.sub')}</p>
          <Button asChild size="lg" className="mt-8 h-14 px-10 font-serif text-lg shadow-soft"><Link to="/dat-lich">{t('cta.final')}</Link></Button>
        </div>
      </section>

      <ProductDialog p={product} onClose={() => setProduct(null)} />
      <CardDialog c={card?.c || null} onClose={() => setCard(null)} scene={card?.kind === 'concept' || card?.kind === 'photo'} priceLabel={card?.kind === 'photo' ? t('photo.from') : undefined}>
        <Button asChild><Link to="/dat-lich">{card?.kind === 'photo' ? t('photo.book') : t('cta.book')}</Link></Button>
        {chats[0] && <Button asChild variant="outline" className={outline}><a href={chats[0].href} target="_blank" rel="noopener noreferrer">{t('chat.with')}</a></Button>}
      </CardDialog>
    </>
  );
}
