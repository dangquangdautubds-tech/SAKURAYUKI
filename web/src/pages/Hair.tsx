import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useSite, type Card } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { CardDialog, CardTile } from '@/components/CardDialog';
import { Empty, NeedSite, PageHeader } from '@/components/common';

function Inner() {
  const { t } = useI18n(); const { site } = useSite();
  const [open, setOpen] = useState<Card | null>(null);
  return (
    <div className="container-x section pt-10 md:pt-14">
      {site!.hairs.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{site!.hairs.map(c => <CardTile key={c.id} c={c} aspect="aspect-[3/4]" onOpen={setOpen} />)}</div> : <Empty />}
      <div className="mt-12 text-center"><Button asChild size="lg"><Link to="/dat-lich">{t('cta.book')}</Link></Button></div>
      <CardDialog c={open} onClose={() => setOpen(null)} kicker={t('nav.hair')}><Button asChild><Link to="/dat-lich">{t('cta.book')}</Link></Button></CardDialog>
    </div>
  );
}
export default function Hair() { const { t } = useI18n(); return <><PageHeader kicker="Hair" title={t('hairs.title')} sub={t('hairs.sub')} /><NeedSite><Inner /></NeedSite></>; }
