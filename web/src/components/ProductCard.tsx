import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { branchName, useSite, yen, type Product } from '@/lib/site';
import { Img } from './Img';
import { MediaBadge, MediaViewer } from './Media';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export function ProductCard({ p, onOpen }: { p: Product; onOpen: (p: Product) => void }) {
  const { t, L } = useI18n();
  return (
    <button type="button" onClick={() => onOpen(p)} className="card-img group aspect-[4/5] w-full" aria-label={L(p.name)}>
      <Img src={p.image} fallbackKey={p.id + p.category} alt={L(p.name)} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
      <MediaBadge count={p.images.length} video={p.video} />
      {p.status === 'Đang giặt' && <span className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-[0.6875rem] text-white">{t('plans.washing')}</span>}
      <span className="cap block">
        <span className="block text-[0.6875rem] uppercase tracking-[0.2em] text-white/75">{p.category}</span>
        <span className="mt-1 block font-serif text-lg leading-snug md:text-xl">{L(p.name)}</span>
        <span className="mt-1 block text-sm text-white/90">{t('card.from')} {yen(p.price)}</span>
      </span>
    </button>
  );
}

export function ProductDialog({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { t, L, lang } = useI18n(); const { site } = useSite();
  return (
    <Dialog open={!!p} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto p-0 sm:rounded-2xl">
        {p && (
          <div className="grid md:grid-cols-2">
            <MediaViewer images={p.images} video={p.video} fallbackKey={p.id + p.category} alt={L(p.name)} />
            <div className="flex flex-col p-6 md:p-8">
              <p className="kicker">{p.category}</p>
              <DialogTitle className="mt-2 font-serif text-2xl font-normal text-rose">{L(p.name)}</DialogTitle>
              <p className="mt-3"><span className="font-serif text-2xl text-primary">{yen(p.price)}</span> <span className="text-sm text-muted-foreground">{t('unit.person')}</span></p>
              <DialogDescription className="mt-4 whitespace-pre-line text-sm text-foreground/80">{L(p.desc)}</DialogDescription>
              {p.status === 'Đang giặt' && <p className="mt-3 text-sm text-warning">{t('plans.washing')}</p>}
              <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('plans.includes')}</h4>
              <ul className="mt-3 space-y-2 text-sm">{['plans.inc1', 'plans.inc2', 'plans.inc3', 'plans.inc4'].map(k => <li key={k} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t(k)}</li>)}</ul>
              {p.branches.length > 0 && <p className="mt-5 text-sm text-muted-foreground">{t('plans.onlyAt')}: {p.branches.map(id => branchName(site, id, lang)).join(', ')}</p>}
              <Button asChild className="mt-8 w-full" size="lg"><Link to={'/dat-lich?plan=' + encodeURIComponent(p.id)} onClick={onClose}>{t('plans.choose')}</Link></Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
