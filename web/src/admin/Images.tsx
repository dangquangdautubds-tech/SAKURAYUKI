import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash } from 'lucide-react';
import { compressImage } from '@/lib/api';
import { DEMO } from '@/lib/config';
import { Img } from '@/components/Img';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { notifySiteChanged } from '@/lib/site';
import { ErrorState, Loading } from '@/components/common';
import { useAdmin, useList } from './ctx';
import { AdminHeader, Panel } from './ui';
import { ImageField } from './ui';

type SlotDef = { slot: string; label: string; aspect: string; scene?: boolean };

export default function Images() {
  const { call } = useAdmin();
  const [images, setImages] = useState<Record<string, string> | null>(null); const [error, setError] = useState('');
  const { items: branches, load: lb } = useList<any>('branches');
  const fileRef = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(0);
  const load = async () => { const r = await call<{ images: Record<string, string> }>('listImages'); if (r.ok) setImages(r.images); else setError(r.error || 'Lỗi'); };
  useEffect(() => { load(); lb(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = async (slot: string, url: string) => {
    const r = url ? (url.startsWith('https://lh3.googleusercontent.com/') || url.startsWith('https://demo.local/u/') ? { ok: true } : await call('setImageUrl', { slot, url })) : await call('deleteImage', { slot });
    if (!r.ok) { toast.error((r as any).error || 'Lỗi'); return; }
    setImages(m => { const n = { ...(m || {}) }; if (url) n[slot] = url; else delete n[slot]; return n; });
    notifySiteChanged(); if (!url) toast.success('Đã bỏ ảnh — dùng ảnh minh hoạ');
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!images) return <Loading />;
  const GALLERY_MAX = 60;
  const gallery = Object.keys(images).filter(k => /^gallery-\d+$/.test(k)).sort((x, y) => +x.split('-')[1] - +y.split('-')[1]);
  const bulk = async (files: FileList | null) => {
    const fs = Array.from(files || []).filter(f => /^image\//.test(f.type));
    const used = new Set(gallery); const free: string[] = [];
    for (let i = 1; i <= GALLERY_MAX && free.length < fs.length; i++) if (!used.has('gallery-' + i)) free.push('gallery-' + i);
    if (free.length < fs.length) toast.error(`Album tối đa ${GALLERY_MAX} ảnh — chỉ tải ${free.length} ảnh đầu`);
    setBusy(free.length);
    for (let i = 0; i < free.length; i++) {
      try {
        const data = await compressImage(fs[i], DEMO ? 900 : 1600, DEMO ? 0.75 : 0.85);
        const r = await call<{ url: string }>('uploadImage', { data, mime: 'image/jpeg', slot: free[i] });
        if (!r.ok) throw new Error(r.error);
        setImages(m => ({ ...(m || {}), [free[i]]: r.url }));
      } catch (e: any) { toast.error(e?.message || 'Tải ảnh thất bại'); }
      setBusy(n => n - 1);
    }
    notifySiteChanged(); if (fileRef.current) fileRef.current.value = '';
  };
  const groups: { title: string; hint?: string; slots: SlotDef[] }[] = [
    { title: 'Trang chủ', hint: 'Ảnh bìa nên là ảnh ngang, rộng từ 1600px.', slots: [{ slot: 'hero', label: 'Ảnh bìa đầu trang', aspect: 'aspect-[16/10]' }, { slot: 'intro', label: 'Ảnh mục giới thiệu', aspect: 'aspect-[5/6]' }, { slot: 'banner', label: 'Băng ảnh lớn giữa trang', aspect: 'aspect-[16/10]' }] },
    { title: 'Cửa hàng', slots: (branches || []).map(b => ({ slot: 'branch-' + String(b.ID).toLowerCase(), label: b.Ten, aspect: 'aspect-[16/9]' })) }
  ];
  return (
    <div className="space-y-6">
      <AdminHeader title="Ảnh & album" sub="Ảnh tải lên được nén trên trình duyệt rồi lưu vào Google Drive của tiệm. Ảnh trang phục, kiểu tóc, gói chụp… đổi trong từng mục tương ứng." />
      {groups.map(g => (
        <Panel key={g.title} title={g.title}>
          {g.hint && <p className="mb-4 text-xs text-muted-foreground">{g.hint}</p>}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {g.slots.map(s => <ImageField key={s.slot} slot={s.slot} label={s.label} value={images[s.slot] || ''} fallbackKey={s.slot} aspect={s.aspect} onChange={u => change(s.slot, u)} />)}
          </div>
        </Panel>
      ))}
      <Panel title={`Album khách hàng (${gallery.length}/${GALLERY_MAX})`} action={<>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => bulk(e.target.files)} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy > 0 || gallery.length >= GALLERY_MAX}>{busy > 0 ? <><Loader2 className="h-4 w-4 animate-spin" />Còn {busy} ảnh…</> : <><ImagePlus className="h-4 w-4" />Thêm nhiều ảnh</>}</Button>
      </>}>
        <p className="mb-4 text-xs text-muted-foreground">Chọn nhiều ảnh cùng lúc (tối đa {GALLERY_MAX} ảnh trong album). Chỉ đăng ảnh khách đã đồng ý.</p>
        {!gallery.length ? <p className="py-8 text-center text-sm text-muted-foreground">Album chưa có ảnh.</p> : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {gallery.map(k => (
              <div key={k} className="group relative aspect-[4/5] overflow-hidden rounded-sm border bg-secondary">
                <Img src={images[k]} fallbackKey={k} alt="" className="h-full w-full" />
                <button type="button" onClick={() => change(k, '')} aria-label={'Xoá ' + k} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"><Trash className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
