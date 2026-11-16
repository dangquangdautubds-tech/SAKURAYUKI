import { useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Link2, Loader2, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/api';
import { DEMO } from '@/lib/config';
import { Img } from '@/components/Img';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdmin } from './ctx';
import { cn } from '@/lib/utils';

export function AdminHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl md:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-md border bg-card', className)}>
      {title && <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><h2 className="font-sans text-sm font-semibold">{title}</h2>{action}</div>}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-sm">{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <span className={cn('inline-block h-5 w-5 rounded-full bg-background shadow transition-transform', checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5')} />
    </button>
  );
}

export function Select({ value, onChange, options, className, ...rest }: { value: string; onChange: (v: string) => void; options: (string | [string, string])[]; className?: string; 'aria-label'?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} {...rest}
      className={cn('h-10 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
      {options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
}

/** Chọn ảnh: tải từ máy (nén trên trình duyệt → Google Drive) hoặc dán link https */
export function ImageField({ value, onChange, fallbackKey, slot, aspect = 'aspect-[4/5]', label = 'Ảnh' }: { value: string; onChange: (url: string) => void; fallbackKey?: string; slot?: string; aspect?: string; label?: string }) {
  const { call } = useAdmin();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [paste, setPaste] = useState(false); const [url, setUrl] = useState('');
  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast.error('Chỉ nhận tệp ảnh'); return; }
    setBusy(true);
    try {
      const data = await compressImage(f, DEMO ? 1000 : 1600, DEMO ? 0.78 : 0.85);
      const r = await call<{ url: string }>('uploadImage', { data, mime: 'image/jpeg', slot });
      if (!r.ok) throw new Error(r.error);
      onChange(r.url); toast.success('Đã tải ảnh lên');
    } catch (e: any) { toast.error(e?.message || 'Tải ảnh thất bại'); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className={cn('relative w-full max-w-[14rem] overflow-hidden rounded-sm border bg-secondary', aspect)}>
        {value ? <Img src={value} fallbackKey={fallbackKey} alt="" className="h-full w-full" /> : <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-muted-foreground">Chưa có ảnh — đang dùng ảnh minh hoạ</div>}
        {busy && <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}><ImagePlus className="h-4 w-4" />Tải ảnh</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setPaste(v => !v)}><Link2 className="h-4 w-4" />Dán link</Button>
        {value && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onChange('')}><Trash className="h-4 w-4" />Bỏ ảnh</Button>}
      </div>
      {paste && (
        <div className="flex gap-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… (Google Drive, Imgur, Cloudinary)" />
          <Button type="button" size="sm" onClick={() => { if (!/^https:\/\//.test(url.trim())) { toast.error('Link phải bắt đầu bằng https://'); return; } onChange(url.trim()); setUrl(''); setPaste(false); }}>Dùng</Button>
        </div>
      )}
    </div>
  );
}

/** Nhiều ảnh phụ: giá trị là các link cách nhau bằng xuống dòng */
export function MultiImageField({ value, onChange, label = 'Ảnh phụ', max = 9, fallbackKey }: { value: string; onChange: (v: string) => void; label?: string; max?: number; fallbackKey?: string }) {
  const { call } = useAdmin();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0); const [url, setUrl] = useState('');
  const list = String(value || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
  const set = (l: string[]) => onChange(l.join('\n'));
  const upload = async (files: FileList | null) => {
    const fs = Array.from(files || []).filter(f => /^image\//.test(f.type)).slice(0, max - list.length);
    if (!fs.length) { if (files?.length) toast.error('Đã đủ ' + max + ' ảnh phụ'); return; }
    let cur = [...list]; setBusy(fs.length);
    for (const f of fs) {
      try {
        const data = await compressImage(f, DEMO ? 1000 : 1600, DEMO ? 0.78 : 0.85);
        const r = await call<{ url: string }>('uploadImage', { data, mime: 'image/jpeg' });
        if (!r.ok) throw new Error(r.error);
        cur = [...cur, r.url]; set(cur);
      } catch (e: any) { toast.error(e?.message || 'Tải ảnh thất bại'); }
      setBusy(n => n - 1);
    }
    if (ref.current) ref.current.value = '';
  };
  const move = (i: number, d: number) => { const l = [...list]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set(l); };
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label} <span className="font-normal text-muted-foreground">({list.length}/{max})</span></Label>
      <div className="flex flex-wrap gap-2">
        {list.map((u, i) => (
          <div key={u + i} className="relative h-28 w-[5.5rem] overflow-hidden rounded-sm border bg-secondary">
            <Img src={u} fallbackKey={(fallbackKey || '') + i} alt="" className="h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 text-white">
              <button type="button" className="px-1.5 py-1 text-xs disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Chuyển lên trước">←</button>
              <button type="button" className="px-1.5 py-1" onClick={() => set(list.filter((_, k) => k !== i))} aria-label="Bỏ ảnh"><Trash className="h-3.5 w-3.5" /></button>
              <button type="button" className="px-1.5 py-1 text-xs disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Chuyển ra sau">→</button>
            </div>
          </div>
        ))}
        {list.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy > 0} className="grid h-28 w-[5.5rem] place-items-center rounded-sm border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary">
            {busy > 0 ? <span className="flex flex-col items-center gap-1"><Loader2 className="h-5 w-5 animate-spin" />còn {busy}</span> : <span className="flex flex-col items-center gap-1"><ImagePlus className="h-5 w-5" />Thêm ảnh</span>}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => upload(e.target.files)} />
      {list.length < max && (
        <div className="flex gap-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="hoặc dán link ảnh https://…" />
          <Button type="button" size="sm" variant="outline" onClick={() => { if (!/^https:\/\//.test(url.trim())) { toast.error('Link phải bắt đầu bằng https://'); return; } set([...list, url.trim()]); setUrl(''); }}>Thêm</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Chọn được nhiều ảnh một lúc. Ảnh đầu tiên trong danh sách hiện ngay sau ảnh chính.</p>
    </div>
  );
}

/** Nút xoá 2 bước (không dùng window.confirm — bị chặn trong một số khung xem) */
export function DeleteButton({ onYes, label = 'Xoá', size = 'sm' }: { onYes: () => void | Promise<void>; label?: string; size?: 'sm' | 'icon' }) {
  const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  if (!ask) return <Button type="button" size={size} variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setAsk(true)} aria-label={label}><Trash className="h-4 w-4" />{size !== 'icon' && label}</Button>;
  return (
    <span className="inline-flex items-center gap-1">
      <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { await onYes(); } finally { setBusy(false); setAsk(false); } }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Chắc chắn xoá'}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setAsk(false)}>Huỷ</Button>
    </span>
  );
}
