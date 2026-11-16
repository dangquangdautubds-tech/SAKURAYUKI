import { useEffect, useState } from 'react';

import { yen } from '@/lib/site';
import { Stars } from '@/components/common';
import { CrudPage, type CrudConfig } from './Crud';
import { useList } from './ctx';
import { Select } from './ui';
import { cn } from '@/lib/utils';

const VIDEO_HINT = 'Dán link YouTube, Google Drive (chia sẻ: Bất kỳ ai có link) hoặc file .mp4 — video phát ngay trên website. Link TikTok/Instagram sẽ mở ở tab mới.';
const PRODUCT_STATUSES = ['Có sẵn', 'Đang giặt', 'Tạm ẩn', 'Hết hàng'];
const STATUS_CLS: Record<string, string> = { 'Có sẵn': 'text-success', 'Đang giặt': 'text-warning', 'Tạm ẩn': 'text-muted-foreground', 'Hết hàng': 'text-destructive' };

function BranchPicker({ value, onChange, branches }: { value: string; onChange: (v: string) => void; branches: any[] }) {
  const sel = String(value || '').split(/[,\s]+/).filter(Boolean);
  const toggle = (id: string) => onChange((sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]).join(', '));
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange('')} aria-pressed={!sel.length} className={cn('rounded-sm border px-3 py-1.5 text-sm', !sel.length ? 'border-primary bg-accent text-accent-foreground' : 'bg-card')}>Tất cả chi nhánh</button>
      {branches.map(b => <button key={b.ID} type="button" onClick={() => toggle(b.ID)} aria-pressed={sel.includes(b.ID)} className={cn('rounded-sm border px-3 py-1.5 text-sm', sel.includes(b.ID) ? 'border-primary bg-accent text-accent-foreground' : 'bg-card')}>{b.Ten}</button>)}
    </div>
  );
}

export function Products() {
  const { items: branches, load } = useList<any>('branches');
  const [status, setStatus] = useState('');
  useEffect(() => { load(); }, [load]);
  const bName = (id: string) => branches?.find(b => b.ID === id)?.Ten || id;
  const cfg: CrudConfig = {
    collection: 'products', title: 'Trang phục & gói thuê', singular: 'trang phục', sub: 'Đổi trạng thái "Tạm ẩn" hoặc "Hết hàng" để ẩn khỏi website. "Đang giặt" vẫn hiện và vẫn nhận đặt.',
    defaults: { Trang_Thai: 'Có sẵn', Loai_Goi: 'Kimono nữ' },
    fields: [
      { key: 'Ten_Kimono', label: 'Tên (Tiếng Việt)', type: 'text', required: true },
      { key: 'Ten_EN', label: 'Tên (English)', type: 'text' },
      { key: 'Loai_Goi', label: 'Loại gói', type: 'text', half: true, hint: 'Vd: Kimono nữ, Kimono nam, Cặp đôi, Furisode…' },
      { key: 'Gia_JPY', label: 'Giá thuê (JPY / khách)', type: 'number', half: true, required: true },
      { key: 'Trang_Thai', label: 'Trạng thái', type: 'select', options: PRODUCT_STATUSES, half: true },
      { key: 'Chi_Nhanh', label: 'Có ở chi nhánh', type: 'custom', render: (v, set) => <BranchPicker value={v} onChange={set} branches={branches || []} /> },
      { key: 'Link_Anh', label: 'Ảnh chính', type: 'image', hint: 'Ảnh dọc 4:5 đẹp nhất. Ảnh được nén trước khi tải lên.' },
      { key: 'Anh_Phu', label: 'Ảnh phụ', type: 'images', max: 9 },
      { key: 'Video', label: 'Video', type: 'text', placeholder: 'https://youtu.be/…', hint: VIDEO_HINT },
      { key: 'Mo_Ta', label: 'Mô tả (Tiếng Việt)', type: 'textarea' }, { key: 'Mo_Ta_EN', label: 'Mô tả (English)', type: 'textarea' }
    ],
    groups: [{ title: 'Thông tin', keys: ['Ten_Kimono', 'Ten_EN', 'Loai_Goi', 'Gia_JPY', 'Trang_Thai', 'Chi_Nhanh'] }, { title: 'Ảnh & video', keys: ['Link_Anh', 'Anh_Phu', 'Video'] }, { title: 'Mô tả', keys: ['Mo_Ta', 'Mo_Ta_EN'] }],
    row: it => ({
      title: it.Ten_Kimono, image: it._img || it.Link_Anh || '', fallbackKey: it.ID + it.Loai_Goi,
      meta: <>{it.Loai_Goi} · {yen(it.Gia_JPY)} · {1 + String(it.Anh_Phu || '').split(/\n+/).filter(Boolean).length} ảnh{it.Video ? ' + video' : ''} · {it.Chi_Nhanh ? String(it.Chi_Nhanh).split(/[,\s]+/).filter(Boolean).map(bName).join(', ') : 'Tất cả chi nhánh'}</>,
      badge: <span className={cn('hidden text-xs font-medium sm:inline', STATUS_CLS[it.Trang_Thai])}>{it.Trang_Thai || 'Có sẵn'}</span>
    }),
    search: it => [it.ID, it.Ten_Kimono, it.Ten_EN, it.Loai_Goi].join(' '),
    filters: <Select value={status} onChange={setStatus} options={[['', 'Mọi trạng thái'], ...PRODUCT_STATUSES.map(s => [s, s] as [string, string])]} aria-label="Lọc trạng thái" />
  };
  return <CrudPage cfg={cfg} extraFilter={status ? it => (it.Trang_Thai || 'Có sẵn') === status : undefined} />;
}

export function Branches() {
  const cfg: CrudConfig = {
    collection: 'branches', title: 'Chi nhánh', singular: 'chi nhánh', visibleKey: 'Hien_Thi',
    sub: 'Khung giờ nhận khách và sức chứa mỗi khung giờ (0 = không giới hạn). Ngày nghỉ: liệt kê dạng 2026-12-31, cách nhau dấu phẩy.',
    defaults: { Slot_Start: '09:00', Slot_End: '17:00', Slot_Minutes: 30, Suc_Chua: 6, Hien_Thi: true },
    fields: [
      { key: 'Ten', label: 'Tên (Tiếng Việt)', type: 'text', required: true },
      { key: 'Ten_EN', label: 'Tên (English)', type: 'text' },
      { key: 'Dia_Chi', label: 'Địa chỉ', type: 'text', required: true }, { key: 'Ghi_Chu_Dia_Chi', label: 'Hướng dẫn đường đi', type: 'text' },
      { key: 'Dien_Thoai', label: 'Điện thoại', type: 'text', half: true }, { key: 'Gio_Mo_Cua', label: 'Giờ mở cửa (hiển thị)', type: 'text', half: true, placeholder: '09:00 – 18:00' },
      { key: 'Slot_Start', label: 'Khung giờ đầu', type: 'time', half: true }, { key: 'Slot_End', label: 'Khung giờ cuối', type: 'time', half: true },
      { key: 'Slot_Minutes', label: 'Mỗi khung (phút)', type: 'number', half: true }, { key: 'Suc_Chua', label: 'Số khách tối đa mỗi khung', type: 'number', half: true },
      { key: 'Ngay_Nghi', label: 'Ngày nghỉ', type: 'textarea', rows: 2, placeholder: '2026-12-31, 2027-01-01' },
      { key: 'Map_Link', label: 'Link Google Maps (nút Chỉ đường)', type: 'text' },
      { key: 'Map_Embed', label: 'Link nhúng bản đồ', type: 'text', hint: 'Google Maps → Chia sẻ → Nhúng bản đồ → copy phần https://www.google.com/maps/embed?… (có thể dán cả mã <iframe>)' },
      { key: 'Telegram_Chat_ID', label: 'Telegram Chat ID riêng của chi nhánh', type: 'text', hint: 'Để trống = gửi vào nhóm chung' },
      { key: 'Hien_Thi', label: 'Hiển thị & nhận đặt lịch', type: 'bool' }
    ],
    groups: [
      { title: 'Thông tin', keys: ['Ten', 'Ten_EN', 'Dia_Chi', 'Ghi_Chu_Dia_Chi', 'Dien_Thoai', 'Gio_Mo_Cua'] },
      { title: 'Lịch & sức chứa', keys: ['Slot_Start', 'Slot_End', 'Slot_Minutes', 'Suc_Chua', 'Ngay_Nghi'] },
      { title: 'Bản đồ & thông báo', keys: ['Map_Link', 'Map_Embed', 'Telegram_Chat_ID', 'Hien_Thi'] }
    ],
    row: it => ({ title: <>{it.Ten} <span className="text-xs font-normal text-muted-foreground">· {it.ID}</span></>, meta: `${it.Slot_Start}–${it.Slot_End} · mỗi ${it.Slot_Minutes}′ · ${Number(it.Suc_Chua) ? it.Suc_Chua + ' khách/khung' : 'không giới hạn'} · ${it.Dia_Chi}` })
  };
  return <CrudPage cfg={cfg} />;
}

export function Faqs() {
  const { items, load } = useList<any>('faqs');
  const [group, setGroup] = useState('');
  useEffect(() => { load(); }, [load]);
  const groups = Array.from(new Set((items || []).map(it => String(it.Nhom || '')).filter(Boolean)));
  const cfg: CrudConfig = {
    collection: 'faqs', title: 'Hỏi đáp', singular: 'câu hỏi', visibleKey: 'Hien_Thi', defaults: { Hien_Thi: true },
    sub: 'Câu hỏi cùng "Chủ đề" được gom thành một mục trên trang Hỏi đáp, kèm link nhảy nhanh ở đầu trang.',
    fields: [
      { key: 'Nhom', label: 'Chủ đề (Tiếng Việt)', type: 'text', half: true, hint: 'Vd: Đặt lịch, Kimono, Trả đồ. Để trống = xếp vào mục "Khác".' },
      { key: 'Nhom_EN', label: 'Chủ đề (English)', type: 'text', half: true },
      { key: 'Cau_Hoi', label: 'Câu hỏi (VI)', type: 'text', required: true }, { key: 'Tra_Loi', label: 'Trả lời (VI)', type: 'textarea', required: true },
      { key: 'Cau_Hoi_EN', label: 'Question (EN)', type: 'text' }, { key: 'Tra_Loi_EN', label: 'Answer (EN)', type: 'textarea' },
      { key: 'Hien_Thi', label: 'Hiển thị', type: 'bool' }
    ],
    groups: [{ title: 'Phân loại', keys: ['Nhom', 'Nhom_EN'] }, { title: 'Nội dung', keys: ['Cau_Hoi', 'Tra_Loi', 'Cau_Hoi_EN', 'Tra_Loi_EN', 'Hien_Thi'] }],
    row: it => ({ title: it.Cau_Hoi, meta: <>{it.Nhom ? it.Nhom + ' · ' : ''}{it.Tra_Loi}</> }),
    search: it => [it.ID, it.Cau_Hoi, it.Cau_Hoi_EN, it.Nhom].join(' '),
    filters: groups.length > 1
      ? <Select value={group} onChange={setGroup} options={[['', 'Mọi chủ đề'], ...groups.map(g => [g, g] as [string, string])]} aria-label="Lọc chủ đề" />
      : undefined
  };
  return <CrudPage cfg={cfg} extraFilter={group ? it => String(it.Nhom || '') === group : undefined} />;
}

export function Reviews() {
  const cfg: CrudConfig = {
    collection: 'reviews', title: 'Đánh giá khách hàng', singular: 'đánh giá', visibleKey: 'Hien_Thi', defaults: { So_Sao: 5, Hien_Thi: true, Ngon_Ngu: 'VI' },
    sub: 'Chỉ đăng đánh giá thật của khách (được khách đồng ý). Có thể chép từ Google Maps / Tripadvisor kèm tên hiển thị khách dùng ở đó.',
    fields: [
      { key: 'Ten_Khach', label: 'Tên khách', type: 'text', required: true, half: true },
      { key: 'Ngon_Ngu', label: 'Quốc gia / ngôn ngữ', type: 'text', half: true, placeholder: 'VI, EN, JP…' },
      { key: 'So_Sao', label: 'Số sao', type: 'select', options: ['5', '4', '3', '2', '1'], half: true },
      { key: 'Hien_Thi', label: 'Hiển thị', type: 'bool', half: true },
      { key: 'Noi_Dung', label: 'Nội dung', type: 'textarea', required: true, rows: 5 }
    ],
    row: it => ({ title: <span className="inline-flex items-center gap-2">{it.Ten_Khach} <Stars n={Number(it.So_Sao) || 5} /></span>, meta: it.Noi_Dung })
  };
  return <CrudPage cfg={cfg} />;
}


/** Trang quản lý dùng chung cho 4 nhóm "thẻ nội dung": kiểu tóc, concept, gói chụp ảnh, dịch vụ kèm theo */
function cardConfig(o: {
  collection: string; title: string; singular: string; sub: string; tagLabel: string; tagHint?: string;
  price?: string; aspect?: string; maxImages?: number; extra?: CrudConfig['fields']; extraMeta?: (it: any) => any;
}): CrudConfig {
  const extra = o.extra || [];
  return {
    collection: o.collection, title: o.title, singular: o.singular, sub: o.sub, visibleKey: 'Hien_Thi', defaults: { Hien_Thi: true },
    fields: [
      { key: 'Ten', label: 'Tên (Tiếng Việt)', type: 'text', required: true, half: true }, { key: 'Ten_EN', label: 'Tên (English)', type: 'text', half: true },
      { key: 'Nhan', label: o.tagLabel + ' (Tiếng Việt)', type: 'text', half: true, hint: o.tagHint }, { key: 'Nhan_EN', label: o.tagLabel + ' (English)', type: 'text', half: true },
      ...(o.price ? [{ key: 'Gia_JPY', label: o.price, type: 'number', half: true, hint: 'Để 0 = không hiện giá' } as const] : []),
      { key: 'Hien_Thi', label: 'Hiển thị', type: 'bool', half: true },
      ...extra,
      { key: 'Link_Anh', label: 'Ảnh chính', type: 'image', aspect: o.aspect || 'aspect-[4/5]' },
      { key: 'Anh_Phu', label: 'Ảnh phụ', type: 'images', max: o.maxImages || 15 },
      { key: 'Video', label: 'Video', type: 'text', placeholder: 'https://youtu.be/…', hint: VIDEO_HINT },
      { key: 'Mo_Ta', label: 'Mô tả (Tiếng Việt)', type: 'textarea', rows: 4 }, { key: 'Mo_Ta_EN', label: 'Mô tả (English)', type: 'textarea', rows: 4 }
    ],
    row: it => ({
      title: it.Ten, image: it._img || it.Link_Anh || '', fallbackKey: it.ID,
      meta: <>{it.Nhan || '—'}{Number(it.Gia_JPY) > 0 && <> · từ {yen(it.Gia_JPY)}</>}{o.extraMeta ? o.extraMeta(it) : null} · {(it.Link_Anh ? 1 : 0) + String(it.Anh_Phu || '').split(/\n+/).filter(Boolean).length} ảnh{it.Video ? ' + video' : ''}</>
    }),
    search: it => [it.ID, it.Ten, it.Ten_EN, it.Nhan].join(' ')
  };
}

const KIND_LABEL: Record<string, string> = { solo: 'Một người', couple: 'Cặp đôi', group: 'Nhóm' };
export const Hairs = () => <CrudPage cfg={cardConfig({ collection: 'hairs', title: 'Kiểu tóc', singular: 'kiểu tóc', sub: 'Mỗi kiểu tóc có 1 ảnh chính, tối đa 9 ảnh phụ và 1 video.', tagLabel: 'Phong cách', tagHint: 'Vd: Truyền thống, Hiện đại', aspect: 'aspect-[3/4]' })} />;
export const Concepts = () => <CrudPage cfg={cardConfig({ collection: 'concepts', title: 'Concept kimono', singular: 'concept', sub: 'Các chủ đề hiện ở trang chủ và trang Chụp ảnh: cặp đôi, gia đình, ban đêm…', tagLabel: 'Dòng mô tả ngắn', price: 'Giá từ (JPY)', aspect: 'aspect-[3/4]' })} />;
export const Photoshoots = () => <CrudPage cfg={cardConfig({
  collection: 'photoshoots', title: 'Gói chụp ảnh', singular: 'gói chụp',
  sub: 'Trang Chụp ảnh chia gói theo "Dành cho" — khách bấm Một người / Cặp đôi / Nhóm để xem đúng gói của mình.',
  tagLabel: 'Khẩu hiệu ngắn', tagHint: 'Vd: Tự nhiên. Nhận ảnh ngay.', price: 'Giá chụp từ (JPY)', aspect: 'aspect-[5/4]',
  extra: [
    { key: 'Loai_Nhom', label: 'Dành cho', type: 'select', options: ['solo', 'couple', 'group'], half: true, hint: 'solo = một người, couple = cặp đôi, group = nhóm' },
    { key: 'Thoi_Luong', label: 'Thời lượng', type: 'text', half: true, placeholder: '60 phút' },
    { key: 'So_Anh', label: 'Số ảnh nhận được', type: 'text', half: true, placeholder: '30 ảnh' }
  ],
  extraMeta: it => <>{it.Thoi_Luong ? ' · ' + it.Thoi_Luong : ''}{it.So_Anh ? ' · ' + it.So_Anh : ''} · {KIND_LABEL[it.Loai_Nhom] || KIND_LABEL.solo}</>
})} />;
export const Services = () => <CrudPage cfg={cardConfig({ collection: 'services', title: 'Dịch vụ kèm theo', singular: 'dịch vụ', sub: 'Vd: nail, trang điểm, giữ hành lý. Dịch vụ có giá > 0 sẽ hiện trong Bảng giá và công cụ Tính giá.', tagLabel: 'Dòng mô tả ngắn', price: 'Giá từ (JPY)', aspect: 'aspect-square' })} />;
export const Cats = () => <CrudPage cfg={cardConfig({
  collection: 'cats', title: 'Nhóm kimono', singular: 'nhóm',
  sub: 'Mô tả cho từng mục ở trang Gói thuê. Ô "Tên (Tiếng Việt)" phải trùng đúng với "Loại gói" của trang phục, ví dụ Furisode. Ảnh phụ ở đây được thêm vào cuối thư viện của nhóm.',
  tagLabel: 'Dòng chữ nhỏ phía trên', tagHint: 'Vd: Nổi bật mùa xuân', aspect: 'aspect-[4/5]'
})} />;
