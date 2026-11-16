import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite, type Faq as FaqItem } from '@/lib/site';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Empty, NeedSite } from '@/components/common';
import { GuideLinks, ClosingCta, JumpLinks, outlineBtn, PageHero } from '@/components/PageSections';

const slug = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'khac';
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Inner() {
  const { t, L } = useI18n(); const { site } = useSite();
  const [q, setQ] = useState('');

  const found = site!.faqs.filter(f => !q || norm(L(f.q) + ' ' + L(f.a)).includes(norm(q)));

  /* Gom câu hỏi theo nhóm, giữ thứ tự xuất hiện; câu không có nhóm xếp vào "Khác" */
  const groups = useMemo(() => {
    const m = new Map<string, FaqItem[]>();
    found.forEach(f => {
      const g = L(f.group) || t('faq.other');
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(f);
    });
    return [...m].map(([title, items]) => ({ title, id: slug(title), items }));
  }, [found, L, t]);

  const grouped = groups.length > 1;

  return (
    <>
      {grouped && !q && <JumpLinks label={t('faq.topics')} items={groups.map(g => ({ id: g.id, label: g.title }))} />}

      <div className="container-x section max-w-3xl pt-10 md:pt-12">
        <div className="relative mb-10">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('faq.search')} className="pl-9" aria-label={t('faq.search')} />
        </div>

        {!found.length ? <Empty>{t('faq.none')}</Empty> : groups.map(g => (
          <section key={g.id} id={g.id} className="mb-12 scroll-mt-24 last:mb-0">
            {grouped && (
              <>
                <h2 className="text-xl text-rose md:text-2xl">{g.title}</h2>
                <div className="rule mt-4" />
              </>
            )}
            <Accordion type="single" collapsible className="mt-5 border-t">
              {g.items.map(f => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="py-5 text-left font-serif text-base md:text-lg">{L(f.q)}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line pb-5 text-muted-foreground">{L(f.a)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl bg-secondary/60 p-6">
          <p className="flex-1 font-serif text-lg">{t('faq.more')}</p>
          <Button asChild variant="outline" className={outlineBtn}><Link to="/lien-he">{t('nav.contact')}</Link></Button>
        </div>
      </div>
    </>
  );
}

export default function Faq() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker="FAQ" title={t('faq.title')} sub={t('faq.sub')}
        secondary={{ to: '/bang-gia', label: t('nav.pricing') }} primary={{ to: '/goi-thue', label: t('nav.styles') }} />
      <NeedSite><Inner /></NeedSite>
      <GuideLinks />
      <ClosingCta />
    </>
  );
}
