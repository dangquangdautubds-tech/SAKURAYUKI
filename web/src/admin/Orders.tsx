import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Mail, Phone, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { yen } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Empty, ErrorState, Loading, StatusBadge } from '@/components/common';
import { useAdmin, useList } from './ctx';
import { AdminHeader, Select } from './ui';
import { cn } from '@/lib/utils';

export type Order = {
  id: string; createdAt: string; name: string; email: string; phone: string; social: string; date: string; time: string; guests: number;
  product: string; productId: string; hair: string; deposit: number; status: string; branchId: string; detail: string; note: string;
  lang: string; source: string; payment: string; reminded: string; updatedAt: string;
};
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export function useOrders() {
  const { call } = useAdmin();
  const [orders, setOrders] = useState<Order[] | null>(null); const [statuses, setStatuses] = useState<string[]>([]); const [error, setError] = useState('');
  const load = async () => {
    setError('');
    const r = await call<{ orders: Order[]; statuses: string[] }>('listOrders');
    if (r.ok) { setOrders(r.orders); setStatuses(r.statuses); } else setError(r.error || 'Lỗi tải đơn');
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { orders, setOrders, statuses, error, load };
}

const csvCell = (v: any) => { const s = String(v ?? ''); return /[",\n;]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };

export default function Orders() {
  const { call } = useAdmin();
  const { orders, setOrders, statuses, error, load } = useOrders();
  const { items: branches, load: loadBranches } = useList<any>('branches');
  useEffect(() => { loadBranches(); }, [loadBranches]);
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [branch, setBranch] = useState(''); const [range, setRange] = useState('upcoming');
  const [open, setOpen] = useState<Order | null>(null); const [saving, setSaving] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const bName = (id: string) => branches?.find(b => b.ID === id)?.Ten || id;

  const list = useMemo(() => {
    const t = today(); const norm = (s: string) => s.toLowerCase();
    return (orders || []).filter(o => {
      if (status && o.status !== status) return false;
      if (branch && o.branchId !== branch) return false;
      if (range === 'today' && o.date !== t) return false;
      if (range === 'tomorrow' && o.date !== addDays(t, 1)) return false;
      if (range === 'upcoming' && o.date < t) return false;
      if (range === 'week' && (o.date < t || o.date > addDays(t, 6))) return false;
      if (range === 'past' && o.date >= t) return false;
      if (q && !norm([o.id, o.name, o.email, o.phone, o.social, o.product, o.source].join(' ')).includes(norm(q))) return false;
      return true;
    }).sort((a, b) => range === 'past' || range === 'all' ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time));
  }, [orders, q, status, branch, range]);

  const setOrderStatus = async (o: Order, s: string) => {
    setSaving(o.id);
    const r = await call('updateOrderStatus', { orderId: o.id, status: s });
    setSaving('');
    if (!r.ok) { toast.error(r.error || 'Lỗi cập nhật'); return; }
    setOrders(l => (l || []).map(x => x.id === o.id ? { ...x, status: s } : x));
    setOpen(x => x && x.id === o.id ? { ...x, status: s } : x);
    toast.success(`${o.id}: ${s}`);
  };

  const exportCsv = () => {
    const head = ['Mã đơn', 'Đặt lúc', 'Ngày hẹn', 'Giờ', 'Chi nhánh', 'Khách', 'Email', 'SĐT', 'MXH', 'Số khách', 'Chi tiết', 'Gói', 'Làm tóc', 'Cọc', 'Trạng thái', 'Thanh toán', 'Nguồn', 'Ngôn ngữ', 'Ghi chú'];
    const rows = list.map(o => [o.id, o.createdAt, o.date, o.time, bName(o.branchId), o.name, o.email, o.phone, o.social, o.guests, o.detail, o.product, o.hair, o.deposit, o.status, o.payment, o.source, o.lang, o.note]);
    const csv = '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `don-hang-${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <div>
      <AdminHeader title="Đơn hàng" sub="Đổi trạng thái sẽ tự gửi email cho khách (nếu bật trong Cài đặt)."
        action={<div className="flex gap-2"><Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />Làm mới</Button><Button variant="outline" onClick={exportCsv} disabled={!list.length}><Download className="h-4 w-4" />Xuất CSV</Button></div>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm mã đơn, tên, email, SĐT…" className="pl-9" aria-label="Tìm đơn" /></div>
        <Select value={range} onChange={setRange} aria-label="Thời gian" options={[['upcoming', 'Sắp tới'], ['today', 'Hôm nay'], ['tomorrow', 'Ngày mai'], ['week', '7 ngày tới'], ['past', 'Đã qua'], ['all', 'Tất cả']]} />
        <Select value={status} onChange={setStatus} aria-label="Trạng thái" options={[['', 'Mọi trạng thái'], ...statuses.map(s => [s, s] as [string, string])]} />
        <Select value={branch} onChange={setBranch} aria-label="Chi nhánh" options={[['', 'Mọi chi nhánh'], ...(branches || []).map(b => [b.ID, b.Ten] as [string, string])]} />
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !orders ? <Loading /> : !list.length ? <Empty>Không có đơn phù hợp.</Empty> : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{list.length} đơn · {list.reduce((s, o) => s + (o.status === 'Đã huỷ' ? 0 : o.guests), 0)} khách</p>
          {/* điện thoại: thẻ; máy tính: bảng */}
          <ul className="space-y-2 md:hidden">
            {list.map(o => (
              <li key={o.id}>
                <button type="button" onClick={() => setOpen(o)} className="w-full rounded-md border bg-card p-4 text-left">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{o.id}</span><StatusBadge status={o.status} label={o.status} /></div>
                  <p className="mt-2 font-medium">{o.name} · {o.guests} khách</p>
                  <p className="text-sm text-muted-foreground">{o.date} {o.time} · {bName(o.branchId)} · {o.product}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-md border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/50 text-left text-xs text-muted-foreground"><tr>{['Ngày giờ', 'Khách', 'Gói', 'Chi nhánh', 'Cọc', 'Nguồn', 'Trạng thái'].map(h => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {list.map(o => (
                  <tr key={o.id} className="hover:bg-secondary/30">
                    <td className="whitespace-nowrap px-3 py-2.5"><button type="button" className="text-left" onClick={() => setOpen(o)}><span className="font-medium tabular-nums">{o.date} {o.time}</span><span className="block font-mono text-[0.6875rem] text-muted-foreground">{o.id}</span></button></td>
                    <td className="px-3 py-2.5"><button type="button" className="text-left hover:text-primary" onClick={() => setOpen(o)}>{o.name}<span className="block text-xs text-muted-foreground">{o.guests} khách · {o.detail}</span></button></td>
                    <td className="px-3 py-2.5">{o.product}{o.hair === 'Có' && <span className="block text-xs text-muted-foreground">+ làm tóc</span>}</td>
                    <td className="px-3 py-2.5">{bName(o.branchId)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{yen(o.deposit)}{o.payment && <span className="block text-xs text-success">đã trả</span>}</td>
                    <td className="px-3 py-2.5 text-xs">{o.source}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Select value={o.status} onChange={s => setOrderStatus(o, s)} options={statuses} className="h-8 text-xs" aria-label={'Trạng thái ' + o.id} />
                        {saving === o.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Dialog open={!!open} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          {open && <>
            <DialogTitle className="font-mono text-base">{open.id}</DialogTitle>
            <DialogDescription>Đặt lúc {open.createdAt} · cập nhật {open.updatedAt}</DialogDescription>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
              {([['Khách', open.name], ['Hẹn', `${open.date} · ${open.time}`], ['Chi nhánh', bName(open.branchId)], ['Gói', open.product], ['Số khách', `${open.guests} (${open.detail})`], ['Làm tóc', open.hair],
                ['Tiền cọc', yen(open.deposit)], ['Thanh toán', open.payment || '—'], ['MXH', open.social || '—'], ['Ngôn ngữ', open.lang.toUpperCase()], ['Nguồn', open.source], ['Nhắc lịch', open.reminded || '—'], ['Ghi chú', open.note || '—']] as const)
                .map(([k, val]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="whitespace-pre-line break-words">{val}</dd></div>)}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><a href={'mailto:' + open.email}><Mail className="h-4 w-4" />{open.email}</a></Button>
              <Button asChild size="sm" variant="outline"><a href={'tel:' + open.phone.replace(/[^\d+]/g, '')}><Phone className="h-4 w-4" />{open.phone}</a></Button>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium">Đổi trạng thái</p>
              <div className="flex flex-wrap gap-2">{statuses.map(s => <Button key={s} size="sm" variant={open.status === s ? 'default' : 'outline'} disabled={saving === open.id} onClick={() => open.status !== s && setOrderStatus(open, s)}>{s}</Button>)}</div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
