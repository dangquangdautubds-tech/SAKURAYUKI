import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { notifySiteChanged } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Loading, ErrorState, Empty } from '@/components/common';
import { Img } from '@/components/Img';
import { useAdmin, useList } from './ctx';
import { AdminHeader, DeleteButton, Field, ImageField, MultiImageField, Select, Toggle } from './ui';
import { cn } from '@/lib/utils';

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'time' | 'date'; hint?: string; required?: boolean; half?: boolean; rows?: number; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: (string | [string, string])[]; hint?: string; half?: boolean }
  | { key: string; label: string; type: 'bool'; hint?: string; half?: boolean }
  | { key: string; label: string; type: 'image'; hint?: string; aspect?: string }
  | { key: string; label: string; type: 'images'; hint?: string; max?: number }
  | { key: string; label: string; type: 'custom'; render: (v: any, set: (v: any) => void, item: any) => ReactNode; hint?: string };

export type CrudConfig = {
  collection: string; title: string; sub?: string; singular: string;
  fields: FieldDef[]; groups?: { title: string; keys: string[] }[];
  defaults?: Record<string, any>;
  row: (it: any) => { title: ReactNode; meta?: ReactNode; image?: string; fallbackKey?: string; badge?: ReactNode };
  visibleKey?: string; search?: (it: any) => string; filters?: ReactNode;
  filter?: (it: any) => boolean;
};

export function CrudPage({ cfg, extraFilter }: { cfg: CrudConfig; extraFilter?: (it: any) => boolean }) {
  const { call } = useAdmin();
  const { items, setItems, error, load } = useList<any>(cfg.collection);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [busyRow, setBusyRow] = useState('');
  useEffect(() => { load(); }, [load]);

  const save = async (item: any) => {
    const r = await call<{ item: any; created: boolean }>('save', { collection: cfg.collection, item });
    if (!r.ok) { toast.error(r.error || 'Lưu thất bại'); return false; }
    setItems(list => { const l = list || []; return r.created ? [...l, r.item] : l.map(x => x.ID === r.item.ID ? r.item : x); });
    toast.success(r.created ? 'Đã thêm' : 'Đã lưu'); notifySiteChanged();
    return true;
  };
  const remove = async (id: string) => {
    const r = await call('delete', { collection: cfg.collection, id });
    if (!r.ok) { toast.error(r.error || 'Xoá thất bại'); return; }
    setItems(l => (l || []).filter(x => x.ID !== id)); toast.success('Đã xoá'); notifySiteChanged();
  };
  const move = async (i: number, d: -1 | 1) => {
    if (!items) return;
    const arr = [...items]; const j = i + d; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setItems(arr);
    const r = await call('reorder', { collection: cfg.collection, ids: arr.map(x => x.ID) });
    if (!r.ok) { toast.error(r.error || 'Lỗi sắp xếp'); load(); } else notifySiteChanged();
  };
  const toggleVisible = async (it: any) => {
    setBusyRow(it.ID);
    await save({ ...it, [cfg.visibleKey!]: !truthy(it[cfg.visibleKey!]) });
    setBusyRow('');
  };

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const shown = (items || []).map((it, i) => ({ it, i })).filter(({ it }) => (!q || norm(cfg.search ? cfg.search(it) : JSON.stringify(it)).includes(norm(q))) && (!extraFilter || extraFilter(it)));
  const canReorder = !q && !extraFilter;

  return (
    <div>
      <AdminHeader title={cfg.title} sub={cfg.sub} action={<Button onClick={() => setEdit({ ...(cfg.defaults || {}) })}><Plus className="h-4 w-4" />Thêm {cfg.singular}</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm…" className="pl-9" aria-label="Tìm" /></div>
        {cfg.filters}
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Loading /> : !shown.length ? <Empty>Chưa có {cfg.singular} nào.</Empty> : (
        <ul className="divide-y rounded-md border bg-card">
          {shown.map(({ it, i }) => {
            const r = cfg.row(it);
            return (
              <li key={it.ID} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                {canReorder && (
                  <div className="flex flex-col">
                    <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Xuống"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                {r.image !== undefined && <ImgThumb src={r.image} k={r.fallbackKey} />}
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEdit({ ...it })}>
                  <p className="truncate font-medium">{r.title}</p>
                  {r.meta && <p className="truncate text-xs text-muted-foreground">{r.meta}</p>}
                </button>
                {r.badge}
                {cfg.visibleKey && (busyRow === it.ID ? <Loader2 className="h-4 w-4 animate-spin" /> : <Toggle checked={truthy(it[cfg.visibleKey])} onChange={() => toggleVisible(it)} label="Hiển thị" />)}
                <Button size="icon" variant="ghost" onClick={() => setEdit({ ...it })} aria-label="Sửa"><Pencil className="h-4 w-4" /></Button>
                <DeleteButton size="icon" onYes={() => remove(it.ID)} />
              </li>
            );
          })}
        </ul>
      )}
      <EditDialog cfg={cfg} item={edit} onClose={() => setEdit(null)} onSave={async it => { if (await save(it)) setEdit(null); }} />
    </div>
  );
}

function ImgThumb({ src, k }: { src: string; k?: string }) { return <Img src={src} fallbackKey={k} alt="" className="h-14 w-11 shrink-0 rounded-sm" />; }

export const truthy = (v: any) => v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1' || v === 'Có';

function EditDialog({ cfg, item, onClose, onSave }: { cfg: CrudConfig; item: any | null; onClose: () => void; onSave: (it: any) => Promise<void> }) {
  const [v, setV] = useState<any>({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (item) setV(item); }, [item]);
  const set = (k: string, val: any) => setV((o: any) => ({ ...o, [k]: val }));
  const byKey = Object.fromEntries(cfg.fields.map(f => [f.key, f]));
  const groups = cfg.groups || [{ title: '', keys: cfg.fields.map(f => f.key) }];
  return (
    <Dialog open={!!item} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogTitle className="font-serif text-xl font-medium">{v.ID ? 'Sửa ' + cfg.singular + ' · ' + v.ID : 'Thêm ' + cfg.singular}</DialogTitle>
        <DialogDescription className="sr-only">Biểu mẫu {cfg.singular}</DialogDescription>
        <form className="space-y-6" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await onSave(v); } finally { setBusy(false); } }}>
          {groups.map(g => (
            <fieldset key={g.title} className="space-y-4">
              {g.title && <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{g.title}</legend>}
              <div className="grid gap-4 sm:grid-cols-2">{g.keys.map(k => byKey[k] && <FieldInput key={k} f={byKey[k]} v={v} set={set} />)}</div>
            </fieldset>
          ))}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t bg-background px-6 py-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Lưu</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ f, v, set }: { f: FieldDef; v: any; set: (k: string, val: any) => void }) {
  const val = v[f.key] ?? '';
  const full = !('half' in f && f.half);
  const cls = cn(full && 'sm:col-span-2');
  if (f.type === 'image') return <div className={cls}><ImageField label={f.label} value={val} onChange={u => set(f.key, u)} fallbackKey={v.ID} aspect={f.aspect} />{f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}</div>;
  if (f.type === 'images') return <div className={cls}><MultiImageField label={f.label} value={val} onChange={u => set(f.key, u)} fallbackKey={v.ID} max={f.max} /></div>;
  if (f.type === 'custom') return <Field label={f.label} hint={f.hint} className={cls}>{f.render(val, x => set(f.key, x), v)}</Field>;
  if (f.type === 'bool') return <Field label={f.label} hint={f.hint} className={cls}><div><Toggle checked={truthy(val === '' ? true : val)} onChange={x => set(f.key, x)} label={f.label} /></div></Field>;
  if (f.type === 'select') return <Field label={f.label} hint={f.hint} className={cls}><Select value={String(val || (Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]))} onChange={x => set(f.key, x)} options={f.options} className="w-full" aria-label={f.label} /></Field>;
  if (f.type === 'textarea') return <Field label={f.label + (f.required ? ' *' : '')} hint={f.hint} className={cls}><Textarea value={val} onChange={e => set(f.key, e.target.value)} rows={f.rows || 3} placeholder={f.placeholder} /></Field>;
  return <Field label={f.label + (f.required ? ' *' : '')} hint={f.hint} className={cls}><Input type={f.type === 'number' ? 'number' : f.type === 'time' ? 'time' : f.type === 'date' ? 'date' : 'text'} value={val} onChange={e => set(f.key, e.target.value)} required={f.required} placeholder={f.placeholder} /></Field>;
}
