import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Images } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite, yen, type Card } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { CardDialog, CardTile } from '@/components/CardDialog';
import { chatLinks } from '@/components/Layout';
import { Empty, NeedSite, SectionTitle } from '@/components/common';
import { IntroBlock, lines, outlineBtn, pairs, PageHero, PageTail, PolicyPanels, TitleTextList } from '@/components/PageSections';
import { cn } from '@/lib/utils';

const KINDS = ['solo', 'couple', 'group'] as const;
type Kind = typeof KINDS[number];

function Inner() {
  const { t, L } = useI18n(); const { site } = useSite(); const tx = useTx();
  const [kind, setKind] = useState<Kind>('solo');
  const [open, setOpen] = useState<{ c: Card; photo: boolean } | null>(null);
  const st = site!.settings;
  const fee = Number(st.card_fee_percent) || 0;
  const cardPrice = (n: number) => fee > 0 ? yen(Math.ceil(n * (1 + fee / 100) / 10) * 10) : '';
  const chats = chatLinks(st);

  const all = site!.photoshoots;
  const have = KINDS.filter(k => all.some(p => p.kind === k));
  const list = all.filter(p => p.kind === kind);
  const unit = (k: Kind) => k === 'couple' ? t('photo.forTwo') : t('photo.perPerson');

  const included = lines(tx('photo_included', 'photo.includedItems'));
  const options = pairs(tx('photo_options', 'photo.optionItems'));
  const steps = pairs(tx('photo_steps', 'photo.stepItems'));
  const policies = pairs(tx('policies_items', 'policies.items'));

  return (
    <>
      <IntroBlock text={tx('photo_note', 'photo.note')} links={[['/goi-thue', t('nav.styles')], ['/bang-gia', t('nav.pricing')], ['/album', t('nav.gallery')]]} />

      {/* Bộ chọn: một người / cặp đôi / nhóm */}
      <section className="container-x section pt-10 md:pt-14">
        {have.length > 1 && (
          <div className="mb-8 flex justify-center">
            <div role="radiogroup" aria-label={t('calc.shoot')} className="inline-flex rounded-full border bg-card p-1">
              {have.map(k => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                  className={cn('rounded-full px-5 py-2 text-sm transition-colors', kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {t('photo.kind.' + k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {list.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {list.map(c => (
                <CardTile key={c.id} c={c} scene aspect="aspect-[4/5] md:aspect-[5/4]"
                  priceLabel={t('photo.from')} cta={t('photo.view')} onOpen={c => setOpen({ c, photo: true })} />
              ))}
            </div>

            {/* Bảng gói & giá — xem nhanh toàn bộ lựa chọn */}
            <div className="mt-12">
              <h2 className="text-xl text-rose">{t('photo.table')}</h2>
              <div className="rule mt-4" />
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead className="border-b text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-3 pr-4 font-medium">{t('calc.shoot')}</th>
                      <th scope="col" className="py-3 pr-4 font-medium">{t('photo.duration')}</th>
                      <th scope="col" className="py-3 pr-4 font-medium">{t('photo.photos')}</th>
                      <th scope="col" className="py-3 text-right font-medium">{fee > 0 ? t('pricing.cash') : t('pricing.price')}</th>
                      {fee > 0 && <th scope="col" className="py-3 pl-4 text-right font-medium">{t('pricing.card')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{L(c.name)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.duration || '—'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.photos || '—'}</td>
                        <td className="whitespace-nowrap py-3 text-right"><span className="font-serif text-base text-primary">{yen(c.price)}</span><span className="ml-1 text-xs text-muted-foreground">{unit(kind)}</span></td>
                        {fee > 0 && <td className="whitespace-nowrap py-3 pl-4 text-right text-muted-foreground">{cardPrice(c.price)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild><Link to="/dat-lich">{t('photo.book')}</Link></Button>
                {st.calc_enabled !== false && <Button asChild variant="outline" className={outlineBtn}><Link to="/tinh-gia">{t('photo.calc')}</Link></Button>}
              </div>
            </div>
          </>
        ) : <Empty>{t('photo.noneKind')}</Empty>}
      </section>

      {/* Mọi gói đều có / tuỳ chọn thêm */}
      {(included.length > 0 || options.length > 0) && (
        <section className="section bg-secondary/50">
          <div className="container-x grid gap-10 md:grid-cols-2 md:gap-16">
            {included.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl text-rose"><Check className="h-5 w-5" strokeWidth={1.5} />{t('photo.included')}</h2>
                <ul className="mt-6 space-y-3 text-sm">
                  {included.map(x => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rose" /><span>{x}</span></li>)}
                </ul>
              </div>
            )}
            {options.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl text-rose"><Images className="h-5 w-5" strokeWidth={1.5} />{t('photo.options')}</h2>
                <dl className="mt-6 divide-y border-t text-sm">
                  {options.map((o, i) => (
                    <div key={o.t + i} className="flex justify-between gap-4 py-3">
                      <dt>{o.t}</dt><dd className="shrink-0 text-right text-muted-foreground">{o.d}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quy trình nhận ảnh */}
      {steps.length > 0 && (
        <section className="section">
          <div className="container-x max-w-4xl">
            <h2 className="flex items-center gap-2 text-2xl text-rose"><Clock className="h-6 w-6" strokeWidth={1.5} />{t('photo.steps')}</h2>
            <div className="rule mt-4" />
            <TitleTextList items={steps} columns={3} numbered className="mt-8" />
          </div>
        </section>
      )}

      {/* Concept để khách hình dung buổi chụp */}
      {site!.concepts.length > 0 && (
        <section className="section bg-secondary/50">
          <div className="container-x">
            <SectionTitle title={tx('concepts_title', 'concepts.title')} sub={tx('concepts_sub', 'concepts.sub')} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
              {site!.concepts.map(c => <CardTile key={c.id} c={c} scene aspect="aspect-[3/4]" onOpen={c => setOpen({ c, photo: false })} />)}
            </div>
          </div>
        </section>
      )}

      {policies.length > 0 && (
        <section className="section">
          <div className="container-x">
            <h2 className="text-2xl text-rose">{tx('policies_title', 'policies.title')}</h2>
            <div className="rule mt-4" />
            <div className="mt-8"><PolicyPanels items={policies} /></div>
          </div>
        </section>
      )}

      <CardDialog c={open?.c || null} onClose={() => setOpen(null)} scene priceLabel={open?.photo ? t('photo.from') : undefined}>
        <Button asChild><Link to="/dat-lich">{open?.photo ? t('photo.book') : t('cta.book')}</Link></Button>
        {chats[0] && <Button asChild variant="outline" className={outlineBtn}><a href={chats[0].href} target="_blank" rel="noopener noreferrer">{t('chat.with')}</a></Button>}
      </CardDialog>
    </>
  );
}

export default function Photoshoot() {
  const { t } = useI18n(); const tx = useTx();
  return (
    <>
      <PageHero kicker="Photoshoot" title={tx('photo_title', 'photo.title')} sub={tx('photo_sub', 'photo.sub')}
        secondary={{ to: '/goi-thue', label: t('nav.styles') }} primary={{ to: '/dat-lich', label: t('cta.book') }} />
      <NeedSite><Inner /></NeedSite>
      <PageTail faqGroup="Chụp ảnh" />
    </>
  );
}
