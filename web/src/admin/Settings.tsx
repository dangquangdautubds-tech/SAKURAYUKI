import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleX, Loader2, RotateCcw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { DEMO } from '@/lib/config';
import { notifySiteChanged } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState, Loading } from '@/components/common';
import { useAdmin } from './ctx';
import { AdminHeader, Field, Panel, Select, Toggle } from './ui';
import { cn } from '@/lib/utils';

type SchemaItem = { key: string; type: string; group: string; label: string };
const GROUP_ORDER = ['Đặt lịch', 'Thanh toán', 'Thông báo', 'Giao diện', 'Nội dung trang chủ', 'Nội dung trang con', 'Thông tin tiệm', 'Mạng xã hội', 'Kỹ thuật'];
const SELECT_LABEL: Record<string, string> = { light: 'Sáng', dark: 'Tối', auto: 'Theo máy khách' };

function Status({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    </li>
  );
}

export default function Settings() {
  const { call } = useAdmin();
  const [data, setData] = useState<any>(null); const [values, setValues] = useState<Record<string, any>>({}); const [error, setError] = useState('');
  const [saving, setSaving] = useState(false); const [group, setGroup] = useState(GROUP_ORDER[0]);
  const load = async () => { const r = await call<any>('getSettings'); if (r.ok) { setData(r); setValues(r.settings); } else setError(r.error || 'Lỗi'); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = useMemo(() => data ? Object.keys(values).filter(k => String(values[k]) !== String(data.settings[k])) : [], [values, data]);
  const save = async () => {
    setSaving(true);
    const r = await call<any>('saveSettings', { values: Object.fromEntries(changed.map(k => [k, values[k]])) });
    setSaving(false);
    if (!r.ok) { toast.error(r.error || 'Lưu thất bại'); return; }
    setData((d: any) => ({ ...d, settings: r.settings })); setValues(r.settings); notifySiteChanged(); toast.success('Đã lưu cài đặt');
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;
  const schema: SchemaItem[] = data.schema;
  const groups = GROUP_ORDER.filter(g => schema.some(s => s.group === g));
  const st = data.status;
  const set = (k: string, v: any) => setValues(o => ({ ...o, [k]: v }));

  return (
    <div className="space-y-6 pb-20">
      <AdminHeader title="Cài đặt" sub="Bật/tắt tính năng và chỉnh nội dung — website cập nhật sau khoảng 1 phút."
        action={<Button onClick={save} disabled={!changed.length || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu {changed.length ? `(${changed.length})` : ''}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
            {groups.map(g => <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={cn('whitespace-nowrap rounded-sm border px-3 py-1.5 text-sm', group === g ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{g}</button>)}
          </div>
          {group === 'Nội dung trang chủ' && <p className="mb-3 rounded-sm bg-secondary px-3 py-2 text-xs text-muted-foreground">Sửa chữ hiển thị trên trang chủ cho từng ngôn ngữ. Ô để trống sẽ dùng câu mặc định của website. Ảnh bìa và các ảnh lớn đổi ở mục “Ảnh &amp; album”.</p>}
          {group === 'Nội dung trang con' && <p className="mb-3 rounded-sm bg-secondary px-3 py-2 text-xs text-muted-foreground">Chữ trên các trang Gói thuê, Bảng giá, Chụp ảnh, Liên hệ. Ô dạng danh sách: viết <b>mỗi dòng một ý</b>; nếu dòng có dấu <b>|</b> thì phần trước dấu là tiêu đề, phần sau là nội dung. Ô để trống sẽ dùng câu mặc định.</p>}
          <Panel>
            <div className="divide-y">
              {schema.filter(s => s.group === group).map(s => {
                const v = values[s.key];
                const dirty = changed.includes(s.key);
                const label = <>{s.label}{dirty && <span className="ml-2 text-xs text-warning">● đã sửa</span>}</>;
                if (s.type === 'bool') return (
                  <label key={s.key} className="flex cursor-pointer items-center justify-between gap-4 py-3.5"><span className="text-sm">{label}</span><Toggle checked={!!v} onChange={x => set(s.key, x)} label={s.label} /></label>
                );
                return (
                  <div key={s.key} className="py-3.5">
                    <Field label={s.label + (dirty ? ' ●' : '')}>
                      {s.type === 'textarea' ? <Textarea value={v ?? ''} onChange={e => set(s.key, e.target.value)} rows={3} />
                        : s.type.startsWith('select:') ? <Select value={String(v)} onChange={x => set(s.key, x)} options={s.type.slice(7).split('|').map(o => [o, SELECT_LABEL[o] || o] as [string, string])} className="w-full sm:w-64" />
                        : <Input type={s.type === 'number' ? 'number' : s.type === 'time' ? 'time' : 'text'} value={v ?? ''} onChange={e => set(s.key, s.type === 'number' ? e.target.value : e.target.value)} className={s.type === 'number' || s.type === 'time' ? 'w-40' : ''} />}
                    </Field>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Kết nối">
            <ul className="space-y-3">
              <Status ok={st.telegram} label="Telegram" hint={st.telegram ? 'Báo đơn mới vào nhóm' : 'Thêm TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID'} />
              <Status ok={st.line} label="LINE" hint={st.line ? 'Gói miễn phí 200 tin/tháng' : 'Thêm LINE_CHANNEL_TOKEN & LINE_ADMIN_ID'} />
              <Status ok={st.emailQuota !== null} label="Gmail" hint={st.emailQuota !== null ? `Còn ${st.emailQuota} email hôm nay` : 'Chưa cấp quyền gửi mail'} />
              <Status ok={st.worker} label="Thanh toán online (Stripe)" hint={st.worker ? 'Worker đã kết nối' : 'Thêm WORKER_SECRET (README)'} />
              <Status ok={st.reminderTrigger} label="Nhắc lịch tự động" hint={st.reminderTrigger ? `Gửi lúc ${values.reminder_hour}:00 mỗi ngày` : 'Chạy hàm setup để cài trigger'} />
              <Status ok={st.analytics} label="Báo cáo lượt truy cập" hint={st.analytics ? 'Cloudflare Web Analytics' : 'Thêm CF_API_TOKEN, CF_ACCOUNT_ID, CF_SITE_TAG'} />
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Khoá bí mật lưu trong Script Properties của Apps Script, không hiển thị ở đây.</p>
          </Panel>
          <Tools />
          <PasswordPanel />
          {DEMO && <DemoPanel />}
        </aside>
      </div>
      {changed.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
          <Button className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Lưu {changed.length} thay đổi</Button>
        </div>
      )}
    </div>
  );
}

function Tools() {
  const { call } = useAdmin(); const [busy, setBusy] = useState('');
  const test = async () => {
    setBusy('test'); const r = await call<any>('testNotify'); setBusy('');
    if (!r.ok) { toast.error(r.error || 'Lỗi'); return; }
    const x = r.result; toast.success(`Telegram: ${x.telegram ? 'OK' : '—'} · LINE: ${x.line ? 'OK' : '—'} · Email: ${x.email ? 'OK' : '—'}`);
  };
  const remind = async () => { setBusy('rem'); const r = await call<any>('runReminders'); setBusy(''); r.ok ? toast.success(`Đã gửi ${r.sent} email nhắc lịch cho ngày mai`) : toast.error(r.error || 'Lỗi'); };
  return (
    <Panel title="Công cụ">
      <div className="grid gap-2">
        <Button variant="outline" onClick={test} disabled={!!busy}>{busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Gửi thử thông báo</Button>
        <Button variant="outline" onClick={remind} disabled={!!busy}>{busy === 'rem' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Gửi nhắc lịch ngày mai ngay</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Nhắc lịch chỉ gửi 1 lần mỗi đơn (đơn “Chờ xác nhận” hoặc “Đã nhận cọc”).</p>
    </Panel>
  );
}

function PasswordPanel() {
  const { call } = useAdmin(); const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 10) { toast.error('Mật khẩu mới cần ít nhất 10 ký tự'); return; }
    setBusy(true); const r = await call('changePassword', { current: cur, next }); setBusy(false);
    if (!r.ok) { toast.error(r.error || 'Lỗi'); return; }
    setCur(''); setNext(''); toast.success('Đã đổi mật khẩu');
  };
  return (
    <Panel title="Đổi mật khẩu quản trị">
      <form onSubmit={submit} className="space-y-3">
        <Input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Mật khẩu hiện tại" autoComplete="current-password" aria-label="Mật khẩu hiện tại" />
        <Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="Mật khẩu mới (≥ 10 ký tự)" autoComplete="new-password" aria-label="Mật khẩu mới" />
        <Button type="submit" variant="outline" className="w-full" disabled={busy || !cur || !next}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Đổi mật khẩu</Button>
      </form>
    </Panel>
  );
}

function DemoPanel() {
  const [box, setBox] = useState<any[]>([]); const [open, setOpen] = useState<number | null>(null);
  const refresh = async () => { const m = await import('../demo/demoBackend'); setBox(m.demoOutbox()); };
  useEffect(() => { refresh(); const id = setInterval(refresh, 3000); return () => clearInterval(id); }, []);
  const reset = async () => { const m = await import('../demo/demoBackend'); m.resetDemo(); location.reload(); };
  const text = (x: any) => {
    if (x.type === 'email') return x.subject;
    try { const p = JSON.parse(x.payload || '{}'); return (p.text || p.messages?.[0]?.text || '').replace(/<[^>]+>/g, ''); } catch { return ''; }
  };
  return (
    <Panel title="Xem thử: tin đã gửi" action={<Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" />Đặt lại dữ liệu</Button>}>
      <p className="mb-3 text-xs text-muted-foreground">Ở chế độ xem thử, email / Telegram / LINE không gửi thật mà hiện ở đây.</p>
      {!box.length ? <p className="text-sm text-muted-foreground">Chưa có tin nào. Hãy đặt thử 1 lịch.</p> : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {box.slice(0, 30).map((x, i) => (
            <li key={i} className="rounded-sm border p-2.5 text-xs">
              <button type="button" className="w-full text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="mr-2 rounded-sm bg-secondary px-1.5 py-0.5 font-medium uppercase">{x.type}</span>
                <span className="text-muted-foreground">{new Date(x.at).toLocaleTimeString('vi-VN')}</span>
                {x.to && <span className="block truncate text-muted-foreground">→ {x.to}</span>}
                <span className="mt-1 block line-clamp-3 whitespace-pre-line">{text(x)}</span>
              </button>
              {open === i && x.html && <iframe title="email" srcDoc={x.html} sandbox="" className="mt-2 h-96 w-full rounded-sm border bg-white" />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
