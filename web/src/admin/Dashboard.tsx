import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Globe, Loader2, TrendingUp, Users, Wallet } from 'lucide-react';
import { yen } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { ErrorState, Loading, StatusBadge } from '@/components/common';
import { useAdmin, useList } from './ctx';
import { useOrders, type Order } from './Orders';
import { AdminHeader, Panel } from './ui';
import { cn } from '@/lib/utils';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nf = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Biểu đồ cột 1 chuỗi (màu chính), có tooltip khi rê/chạm và chế độ xem bảng */
function Columns({ data, label, unit }: { data: { key: string; value: number }[]; label: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null); const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map(d => d.value));
  const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = Math.ceil(max / p); return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
  const H = 160;
  return (
    <div>
      <div className="mb-2 flex justify-end"><button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setTable(v => !v)}>{table ? 'Xem biểu đồ' : 'Xem dạng bảng'}</button></div>
      {table ? (
        <div className="max-h-64 overflow-y-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Ngày</th><th className="py-1 text-right">{label}</th></tr></thead>
          <tbody className="divide-y">{data.map(d => <tr key={d.key}><td className="py-1 tabular-nums">{d.key}</td><td className="py-1 text-right tabular-nums">{nf(d.value)}</td></tr>)}</tbody></table></div>
      ) : (
        <div className="relative" role="img" aria-label={`${label} theo ngày`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between text-[0.625rem] text-muted-foreground" style={{ height: H }}>
            {[nice, nice / 2, 0].map(v => <div key={v} className="flex items-center gap-2"><span className="w-8 text-right tabular-nums">{nf(v)}</span><span className="h-px flex-1 bg-border" /></div>)}
          </div>
          <div className="relative ml-10 flex items-end gap-[2px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <button key={d.key} type="button" className="group relative flex h-full flex-1 items-end focus:outline-none" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} aria-label={`${d.key}: ${d.value} ${unit}`}>
                <span className={cn('block w-full rounded-t-[4px] bg-primary transition-opacity', hover !== null && hover !== i && 'opacity-40')} style={{ height: Math.max(d.value ? 2 : 0, (d.value / nice) * H) }} />
              </button>
            ))}
            {hover !== null && data[hover] && (
              <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border bg-popover px-2.5 py-1.5 text-xs shadow-soft" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
                <p className="text-muted-foreground">{data[hover].key}</p><p className="font-medium tabular-nums">{nf(data[hover].value)} {unit}</p>
              </div>
            )}
          </div>
          <div className="ml-10 mt-1 flex justify-between text-[0.625rem] tabular-nums text-muted-foreground"><span>{data[0]?.key.slice(5)}</span><span>{data[data.length - 1]?.key.slice(5)}</span></div>
        </div>
      )}
    </div>
  );
}

/** Thanh ngang có nhãn trực tiếp (xếp hạng nguồn, quốc gia…) */
function Bars({ rows, unit }: { rows: { key: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map(r => r.value)); const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map(r => (
        <li key={r.key} title={`${r.key}: ${nf(r.value)} ${unit}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{r.key}</span><span className="shrink-0 tabular-nums text-muted-foreground">{nf(r.value)} · {Math.round((r.value / total) * 100)}%</span></div>
          <div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function group(orders: Order[], key: (o: Order) => string) {
  const m = new Map<string, number>(); orders.forEach(o => { const k = key(o) || '(không rõ)'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}

function Traffic() {
  const { call } = useAdmin();
  const [days, setDays] = useState(30); const [data, setData] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { setBusy(true); call('analytics', { days }).then(r => { setData(r); setBusy(false); }); }, [days, call]);
  const tabs = <div className="inline-flex rounded-sm border p-0.5">{[7, 30, 90].map(d => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn('rounded-[1px] px-2.5 py-1 text-xs', days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{d} ngày</button>)}</div>;
  if (!data) return <Panel title="Lượt truy cập website" action={tabs}><Loading /></Panel>;
  if (!data.ok) return <Panel title="Lượt truy cập website" action={tabs}><ErrorState message={data.error} /></Panel>;
  if (!data.configured) return (
    <Panel title="Lượt truy cập website">
      <p className="text-sm text-muted-foreground">Chưa kết nối Cloudflare Web Analytics. Làm theo mục <b>“Báo cáo lượt truy cập”</b> trong README: bật Web Analytics cho tên miền, tạo API token quyền <i>Account Analytics: Read</i>, rồi lưu CF_API_TOKEN, CF_ACCOUNT_ID, CF_SITE_TAG vào Script Properties.</p>
    </Panel>
  );
  const pick = (arr: any[]) => (arr || []).map((x: any) => ({ key: x.key, value: x.visits ?? x.views }));
  const visits = pick(data.byDate); const total = visits.reduce((s: number, x: any) => s + x.value, 0);
  const views = (data.byDate || []).reduce((s: number, x: any) => s + x.views, 0);
  return (
    <div className="space-y-4">
      <Panel title={<span className="flex items-center gap-2">Lượt truy cập website {data.sample && <span className="rounded-sm bg-gold/20 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase">Dữ liệu mẫu</span>}{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</span>} action={tabs}>
        <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm"><p><span className="font-serif text-2xl tabular-nums">{nf(total)}</span> <span className="text-muted-foreground">lượt ghé</span></p><p><span className="font-serif text-2xl tabular-nums">{nf(views)}</span> <span className="text-muted-foreground">lượt xem trang</span></p></div>
        <Columns data={visits} label="Lượt ghé" unit="lượt" />
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Khách đến từ đâu (trang giới thiệu)"><Bars rows={pick(data.byReferer).slice(0, 8)} unit="lượt" /></Panel>
        <Panel title="Quốc gia"><Bars rows={pick(data.byCountry).slice(0, 8)} unit="lượt" /></Panel>
        <Panel title="Trang được xem nhiều"><Bars rows={pick(data.byPath).slice(0, 8)} unit="lượt" /></Panel>
        <Panel title="Thiết bị"><Bars rows={pick(data.byDevice)} unit="lượt" /></Panel>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { orders, error, load } = useOrders();
  const { items: branches, load: lb } = useList<any>('branches');
  useEffect(() => { lb(); }, [lb]);
  const t = today();
  const stats = useMemo(() => {
    if (!orders) return null;
    const live = orders.filter(o => o.status !== 'Đã huỷ');
    const since = addDays(t, -29);
    const last30 = live.filter(o => o.createdAt.slice(0, 10) >= since);
    const byDay: { key: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) { const d = addDays(t, -i); byDay.push({ key: d, value: last30.filter(o => o.createdAt.slice(0, 10) === d).length }); }
    return {
      todayGuests: live.filter(o => o.date === t).reduce((s, o) => s + o.guests, 0), todayCount: live.filter(o => o.date === t).length,
      week: live.filter(o => o.date >= t && o.date <= addDays(t, 6)),
      pending: orders.filter(o => o.status === 'Chờ xác nhận').length,
      deposits: last30.filter(o => o.payment).reduce((s, o) => s + o.deposit, 0),
      count30: last30.length, guests30: last30.reduce((s, o) => s + o.guests, 0),
      cancelRate: (() => { const all = orders.filter(o => o.createdAt.slice(0, 10) >= since); return all.length ? Math.round(100 * all.filter(o => o.status === 'Đã huỷ').length / all.length) : 0; })(),
      byDay, sources: group(last30, o => o.source.split(' / ')[0]), langs: group(last30, o => ({ vi: 'Tiếng Việt', en: 'English', ja: '日本語' } as any)[o.lang] || o.lang),
      upcoming: live.filter(o => o.date >= t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6)
    };
  }, [orders, t]);
  const bName = (id: string) => branches?.find(b => b.ID === id)?.Ten || id;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <Loading />;
  return (
    <div className="space-y-6">
      <AdminHeader title="Tổng quan" sub={`Hôm nay ${t} (giờ Nhật)`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Khách hôm nay" value={String(stats.todayGuests)} sub={`${stats.todayCount} đơn`} />
        <Kpi icon={CalendarDays} label="Đơn 7 ngày tới" value={String(stats.week.length)} sub={`${stats.week.reduce((s, o) => s + o.guests, 0)} khách · ${stats.pending} chờ xác nhận`} />
        <Kpi icon={TrendingUp} label="Đơn mới 30 ngày" value={String(stats.count30)} sub={`${stats.guests30} khách · huỷ ${stats.cancelRate}%`} />
        <Kpi icon={Wallet} label="Cọc đã nhận 30 ngày" value={yen(stats.deposits)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Đơn đặt mới theo ngày (30 ngày)"><Columns data={stats.byDay} label="Số đơn" unit="đơn" /></Panel>
        <Panel title="Đơn theo nguồn khách (30 ngày)"><Bars rows={stats.sources.slice(0, 7)} unit="đơn" /></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Lịch hẹn sắp tới" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/don-hang">Tất cả<ArrowRight className="h-4 w-4" /></Link></Button>}>
          {stats.upcoming.length ? <ul className="divide-y">{stats.upcoming.map(o => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><p className="font-medium tabular-nums">{o.date} {o.time} · {o.name}</p><p className="truncate text-xs text-muted-foreground">{bName(o.branchId)} · {o.guests} khách · {o.product}</p></div>
              <StatusBadge status={o.status} label={o.status} />
            </li>
          ))}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">Chưa có lịch hẹn.</p>}
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Globe className="h-4 w-4" />Ngôn ngữ khách đặt</span>}><Bars rows={stats.langs} unit="đơn" /></Panel>
      </div>
      <Traffic />
    </div>
  );
}
