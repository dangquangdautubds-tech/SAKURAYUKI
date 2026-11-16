import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { yen, type Card } from '@/lib/site';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Img } from './Img';
import { MediaBadge, MediaViewer } from './Media';
import { cn } from '@/lib/utils';

/** Thẻ ảnh có chữ đè (kiểu tóc, concept, gói chụp, dịch vụ) */
export function CardTile({ c, onOpen, scene, aspect = 'aspect-[4/5]', priceLabel, cta }: { c: Card; onOpen: (c: Card) => void; scene?: boolean; aspect?: string; priceLabel?: string; cta?: string }) {
  const { t, L } = useI18n();
  return (
    <button type="button" onClick={() => onOpen(c)} className={cn('card-img group w-full', aspect)}>
      <Img src={c.image} scene={scene} fallbackKey={c.id} alt={L(c.name)} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
      <MediaBadge count={c.images.length} video={c.video} />
      <span className="cap block">
        <span className="block font-serif text-xl leading-snug">{L(c.name)}</span>
        {L(c.tag) && <span className="mt-1 block text-sm text-white/85">{L(c.tag)}</span>}
        {c.price > 0 && <span className="mt-1.5 block text-sm text-[hsl(36_60%_72%)]">{priceLabel || t('card.from')} {yen(c.price)}</span>}
        {cta && <span className="mt-3 inline-flex rounded-full border border-white/70 bg-white/10 px-4 py-1.5 text-sm">{cta} →</span>}
      </span>
    </button>
  );
}

export function CardDialog({ c, onClose, scene, kicker, priceLabel, children }: { c: Card | null; onClose: () => void; scene?: boolean; kicker?: string; priceLabel?: string; children?: ReactNode }) {
  const { t, L } = useI18n();
  return (
    <Dialog open={!!c} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto p-0 sm:rounded-2xl">
        {c && (
          <div className="grid md:grid-cols-2">
            <MediaViewer images={c.images} video={c.video} fallbackKey={c.id} alt={L(c.name)} scene={scene} />
            <div className="flex flex-col p-6 md:p-8">
              {kicker && <p className="kicker">{kicker}</p>}
              <DialogTitle className="mt-2 font-serif text-2xl font-normal text-rose">{L(c.name)}</DialogTitle>
              {L(c.tag) && <p className="mt-2 font-medium">{L(c.tag)}</p>}
              {c.price > 0 && <p className="mt-3"><span className="text-sm text-muted-foreground">{priceLabel || t('card.from')}</span> <span className="font-serif text-2xl text-primary">{yen(c.price)}</span></p>}
              <DialogDescription className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{L(c.desc)}</DialogDescription>
              {children && <div className="mt-auto flex flex-wrap gap-2 pt-8">{children}</div>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
