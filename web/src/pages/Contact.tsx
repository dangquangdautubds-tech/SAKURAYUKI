import { Link } from 'react-router-dom';
import { Clock, Info, Mail, MapPin, Phone, Train } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { Img } from '@/components/Img';
import { chatLinks, SocialLinks } from '@/components/Layout';
import { NeedSite } from '@/components/common';
import { outlineBtn, PageHero, PageTail } from '@/components/PageSections';

/** Chỉ nhúng bản đồ Google (iframe) từ link nhúng hợp lệ */
const safeEmbed = (s: string) => { const m = String(s || '').match(/https:\/\/www\.google\.com\/maps\/embed\?[^"'\s<>]+/); return m ? m[0] : ''; };

function Inner() {
  const { t, L } = useI18n(); const { site } = useSite(); const tx = useTx();
  const st = site!.settings;
  const chats = chatLinks(st);
  const note = tx('access_note', '');

  return (
    <>
      {/* Từng cửa hàng: bản đồ lớn + thông tin đi lại */}
      <div className="container-x section space-y-12 pt-10 md:pt-14">
        {site!.branches.map(b => {
          const embed = safeEmbed(b.mapEmbed);
          return (
            <section key={b.id} className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
              <div className="overflow-hidden rounded-2xl border bg-card">
                {embed
                  ? <iframe src={embed} title={L(b.name)} className="aspect-[16/11] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  : <Img src={site!.images['branch-' + b.id.toLowerCase()]} scene fallbackKey={'branch' + b.id} alt={L(b.name)} className="aspect-[16/11] w-full" />}
              </div>
              <div className="min-w-0">
                <p className="kicker mb-2">{t('contact.location')}</p>
                <h2 className="text-2xl text-rose">{L(b.name)}</h2>
                <div className="rule mt-4" />
                <dl className="mt-6 space-y-4 text-sm">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden />
                    <div><dt className="sr-only">{t('contact.location')}</dt>
                      <dd>{b.address}{b.addressNote && <span className="mt-1 block text-muted-foreground">{b.addressNote}</span>}</dd></div>
                  </div>
                  {b.hours && (
                    <div className="flex gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden />
                      <div><dt className="sr-only">{t('contact.hours')}</dt><dd>{b.hours}</dd></div>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex gap-3">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden />
                      <div><dt className="sr-only">{t('contact.phone')}</dt>
                        <dd><a href={'tel:' + b.phone.replace(/[^\d+]/g, '')} className="hover:text-primary hover:underline">{b.phone}</a></dd></div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Train className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden />
                    <div><dt className="sr-only">{t('contact.getThere')}</dt>
                      <dd className="text-muted-foreground">{t('contact.return')}: <span className="font-medium text-foreground">{st.return_by}</span></dd></div>
                  </div>
                </dl>
                <div className="mt-7 flex flex-wrap gap-2">
                  <Button asChild><Link to={'/dat-lich?branch=' + b.id}>{t('cta.bookHere')}</Link></Button>
                  {b.mapLink && <Button asChild variant="outline" className={outlineBtn}><a href={b.mapLink} target="_blank" rel="noopener noreferrer">{t('contact.map')}</a></Button>}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Kênh liên hệ, xếp dọc để bấm nhanh trên điện thoại */}
      <section className="section bg-secondary/50">
        <div className="container-x max-w-3xl">
          <h2 className="text-2xl text-rose">{t('contact.channels')}</h2>
          <div className="rule mt-4" />
          <ul className="mt-8 divide-y border-y">
            {chats.map(c => (
              <li key={c.key}>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-4 transition-colors hover:text-primary">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card">{c.icon}</span>
                  <span className="min-w-0"><span className="block font-medium">{c.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.href}</span></span>
                </a>
              </li>
            ))}
            {st.shop_phone && (
              <li><a href={'tel:' + String(st.shop_phone).replace(/[^\d+]/g, '')} className="flex items-center gap-4 py-4 hover:text-primary">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card"><Phone className="h-[18px] w-[18px]" /></span>
                <span><span className="block font-medium">{t('contact.phone')}</span><span className="block text-xs text-muted-foreground">{st.shop_phone}</span></span>
              </a></li>
            )}
            {st.shop_email && (
              <li><a href={'mailto:' + st.shop_email} className="flex items-center gap-4 py-4 hover:text-primary">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card"><Mail className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0"><span className="block font-medium">Email</span><span className="block truncate text-xs text-muted-foreground">{st.shop_email}</span></span>
              </a></li>
            )}
          </ul>
          <SocialLinks className="mt-8" />
          {note && (
            <p className="mt-8 flex gap-3 rounded-2xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{note}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export default function Contact() {
  const { t } = useI18n(); const { site } = useSite();
  const chat = chatLinks(site?.settings || {})[0];
  return (
    <>
      <PageHero kicker="Access" title={t('contact.title')} sub={t('contact.sub')}
        secondary={chat ? { href: chat.href, label: t('chat.with') } : undefined}
        primary={{ to: '/dat-lich', label: t('cta.book') }} />
      <NeedSite><Inner /></NeedSite>
      <PageTail faqLimit={3} />
    </>
  );
}
