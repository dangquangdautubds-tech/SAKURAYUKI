import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bold, Eye, Heading2, Heading3, ImagePlus, Italic, Link2, List, Loader2, Pencil, Plus, Quote } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/api';
import { DEMO } from '@/lib/config';
import { renderMarkdown } from '@/lib/markdown';
import { resolveImg } from '@/lib/img';
import { notifySiteChanged } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Img } from '@/components/Img';
import { Empty, ErrorState, Loading } from '@/components/common';
import { useAdmin, useList } from './ctx';
import { AdminHeader, DeleteButton, Field, ImageField, Select } from './ui';
import { cn } from '@/lib/utils';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

export default function Posts() {
  const { items, setItems, error, load } = useList<any>('posts');
  const { call } = useAdmin();
  const [edit, setEdit] = useState<any | null>(null);
  useEffect(() => { load(); }, [load]);
  if (edit) return <Editor post={edit} onBack={() => setEdit(null)} onSaved={it => { setItems(l => { const a = l || []; return a.some(x => x.ID === it.ID) ? a.map(x => x.ID === it.ID ? it : x) : [...a, it]; }); setEdit(it); }} />;
  const sorted = [...(items || [])].sort((a, b) => String(b.Ngay_Dang).localeCompare(String(a.Ngay_Dang)));
  return (
    <div>
      <AdminHeader title="Blog" sub="Viết bài bằng Markdown đơn giản. Bài “Đã đăng” có ngày đăng trong tương lai sẽ tự hiện đúng ngày." action={<Button onClick={() => setEdit({ Trang_Thai: 'Nháp', Ngon_Ngu: 'vi', Ngay_Dang: today(), Noi_Dung: '' })}><Plus className="h-4 w-4" />Viết bài mới</Button>} />
      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Loading /> : !sorted.length ? <Empty>Chưa có bài viết.</Empty> : (
        <ul className="divide-y rounded-md border bg-card">
          {sorted.map(p => {
            const live = p.Trang_Thai === 'Đã đăng' && String(p.Ngay_Dang) <= today();
            return (
              <li key={p.ID} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <Img src={p._img || p.Anh_Bia} scene fallbackKey={p.Slug} alt="" className="h-12 w-16 shrink-0 rounded-sm" />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEdit({ ...p })}>
                  <p className="truncate font-medium">{p.Tieu_De}</p>
                  <p className="truncate text-xs text-muted-foreground">/blog/{p.Slug} · {p.Ngay_Dang} · {String(p.Ngon_Ngu).toUpperCase()}</p>
                </button>
                <span className={cn('hidden rounded-sm border px-2 py-0.5 text-xs sm:inline', live ? 'border-success/30 bg-success/10 text-success' : p.Trang_Thai === 'Đã đăng' ? 'border-warning/30 bg-warning/10 text-warning' : 'bg-muted text-muted-foreground')}>{live ? 'Đang hiển thị' : p.Trang_Thai === 'Đã đăng' ? 'Hẹn đăng' : 'Nháp'}</span>
                <Button size="icon" variant="ghost" onClick={() => setEdit({ ...p })} aria-label="Sửa"><Pencil className="h-4 w-4" /></Button>
                <DeleteButton size="icon" onYes={async () => { const r = await call('delete', { collection: 'posts', id: p.ID }); if (!r.ok) toast.error(r.error || 'Lỗi'); else { setItems(l => (l || []).filter(x => x.ID !== p.ID)); notifySiteChanged(); toast.success('Đã xoá'); } }} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Editor({ post, onBack, onSaved }: { post: any; onBack: () => void; onSaved: (p: any) => void }) {
  const { call } = useAdmin();
  const [v, setV] = useState<any>(post); const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false); const [up, setUp] = useState(false); const [dirty, setDirty] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null); const file = useRef<HTMLInputElement>(null);
  const set = (k: string, val: any) => { setV((o: any) => ({ ...o, [k]: val })); setDirty(true); };
  const html = useMemo(() => renderMarkdown(v.Noi_Dung || '').replace(/src="(https:\/\/demo\.local\/[^"]+)"/g, (_: string, u: string) => 'src="' + resolveImg(u) + '"'), [v.Noi_Dung]);

  const wrap = (before: string, after = '', placeholder = 'chữ') => {
    const el = ta.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd, txt = v.Noi_Dung || '';
    const sel = txt.slice(s, e) || placeholder;
    const next = txt.slice(0, s) + before + sel + after + txt.slice(e);
    set('Noi_Dung', next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const line = (prefix: string) => {
    const el = ta.current; if (!el) return;
    const txt = v.Noi_Dung || ''; const s = el.selectionStart; const ls = txt.lastIndexOf('\n', s - 1) + 1;
    set('Noi_Dung', txt.slice(0, ls) + prefix + txt.slice(ls));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); });
  };
  const insertImage = async (f?: File) => {
    if (!f) return; setUp(true);
    try {
      const data = await compressImage(f, DEMO ? 1000 : 1600, DEMO ? 0.78 : 0.85);
      const r = await call<{ url: string }>('uploadImage', { data, mime: 'image/jpeg' });
      if (!r.ok) throw new Error(r.error);
      wrap('\n![', '](' + r.url + ')\n', 'mô tả ảnh');
    } catch (e: any) { toast.error(e?.message || 'Tải ảnh thất bại'); } finally { setUp(false); if (file.current) file.current.value = ''; }
  };
  const save = async (status?: string) => {
    setBusy(true);
    const item = { ...v, ...(status ? { Trang_Thai: status } : {}) };
    const r = await call<{ item: any }>('save', { collection: 'posts', item });
    setBusy(false);
    if (!r.ok) { toast.error(r.error || 'Lưu thất bại'); return; }
    setV(r.item); setDirty(false); onSaved(r.item); notifySiteChanged();
    toast.success(r.item.Trang_Thai === 'Đã đăng' ? 'Đã lưu & đăng bài' : 'Đã lưu nháp');
  };
  const tools: [any, string, () => void][] = [
    [Heading2, 'Tiêu đề lớn', () => line('## ')], [Heading3, 'Tiêu đề nhỏ', () => line('### ')], [Bold, 'In đậm', () => wrap('**', '**')], [Italic, 'In nghiêng', () => wrap('*', '*')],
    [List, 'Danh sách', () => line('- ')], [Quote, 'Trích dẫn', () => line('> ')], [Link2, 'Liên kết', () => wrap('[', '](https://)', 'chữ hiển thị')]
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />Danh sách bài</Button>
        <div className="flex flex-wrap gap-2">
          {dirty && <span className="self-center text-xs text-warning">Chưa lưu</span>}
          <Button variant="outline" onClick={() => save('Nháp')} disabled={busy}>Lưu nháp</Button>
          <Button onClick={() => save('Đã đăng')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{v.Trang_Thai === 'Đã đăng' ? 'Cập nhật bài' : 'Đăng bài'}</Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Input value={v.Tieu_De || ''} onChange={e => set('Tieu_De', e.target.value)} placeholder="Tiêu đề bài viết" className="h-12 font-serif text-xl" aria-label="Tiêu đề" />
          <Textarea value={v.Tom_Tat || ''} onChange={e => set('Tom_Tat', e.target.value)} placeholder="Tóm tắt ngắn (hiện ở danh sách bài & Google)" rows={2} maxLength={400} aria-label="Tóm tắt" />
          <div className="rounded-md border bg-card">
            <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
              <div className="mr-2 inline-flex rounded-sm border p-0.5">{(['write', 'preview'] as const).map(k => <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cn('inline-flex items-center gap-1.5 rounded-[1px] px-3 py-1 text-sm', tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{k === 'write' ? <><Pencil className="h-3.5 w-3.5" />Viết</> : <><Eye className="h-3.5 w-3.5" />Xem trước</>}</button>)}</div>
              {tab === 'write' && tools.map(([I, label, fn]) => <Button key={label} type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={fn} title={label} aria-label={label}><I className="h-4 w-4" /></Button>)}
              {tab === 'write' && <><input ref={file} type="file" accept="image/*" className="hidden" onChange={e => insertImage(e.target.files?.[0])} /><Button type="button" size="sm" variant="ghost" onClick={() => file.current?.click()} disabled={up}>{up ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Chèn ảnh</Button></>}
            </div>
            {tab === 'write'
              ? <Textarea ref={ta} value={v.Noi_Dung || ''} onChange={e => set('Noi_Dung', e.target.value)} rows={20} className="min-h-[24rem] resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Nội dung" placeholder={'## Tiêu đề mục\nViết nội dung… **in đậm**, *nghiêng*, - danh sách'} />
              : <div className="prose-sy min-h-[24rem] p-5" dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted-foreground">Chưa có nội dung.</p>' }} />}
          </div>
        </div>
        <aside className="space-y-5">
          <ImageField label="Ảnh bìa" value={v.Anh_Bia || ''} onChange={u => set('Anh_Bia', u)} fallbackKey={v.Slug} aspect="aspect-[16/10]" />
          <Field label="Đường dẫn (slug)" hint="Để trống để tự tạo từ tiêu đề"><Input value={v.Slug || ''} onChange={e => set('Slug', e.target.value)} placeholder="tu-dong-tao" /></Field>
          <Field label="Ngôn ngữ bài viết"><Select value={v.Ngon_Ngu || 'vi'} onChange={x => set('Ngon_Ngu', x)} options={[['vi', 'Tiếng Việt'], ['en', 'English']]} className="w-full" /></Field>
          <Field label="Ngày đăng"><Input type="date" value={v.Ngay_Dang || ''} onChange={e => set('Ngay_Dang', e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">Trạng thái: <span className="font-medium text-foreground">{v.Trang_Thai || 'Nháp'}</span>{v.ID && <> · {v.ID}</>}</p>
        </aside>
      </div>
    </div>
  );
}
