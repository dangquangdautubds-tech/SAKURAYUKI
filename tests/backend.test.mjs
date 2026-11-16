import { createServices } from '../web/src/demo/gasServices.js';
import { createBackend } from '../web/src/demo/backend.generated.js';
import assert from 'node:assert/strict';
const state = {};
const svc = createServices(state);
const B = createBackend(svc);
state.props.ADMIN_PASSWORD = 'pass-1234'; state.props.WORKER_SECRET = 'ws'; state.props.TELEGRAM_BOT_TOKEN = 't'; state.props.TELEGRAM_CHAT_ID = '1';
B.setup();
const post = d => JSON.parse(B.doPost({ postData: { contents: JSON.stringify(d) } }).getContent());
const get = p => JSON.parse(B.doGet({ parameter: p }).getContent());
const day = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

let r = post({ action: 'adminLogin', password: 'x' }); assert.equal(r.ok, false);
r = post({ action: 'adminLogin', password: 'pass-1234' }); assert.ok(r.ok); const token = r.token;
const A = (action, extra = {}) => post({ action, token, ...extra });

r = A('save', { collection: 'branches', item: { Ten: 'Asakusa', Ten_JA: '浅草店', Dia_Chi: 'Taito-ku', Slot_Start: '09:00', Slot_End: '17:00', Slot_Minutes: 30, Suc_Chua: 4, Ngay_Nghi: day(5) } });
assert.ok(r.ok, r.error); const cn1 = r.item.ID;
r = A('save', { collection: 'branches', item: { Ten: 'Ginza', Dia_Chi: 'Chuo-ku', Suc_Chua: 0 } }); const cn2 = r.item.ID;
r = A('save', { collection: 'products', item: { Ten_Kimono: 'Furisode', Loai_Goi: 'Kimono nữ', Gia_JPY: 9800, Trang_Thai: 'Có sẵn', Link_Anh: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWx/view' } });
assert.ok(r.ok, r.error); const sp1 = r.item.ID; assert.match(r.item._img, /lh3/);
r = A('save', { collection: 'products', item: { Ten_Kimono: 'Chỉ Ginza', Loai_Goi: 'Kimono nam', Gia_JPY: 5000, Chi_Nhanh: cn2 } }); const sp2 = r.item.ID;
r = A('save', { collection: 'products', item: { Ten_Kimono: 'Ẩn', Loai_Goi: 'Kimono nữ', Gia_JPY: 1, Trang_Thai: 'Tạm ẩn' } });
r = A('save', { collection: 'posts', item: { Tieu_De: 'Kinh nghiệm mặc Kimono ở Asakusa', Noi_Dung: '## Hello\n**bold**', Trang_Thai: 'Đã đăng', Ngon_Ngu: 'vi' } });
assert.equal(r.item.Slug, 'kinh-nghiem-mac-kimono-o-asakusa');
r = A('save', { collection: 'posts', item: { Tieu_De: 'Kinh nghiệm mặc Kimono ở Asakusa', Trang_Thai: 'Nháp' } }); assert.equal(r.item.Slug, 'kinh-nghiem-mac-kimono-o-asakusa-2');
r = A('save', { collection: 'reviews', item: { Ten_Khach: 'Lan', Noi_Dung: 'Tuyệt vời', So_Sao: 5, Ngon_Ngu: 'vi' } }); assert.ok(r.ok);

let site = get({ action: 'site' }).site;
assert.equal(site.products.length, 2); assert.equal(site.branches.length, 2); assert.equal(site.posts.length, 1); assert.equal(site.faqs.length, 17);
assert.ok(site.faqs.every(f => f.group.vi && f.group.en), 'FAQ mẫu phải có chủ đề cho cả hai ngôn ngữ');
console.log('site ok: products', site.products.map(p => p.id + ':' + p.branches), 'branches', site.branches.map(b => b.id + ':' + b.capacity));
// nhiều ảnh + video + thẻ nội dung
r = A('save', { collection: 'products', item: { ID: site.products[0].id, Ten_Kimono: 'Furisode', Loai_Goi: 'Kimono nữ', Gia_JPY: 9800, Link_Anh: 'https://a.example/1.jpg', Anh_Phu: 'https://a.example/2.jpg\nhttps://a.example/3.jpg', Video: 'https://youtu.be/abcdefghijk' } });
assert.equal(r.ok, true, r.error);
r = A('save', { collection: 'products', item: { Ten_Kimono: 'x', Loai_Goi: 'y', Gia_JPY: 1, Anh_Phu: 'javascript:alert(1)' } }); assert.equal(r.ok, false);
r = A('save', { collection: 'hairs', item: { Ten: 'Búi thấp', Nhan: 'Truyền thống', Link_Anh: 'https://a.example/h.jpg', Anh_Phu: 'https://a.example/h2.jpg' } }); assert.equal(r.ok, true, r.error); assert.equal(r.item.ID, 'KT001');
r = A('save', { collection: 'photoshoots', item: { Ten: 'Gói tự nhiên', Gia_JPY: 7000, Hien_Thi: false } }); assert.equal(r.ok, true, r.error);
// gói chụp: thời lượng, số ảnh, loại nhóm
r = A('save', { collection: 'photoshoots', item: { Ten: 'Gói cặp đôi', Gia_JPY: 16000, Loai_Nhom: 'couple', Thoi_Luong: '75 phút', So_Anh: '30 ảnh' } });
assert.equal(r.ok, true, r.error); assert.equal(r.item.Loai_Nhom, 'couple');
r = A('save', { collection: 'photoshoots', item: { Ten: 'Loại nhóm sai', Gia_JPY: 1, Loai_Nhom: 'bogus' } });
assert.equal(r.item.Loai_Nhom, 'solo', 'loại nhóm lạ phải rơi về solo');
// nhóm kimono (NHOM_KIMONO) — Ten trùng Loai_Goi của trang phục
r = A('save', { collection: 'cats', item: { Ten: 'Kimono nữ', Ten_EN: "Women's kimono", Nhan: 'Phổ biến nhất', Mo_Ta: 'Hơn 200 mẫu.', Link_Anh: 'https://a.example/c.jpg', Anh_Phu: 'https://a.example/c2.jpg' } });
assert.equal(r.ok, true, r.error); assert.equal(r.item.ID, 'NK001');
{ const s2 = get({ action: 'site' }).site; const p0 = s2.products.find(x => x.name.vi === 'Furisode');
  assert.deepEqual(p0.images, ['https://a.example/1.jpg', 'https://a.example/2.jpg', 'https://a.example/3.jpg']); assert.equal(p0.video, 'https://youtu.be/abcdefghijk');
  assert.equal(s2.hairs.length, 1); assert.equal(s2.hairs[0].images.length, 2); assert.equal(s2.concepts.length, 0);
  // gói ẩn không ra website; gói hiện có đủ thời lượng / số ảnh / loại nhóm
  assert.equal(s2.photoshoots.length, 2);
  const cp = s2.photoshoots.find(x => x.kind === 'couple');
  assert.ok(cp, 'phải có gói cặp đôi'); assert.equal(cp.duration, '75 phút'); assert.equal(cp.photos, '30 ảnh');
  assert.equal(s2.cats.length, 1); assert.equal(s2.cats[0].name.en, "Women's kimono"); assert.equal(s2.cats[0].images.length, 2); }
assert.equal(get({ action: 'post', slug: 'kinh-nghiem-mac-kimono-o-asakusa' }).post.content, '## Hello\n**bold**');
assert.equal(get({ action: 'post', slug: 'kinh-nghiem-mac-kimono-o-asakusa-2' }).ok, false);

const order = (o) => post({ action: 'createOrder', branchId: cn1, productId: sp1, date: day(3), time: '10:00', men: 0, women: 2, kids: 0, hair: true, name: 'Test', email: 'a@b.com', phone: '090-1234-5678', lang: 'vi', source: 'Instagram', ...o });
r = order(); assert.ok(r.ok, r.error); assert.equal(r.order.status, 'Chờ xác nhận'); const id1 = r.orderId;
console.log('order1', id1, r.notify);
r = order({ women: 3 }); assert.equal(r.ok, false); console.log('capacity:', r.error);
r = order({ women: 2 }); assert.ok(r.ok, r.error);
let av = get({ action: 'availability', branch: cn1, date: day(3) }); assert.equal(av.slots.find(s => s.time === '10:00').available, false);
r = order({ date: day(5) }); assert.equal(r.ok, false); console.log('closed:', r.error);
r = order({ productId: sp2 }); assert.equal(r.ok, false); console.log('branch product:', r.error);
r = order({ branchId: cn2, productId: sp2, women: 15 }); assert.ok(r.ok, r.error);
r = order({ time: '17:30' }); assert.equal(r.ok, false);

// thanh toán online
A('saveSettings', { values: { payment_online: true } });
r = order({ time: '11:00', email: 'pay@x.com' }); assert.ok(r.ok, r.error); assert.equal(r.needsPayment, true); assert.equal(r.order.status, 'Chờ thanh toán');
const pid = r.orderId;
r = post({ action: 'paymentInfo', id: pid, secret: 'bad' }); assert.equal(r.ok, false);
r = post({ action: 'paymentInfo', id: pid, secret: 'ws' }); assert.equal(r.order.amount, 2000);
r = post({ action: 'markPaid', id: pid, payment: 'cs_test_1', amount: 2000, secret: 'ws' }); assert.ok(r.ok);
r = post({ action: 'orderStatus', id: pid, email: 'pay@x.com' }); assert.equal(r.order.status, 'Đã nhận cọc');
// hết hạn
r = order({ time: '12:00', email: 'late@x.com' }); const lid = r.orderId;
const rows = state.sheets.DON_HANG; const head = rows[0]; const row = rows.find(x => x[0] === lid); row[head.indexOf('Thoi_Gian_Dat')] = new Date(Date.now() - 3600e3);
assert.equal(B.expireUnpaid(), 1);
r = post({ action: 'orderStatus', id: lid, email: 'late@x.com' }); assert.equal(r.order.status, 'Đã huỷ');

// nhắc lịch
r = post({ action: 'createOrder', branchId: cn2, productId: sp2, date: day(1), time: '16:00', men: 1, women: 0, kids: 0, name: 'Tomorrow', email: 't@x.com', phone: '0901234567', lang: 'en' });
assert.ok(r.ok, r.error);
// đơn ngày mai đang chờ thanh toán → không nhắc; đánh dấu đã cọc để nhắc
post({ action: 'markPaid', id: r.orderId, payment: 'x', secret: 'ws' });
assert.equal(B.sendReminders(), 1); assert.equal(B.sendReminders(), 0);

// tra cứu + đổi trạng thái
r = post({ action: 'lookup', q: '+81 90 1234 5678' }); console.log('lookup phone count', r.orders.length); assert.ok(r.orders.length >= 3);
r = A('updateOrderStatus', { orderId: id1, status: 'Đang phục vụ' }); assert.ok(r.changed);
r = A('listOrders'); console.log('orders', r.orders.length, r.orders.map(o => o.status).join(','));

// mật khẩu
r = A('changePassword', { current: 'pass-1234', next: 'short' }); assert.equal(r.ok, false);
r = A('changePassword', { current: 'pass-1234', next: 'new-pass-5678' }); assert.ok(r.ok);
assert.equal(post({ action: 'adminLogin', password: 'pass-1234' }).ok, false);
assert.ok(post({ action: 'adminLogin', password: 'new-pass-5678' }).ok);
r = A('getSettings'); assert.equal(r.status.telegram, true); assert.equal(r.status.reminderTrigger, true);
r = A('reorder', { collection: 'products', ids: [sp2, sp1] }); site = get({ action: 'site' }).site; assert.equal(site.products[0].id, sp2);
r = A('setImageUrl', { slot: 'hero', url: 'https://i.imgur.com/abc.jpg' }); assert.ok(r.ok);
r = A('delete', { collection: 'reviews', id: 'DG001' }); assert.ok(r.ok);
r = A('analytics', { days: 7 }); assert.equal(r.configured, false);
r = post({ action: 'list', token: 'f'.repeat(64), collection: 'products' }); assert.equal(r.unauthorized, true);
console.log('outbox', state.outbox.map(x => x.type + ':' + (x.subject || '')).join(' | '));
console.log('ALL BACKEND TESTS PASSED');
