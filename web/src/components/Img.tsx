import { useState, type ImgHTMLAttributes } from 'react';
import { resolveImg } from '@/lib/img';
import { kimonoArt, sceneArt } from '@/lib/art';
import { cn } from '@/lib/utils';

type Props = ImgHTMLAttributes<HTMLImageElement> & { src?: string; fallbackKey?: string; scene?: boolean };
/** Ảnh có dự phòng: chưa có ảnh / lỗi tải → ảnh minh hoạ SVG theo fallbackKey */
export function Img({ src, fallbackKey, scene, className, alt = '', ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const real = failed ? '' : resolveImg(src);
  const art = scene ? sceneArt(fallbackKey || alt || 'x') : kimonoArt(fallbackKey || alt || 'x');
  return <img {...rest} src={real || art} alt={alt} loading={rest.loading || 'lazy'} decoding="async" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
}
