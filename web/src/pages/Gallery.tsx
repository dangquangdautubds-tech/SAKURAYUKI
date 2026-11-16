import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { Img } from '@/components/Img';
import { Empty, NeedSite, PageHeader } from '@/components/common';

function Inner() {
  const { site } = useSite();
  const imgs = Object.entries(site!.images).filter(([k]) => /^gallery-\d+$/.test(k)).sort((a, b) => +a[0].split('-')[1] - +b[0].split('-')[1]);
  const [idx, setIdx] = useState<number | null>(null);
  useEffect(() => {
    if (idx === null) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setIdx(null); if (e.key === 'ArrowRight') setIdx(i => (i! + 1) % imgs.length); if (e.key === 'ArrowLeft') setIdx(i => (i! - 1 + imgs.length) % imgs.length); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [idx, imgs.length]);
  if (!imgs.length) return <div className="container-x section"><Empty /></div>;
  return (
    <div className="container-x section pt-10 md:pt-12">
      <div className="columns-2 gap-4 md:columns-3 md:gap-6 [&>*]:mb-4 md:[&>*]:mb-6">
        {imgs.map(([k, u], i) => (
          <button key={k} type="button" onClick={() => setIdx(i)} className="block w-full overflow-hidden rounded-md" aria-label={k}>
            <Img src={u} fallbackKey={k} alt="" className={'w-full transition-transform duration-500 hover:scale-[1.03] ' + (i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/5]')} />
          </button>
        ))}
      </div>
      {idx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" onClick={() => setIdx(null)}>
          <Img src={imgs[idx][1]} fallbackKey={imgs[idx][0]} alt="" className="max-h-[86vh] w-auto max-w-full rounded-md object-contain" loading="eager" onClick={e => e.stopPropagation()} />
          <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-paper/10 text-paper" aria-label="Close"><X className="h-5 w-5" /></button>
          <button className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-paper/10 text-paper" aria-label="Prev" onClick={e => { e.stopPropagation(); setIdx((idx - 1 + imgs.length) % imgs.length); }}><ChevronLeft /></button>
          <button className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-paper/10 text-paper" aria-label="Next" onClick={e => { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }}><ChevronRight /></button>
        </div>
      )}
    </div>
  );
}
export default function Gallery() { const { t } = useI18n(); return <><PageHeader kicker="Gallery" title={t('gallery.title')} sub={t('gallery.sub')} /><NeedSite><Inner /></NeedSite></>; }
