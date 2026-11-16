import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { parseVideo } from '@/lib/video';
import { Img } from './Img';
import { cn } from '@/lib/utils';

/** Khung xem nhiều ảnh + video của 1 mục (trang phục, kiểu tóc, gói chụp…) */
export function MediaViewer({ images, video, fallbackKey, alt, scene, className }: { images: string[]; video?: string; fallbackKey: string; alt: string; scene?: boolean; className?: string }) {
  const { t } = useI18n();
  const v = parseVideo(video);
  const list = images.length ? images : [''];
  const total = list.length + (v && v.kind !== 'link' ? 1 : 0);
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [fallbackKey]);
  const isVideo = i >= list.length;
  const go = (d: number) => setI(x => (x + d + total) % total);
  return (
    <div className={cn('flex flex-col bg-secondary', className)}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink md:aspect-auto md:min-h-[26rem] md:flex-1">
        {isVideo && v ? (
          v.kind === 'iframe'
            ? <iframe src={v.src} title={alt} className="absolute inset-0 h-full w-full border-0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
            : <video src={v.src} controls playsInline className="absolute inset-0 h-full w-full bg-black object-contain" />
        ) : <Img src={list[i]} scene={scene} fallbackKey={fallbackKey + (i || '')} alt={alt} loading="eager" className="absolute inset-0 h-full w-full" />}
        {total > 1 && <>
          <button type="button" onClick={() => go(-1)} aria-label="Prev" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs tabular-nums text-white">{i + 1} / {total}</span>
        </>}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {list.map((u, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={t('media.photo') + ' ' + (k + 1)} aria-current={i === k} className={cn('h-16 w-14 shrink-0 overflow-hidden rounded-sm border-2', i === k ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}>
              <Img src={u} scene={scene} fallbackKey={fallbackKey + (k || '')} alt="" className="h-full w-full" />
            </button>
          ))}
          {v && v.kind !== 'link' && (
            <button type="button" onClick={() => setI(list.length)} aria-label={t('media.video')} aria-current={isVideo} className={cn('grid h-16 w-14 shrink-0 place-items-center rounded-sm border-2 bg-ink text-white', isVideo ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100')}><Play className="h-5 w-5 fill-current" /></button>
          )}
        </div>
      )}
      {v && v.kind === 'link' && <a href={v.src} target="_blank" rel="noopener noreferrer" className="m-2 inline-flex items-center justify-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:border-primary"><Play className="h-4 w-4" />{t('card.video')}<ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>}
    </div>
  );
}

/** Huy hiệu nhỏ trên thẻ: số ảnh / có video */
export function MediaBadge({ count, video }: { count: number; video?: string }) {
  if (count < 2 && !video) return null;
  return <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.6875rem] text-white">{video && <Play className="h-3 w-3 fill-current" />}{count > 1 && <>{count}</>}</span>;
}
