/**
 * CHẾ ĐỘ XEM THỬ: chạy chính file apps-script/Code.gs ngay trong trình duyệt với Google Sheets giả lập.
 * Dữ liệu mẫu chỉ lưu trong localStorage của trình duyệt này. Bản thật dùng Cloudflare Worker + Apps Script.
 */
import { createServices, reviveDates } from './gasServices.js';
import { createBackend } from './backend.generated.js';
import { saveDemoUpload } from '../lib/img';

const KEY = 'sy_demo_state_v3';
let state: any;
let B: any;
let saveTimer: any = 0;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* bỏ qua */ } }, 50);
}

const day = (n: number) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

function seed() {
  state.props.ADMIN_PASSWORD = 'demo';
  state.props.WORKER_SECRET = 'demo-worker';
  B.setup();
  const s = (values: Record<string, any>) => post({ action: 'saveSettings', token: tok(), values });
  s({
    payment_online: true, deposit_per_person: 1000, return_by: '17:30',
    shop_phone: '+81 3-0000-0000 (số mẫu)', shop_email: 'hello@sakurayuki.example', shop_whatsapp: '81300000000',
    line_id: '@sakurayuki-demo', line_url: 'https://line.me/', telegram_user: 'sakurayuki_demo', telegram_url: 'https://t.me/',
    facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/', threads: 'https://threads.net/',
    stats_kimono: '500+', stats_guests: '12.000+', website_url: 'https://sakurayuki.example',
    price_hair: 1500, card_fee_percent: 3, calc_enabled: true,
    announcement_enabled: true,
    announcement_vi: 'Mùa lá đỏ 2026 — nên đặt lịch trước 3–5 ngày', announcement_en: 'Autumn leaves 2026 — book 3–5 days ahead', announcement_ja: '2026年紅葉シーズン — 3〜5日前のご予約がおすすめ'
  });
  const save = (collection: string, item: any) => { const r = post({ action: 'save', token: tok(), collection, item }); if (!r.ok) console.error(collection, r.error); return r.item; };
  const asa = save('branches', {
    Ten: 'Asakusa', Ten_EN: 'Asakusa', Ten_JA: '浅草店', Dia_Chi: '2-0-0 Asakusa, Taito-ku, Tokyo (địa chỉ mẫu)',
    Ghi_Chu_Dia_Chi: 'Đi bộ 5 phút từ ga Asakusa, gần cổng Kaminarimon', Dien_Thoai: '+81 3-0000-0001', Gio_Mo_Cua: '09:00 – 18:00',
    Map_Link: 'https://maps.google.com/?q=Asakusa+Tokyo', Slot_Start: '09:00', Slot_End: '16:00', Slot_Minutes: 30, Suc_Chua: 6, Ngay_Nghi: day(9)
  });
  const gin = save('branches', {
    Ten: 'Ginza', Ten_EN: 'Ginza', Ten_JA: '銀座店', Dia_Chi: '4-0-0 Ginza, Chuo-ku, Tokyo (địa chỉ mẫu)',
    Ghi_Chu_Dia_Chi: 'Đi bộ 3 phút từ ga Ginza, lối ra A2', Dien_Thoai: '+81 3-0000-0002', Gio_Mo_Cua: '10:00 – 19:00',
    Map_Link: 'https://maps.google.com/?q=Ginza+Tokyo', Slot_Start: '10:00', Slot_End: '16:30', Slot_Minutes: 30, Suc_Chua: 4
  });
  const P = (vi: string, en: string, ja: string, cat: string, price: number, art: string, d: [string, string, string], branches = '', status = 'Có sẵn') =>
    save('products', { Anh_Phu: [1, 2, 3].map(i => 'https://demo.local/art/' + art + '-' + i).join('\n'), Ten_Kimono: vi, Ten_EN: en, Ten_JA: ja, Loai_Goi: cat, Gia_JPY: price, Link_Anh: 'https://demo.local/art/' + art, Mo_Ta: d[0], Mo_Ta_EN: d[1], Mo_Ta_JA: d[2], Chi_Nhanh: branches, Trang_Thai: status });
  const p1 = P('Kimono nữ tiêu chuẩn', 'Standard kimono (women)', 'スタンダード着物（女性）', 'Kimono nữ', 4800, 'std-w',
    ['Hơn 200 mẫu hoa văn truyền thống, phù hợp dạo phố và chụp ảnh.', 'Over 200 traditional patterns, perfect for sightseeing and photos.', '200柄以上の伝統柄。散策や撮影に。']);
  P('Kimono nữ cao cấp', 'Premium kimono (women)', 'プレミアム着物（女性）', 'Kimono nữ', 7800, 'premium-w',
    ['Vải lụa, hoa văn tinh xảo, kèm phụ kiện tóc cao cấp.', 'Silk fabrics with refined patterns and premium hair accessories.', '正絹・上質な柄、髪飾り付き。']);
  P('Kimono nam', 'Kimono (men)', '着物（男性）', 'Kimono nam', 4800, 'std-m',
    ['Kimono và haori tông trầm, thanh lịch.', 'Elegant kimono and haori in muted tones.', '落ち着いた色の着物と羽織。']);
  P('Gói cặp đôi', 'Couple plan', 'カップルプラン', 'Cặp đôi', 9200, 'couple',
    ['Một kimono nữ và một kimono nam, phối màu đồng điệu.', 'One women’s and one men’s kimono in matching colours.', '男女ペアで色合わせ。']);
  P('Furisode', 'Furisode', '振袖', 'Furisode', 16800, 'furisode',
    ['Kimono tay dài cho dịp đặc biệt, kèm làm tóc nâng cao.', 'Long-sleeved kimono for special occasions with advanced hair styling.', '特別な日の振袖。ヘアセット付き。'], gin.ID);
  P('Hakama', 'Hakama', '袴', 'Hakama', 9800, 'hakama',
    ['Phong cách tốt nghiệp Nhật Bản, có cả size nam và nữ.', 'Japanese graduation style, for women and men.', '卒業式スタイル。男女対応。'], asa.ID, 'Đang giặt');
  P('Kimono trẻ em', 'Kimono (kids)', '子供着物', 'Trẻ em', 3300, 'kids',
    ['Cho bé từ 3 đến 12 tuổi, mặc nhẹ và thoải mái.', 'For ages 3–12, light and comfortable.', '3〜12歳向け。軽くて楽。']);
  P('Yukata mùa hè', 'Summer yukata', '夏の浴衣', 'Yukata', 3800, 'yukata',
    ['Vải cotton mát, chỉ có từ tháng 6 đến tháng 9.', 'Cool cotton, available June to September.', '綿素材。6〜9月限定。'], '', 'Tạm ẩn');

  save('posts', {
    Tieu_De: '7 điểm chụp ảnh kimono đẹp nhất ở Asakusa', Ngon_Ngu: 'vi', Trang_Thai: 'Đã đăng', Ngay_Dang: day(-6), Anh_Bia: 'https://demo.local/scene/asakusa-post',
    Tom_Tat: 'Từ cổng Kaminarimon đến bờ sông Sumida — lộ trình đi bộ chụp ảnh trong nửa ngày.',
    Noi_Dung: '## Bắt đầu sớm\nĐến **Kaminarimon** trước 9 giờ sáng để có khung hình vắng người.\n\n## Lộ trình gợi ý\n- Cổng Kaminarimon\n- Phố Nakamise\n- Chùa Sensō-ji\n- Vườn Denbō-in (chỉ mở một số ngày)\n- Bờ sông Sumida nhìn sang Skytree\n\n> Mẹo: mang theo túi nhỏ đựng điện thoại — túi kimono khá nhỏ.\n\n## Đặt lịch\nChọn khung giờ 9:00–10:00 tại cửa hàng Asakusa để có nhiều thời gian nhất.'
  });
  save('posts', {
    Tieu_De: 'Mặc kimono mùa lá đỏ: chọn màu thế nào cho đẹp', Ngon_Ngu: 'vi', Trang_Thai: 'Đã đăng', Ngay_Dang: day(-2), Anh_Bia: 'https://demo.local/scene/autumn-post',
    Tom_Tat: 'Gợi ý phối màu kimono và obi nổi bật giữa sắc đỏ, cam của mùa thu Tokyo.',
    Noi_Dung: '## Màu nổi trên nền lá đỏ\nTông **xanh lục đậm**, **xanh navy** và **kem** giúp bạn nổi bật giữa nền đỏ cam.\n\n## Obi và phụ kiện\nChọn obi màu vàng đồng hoặc đỏ mận để tạo điểm nhấn.\n\n## Áo khoác\nTừ cuối tháng 11 trời se lạnh, tiệm có haori và khăn choàng cho mượn.'
  });
  save('posts', { Tieu_De: 'Bản nháp: Lễ hội mùa xuân 2027', Ngon_Ngu: 'vi', Trang_Thai: 'Nháp', Noi_Dung: 'Đang viết…' });

  // Thẻ nội dung mẫu: kiểu tóc, concept, gói chụp, dịch vụ
  const C = (col: string, kind: string, vi: string, en: string, tag: [string, string], d: [string, string], price = 0, n = 3, extra: any = {}) => save(col, {
    Ten: vi, Ten_EN: en, Nhan: tag[0], Nhan_EN: tag[1], Mo_Ta: d[0], Mo_Ta_EN: d[1], Gia_JPY: price,
    Link_Anh: `https://demo.local/${kind}/${col}-${en}`, Anh_Phu: Array.from({ length: n }, (_, i) => `https://demo.local/${kind}/${col}-${en}-${i + 1}`).join('\n'), ...extra });
  C('hairs', 'art', 'Búi cao cổ điển', 'Classic updo', ['Truyền thống', 'Traditional'], ['Búi gọn kèm trâm cài kanzashi, hợp với furisode.', 'A neat updo with kanzashi pins, great with furisode.']);
  C('hairs', 'art', 'Búi thấp', 'Low bun', ['Truyền thống', 'Traditional'], ['Thanh lịch, hợp mọi khuôn mặt.', 'Elegant and flattering for every face shape.']);
  C('hairs', 'art', 'Tết vương miện', 'Crown braid', ['Hiện đại', 'Modern'], ['Tết quanh đầu, đính hoa nhỏ.', 'Braided around the head with small flowers.']);
  C('hairs', 'art', 'Tóc ngắn uốn nhẹ', 'Short waves', ['Hiện đại', 'Modern'], ['Dành cho tóc ngắn, thêm kẹp hoa.', 'For short hair, finished with a flower clip.']);
  C('concepts', 'scene', 'Cặp đôi', 'Couple', ['Phối màu đồng điệu cho hai người', 'Matching colours for two'], ['Kimono nữ và nam chọn cùng tông màu.', 'Women’s and men’s kimono styled in matching tones.'], 9200, 2);
  C('concepts', 'scene', 'Gia đình', 'Family', ['Bố mẹ và bé cùng mặc kimono', 'Parents and kids together'], ['Có kimono trẻ em từ 3 tuổi.', 'Kids’ kimono from age 3.'], 0, 2);
  C('concepts', 'scene', 'Ban đêm', 'Night', ['Dạo phố lên đèn', 'After-dark city walk'], ['Trả đồ muộn theo lịch hẹn riêng.', 'Late return by arrangement.'], 0, 2);
  C('concepts', 'scene', 'Mùa hoa anh đào', 'Sakura season', ['Cuối tháng 3 – đầu tháng 4', 'Late March – early April'], ['Tông pastel nổi bật dưới tán hoa.', 'Pastel tones under the blossoms.'], 0, 2);
  C('concepts', 'scene', 'Mùa lá đỏ', 'Autumn leaves', ['Giữa tháng 11 – đầu tháng 12', 'Mid November – early December'], ['Tông xanh đậm và kem nổi trên nền lá đỏ.', 'Deep green and cream stand out against red leaves.'], 0, 2);
  C('photoshoots', 'scene', 'Gói tự nhiên', 'Natural package', ['Tự nhiên. Nhận ảnh trong ngày.', 'Natural. Same-day photos.'], ['Thợ ảnh đi cùng 60 phút quanh khu phố, giao ảnh gốc trong ngày.', 'A photographer joins you for 60 minutes; original files delivered the same day.'], 7000, 3, { Loai_Nhom: 'solo', Thoi_Luong: '60 phút', So_Anh: '40 ảnh gốc' });
  C('photoshoots', 'scene', 'Gói chỉnh màu', 'Retouched package', ['Chỉnh màu kỹ. Phong cách điện ảnh.', 'Polished. Cinematic.'], ['90 phút chụp, 20 ảnh chỉnh màu giao trong 5 ngày.', '90-minute shoot, 20 retouched photos within 5 days.'], 12000, 3, { Loai_Nhom: 'solo', Thoi_Luong: '90 phút', So_Anh: '20 ảnh chỉnh' });
  C('photoshoots', 'scene', 'Gói studio', 'Studio package', ['Phông nền Nhật, ánh sáng studio.', 'Japanese backdrops, studio light.'], ['Chụp trong studio, không phụ thuộc thời tiết.', 'Shot in the studio, whatever the weather.'], 15000, 3, { Loai_Nhom: 'solo', Thoi_Luong: '60 phút', So_Anh: '25 ảnh chỉnh' });
  C('photoshoots', 'scene', 'Gói cặp đôi', 'Couple package', ['Hai người, một bộ ảnh.', 'Two people, one story.'], ['75 phút ngoại cảnh cho hai khách, 30 ảnh chỉnh màu.', '75 minutes on location for two guests, 30 retouched photos.'], 16000, 3, { Loai_Nhom: 'couple', Thoi_Luong: '75 phút', So_Anh: '30 ảnh chỉnh' });
  C('photoshoots', 'scene', 'Gói cặp đôi buổi tối', 'Couple night package', ['Phố lên đèn, ánh sáng ấm.', 'City lights, warm tones.'], ['Chụp sau 17:00 quanh phố cổ, giao 25 ảnh chỉnh màu.', 'Shot after 17:00 around the old town, 25 retouched photos.'], 19000, 3, { Loai_Nhom: 'couple', Thoi_Luong: '60 phút', So_Anh: '25 ảnh chỉnh' });
  C('photoshoots', 'scene', 'Gói nhóm nhỏ', 'Small group package', ['Từ 3 đến 5 khách.', 'For 3 to 5 guests.'], ['Một thợ ảnh cho cả nhóm, 60 phút, ảnh gốc giao trong ngày.', 'One photographer for the whole group, 60 minutes, originals the same day.'], 6000, 3, { Loai_Nhom: 'group', Thoi_Luong: '60 phút', So_Anh: '50 ảnh gốc' });
  C('photoshoots', 'scene', 'Gói trọn ngày cho nhóm', 'Group signature package', ['Nhiều bối cảnh, một ngày trọn vẹn.', 'Several locations, one full day.'], ['Ngoại cảnh và studio, có trợ lý đi cùng, giao 80 ảnh chỉnh màu.', 'Outdoor and studio with an assistant, 80 retouched photos.'], 11000, 3, { Loai_Nhom: 'group', Thoi_Luong: '3 giờ', So_Anh: '80 ảnh chỉnh' });
  C('services', 'art', 'Nail', 'Nail art', ['Làm trước hoặc sau khi mặc kimono', 'Before or after your kimono'], ['Đặt qua tin nhắn với tiệm.', 'Book by message.'], 4000, 2);
  C('services', 'art', 'Trang điểm', 'Make-up', ['Trang điểm nhẹ kiểu Nhật', 'Soft Japanese-style make-up'], ['Khoảng 30 phút, làm cùng lúc với tóc.', 'About 30 minutes, done alongside hair styling.'], 3000, 2);
  C('services', 'art', 'Giữ hành lý', 'Luggage storage', ['Miễn phí trong ngày thuê', 'Free on your rental day'], ['Gửi vali và túi xách tại tiệm.', 'Leave suitcases and bags at the shop.'], 0, 1);
  // Nhóm kimono — mô tả từng mục ở trang Gói thuê
  const K = (vi: string, en: string, tag: [string, string], d: [string, string]) => save('cats', {
    Ten: vi, Ten_EN: en, Nhan: tag[0], Nhan_EN: tag[1], Mo_Ta: d[0], Mo_Ta_EN: d[1],
    Link_Anh: `https://demo.local/art/cat-${en}` });
  K('Furisode', 'Furisode', ['Dịp đặc biệt', 'Special occasions'],
    ['Kimono tay dài, hoa văn lớn và màu rực rỡ — lựa chọn cho lễ tốt nghiệp, sinh nhật hoặc buổi chụp ảnh quan trọng. Giá đã gồm làm tóc nâng cao và phụ kiện cài tóc.',
     'Long-sleeved kimono with bold patterns and vivid colours — the choice for graduations, birthdays or an important photoshoot. The price includes advanced hair styling and hair accessories.']);
  K('Kimono nữ', "Women's kimono", ['Phổ biến nhất', 'Most popular'],
    ['Hơn 200 mẫu từ hoa văn cổ điển đến tông pastel nhẹ. Đây là nhóm được chọn nhiều nhất cho một ngày dạo phố cổ và chụp ảnh ngoài trời.',
     'Over 200 designs from classic patterns to soft pastels. This is the most-chosen group for a day exploring the old town and shooting outdoors.']);
  K('Kimono nam', "Men's kimono", ['Thanh lịch, gọn gàng', 'Clean and elegant'],
    ['Kimono tông trầm kèm haori và hakama. Dáng gọn, dễ đi bộ cả ngày, phối được với kimono nữ cùng tông.',
     'Muted-tone kimono with haori and hakama. A clean silhouette that is easy to walk in all day and pairs with matching women\u2019s kimono.']);
  K('Cặp đôi', 'Couple', ['Phối màu cho hai người', 'Matching for two'],
    ['Một kimono nữ và một kimono nam được chọn cùng tông màu, nhân viên phối obi và phụ kiện để ảnh của hai người hài hoà.',
     'One women\u2019s and one men\u2019s kimono chosen in the same colour family; our staff match the obi and accessories so your photos work together.']);
  K('Hakama', 'Hakama', ['Phong cách tốt nghiệp', 'Graduation style'],
    ['Kiểu hakama quen thuộc trong lễ tốt nghiệp Nhật Bản, có cả size nam và nữ. Dễ di chuyển, phù hợp nhóm bạn mặc cùng nhau.',
     'The hakama look familiar from Japanese graduation ceremonies, in both men\u2019s and women\u2019s sizes. Easy to move in and good for groups dressing together.']);
  K('Trẻ em', 'Kids', ['Từ 3 đến 12 tuổi', 'Ages 3 to 12'],
    ['Kimono nhẹ, vải mềm, mặc nhanh để bé không phải đứng lâu. Có thể phối cùng tông với bố mẹ.',
     'Light kimono in soft fabric, dressed quickly so children do not have to stand still for long. Can be matched with the parents\u2019 colours.']);
  K('Yukata', 'Yukata', ['Chỉ mùa hè', 'Summer only'],
    ['Vải cotton mát, hoa văn tươi — dành cho tháng 6 đến tháng 9 và các buổi lễ hội mùa hè.',
     'Cool cotton with fresh patterns — for June to September and summer festival evenings.']);
  B.upsertImage_('intro', 'https://demo.local/scene/intro', ''); B.upsertImage_('banner', 'https://demo.local/scene/banner', '');
  // Ảnh website (minh hoạ) — tiệm thay bằng ảnh thật trong trang quản trị
  B.upsertImage_('hero', 'https://demo.local/scene/hero', '');
  B.upsertImage_('branch-' + asa.ID.toLowerCase(), 'https://demo.local/scene/asakusa', '');
  B.upsertImage_('branch-' + gin.ID.toLowerCase(), 'https://demo.local/scene/ginza', '');
  for (let i = 1; i <= 36; i++) B.upsertImage_('gallery-' + i, 'https://demo.local/art/gallery-' + i, '');

  // Đơn mẫu (lịch sử 30 ngày) để trang báo cáo có số liệu — tên ghi rõ "Khách mẫu"
  const sources = ['Google', 'Instagram', 'TikTok', 'Facebook', 'Trực tiếp', 'Google', 'Threads', 'Instagram', 'Tripadvisor', 'LINE'];
  const statuses = ['Đã hoàn thành', 'Đã hoàn thành', 'Đã hoàn thành', 'Đã huỷ', 'Đã hoàn thành'];
  for (let i = 0; i < 26; i++) {
    const back = 28 - i; const g = 1 + (i % 3);
    B.writeRow_('orders', 0, {
      Ma_Don: 'SY-MAU-' + String(i + 1).padStart(3, '0'), Thoi_Gian_Dat: new Date(Date.now() - (back + 2) * 864e5), Ten_Khach: 'Khách mẫu ' + (i + 1),
      Email: 'mau' + (i + 1) + '@example.com', So_Dien_Thoai: "'09000000" + String(i).padStart(2, '0'), Tai_Khoan_Mang_Xa_Hoi: '',
      Ngay_Hen: "'" + day(-back), Gio_Hen: "'" + ['09:30', '10:00', '11:00', '13:30'][i % 4], So_Khach: g, Goi_Do: p1.Ten_Kimono, Ma_Goi: p1.ID,
      Lam_Toc: i % 2 ? 'Có' : 'Không', Tien_Coc: g * 1000, Trang_Thai: statuses[i % 5], Chi_Nhanh: i % 3 ? asa.ID : gin.ID,
      Chi_Tiet_Khach: 'Nam 0 · Nữ ' + g + ' · Trẻ em 0', Ghi_Chu: '', Ngon_Ngu: ['vi', 'en', 'vi'][i % 3], Nguon: sources[i % sources.length],
      Thanh_Toan: statuses[i % 5] === 'Đã huỷ' ? '' : "'demo · ¥" + g * 1000, Da_Nhac_Lich: '', Cap_Nhat_Luc: new Date()
    });
  }
  // Vài đơn sắp tới (tạo qua luồng đặt lịch thật của backend)
  const mk = (o: any) => post({ action: 'createOrder', branchId: asa.ID, productId: p1.ID, time: '10:00', men: 0, women: 2, kids: 0, hair: true, phone: '090-0000-1111', lang: 'vi', ...o });
  post({ action: 'saveSettings', token: tok(), values: { payment_online: false } });
  mk({ name: 'Khách mẫu A', email: 'a@example.com', date: day(1), source: 'Instagram' });
  mk({ name: 'Khách mẫu B', email: 'b@example.com', date: day(1), time: '11:00', women: 1, men: 1, source: 'Google' });
  mk({ name: 'Khách mẫu C', email: 'c@example.com', date: day(3), branchId: gin.ID, time: '13:00', source: 'TikTok' });
  post({ action: 'saveSettings', token: tok(), values: { payment_online: true } });
  state.outbox = [];
  delete state._seedToken;
  state.seeded = 1;
}

let seedToken = '';
function tok() {
  if (!seedToken) seedToken = post({ action: 'adminLogin', password: 'demo' }).token;
  return seedToken;
}

function post(d: any) { return JSON.parse(B.doPost({ postData: { contents: JSON.stringify(d) } }).getContent()); }
function get(p: any) { return JSON.parse(B.doGet({ parameter: p }).getContent()); }

function init() {
  if (B) return;
  let saved: any = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  state = saved && saved.seeded ? reviveDates(saved) : {};
  const svc: any = createServices(state, persist);
  svc.console = { ...console, log() { /* ẩn log của setup() */ } };
  B = createBackend(svc);
  if (!state.seeded) { seed(); seedToken = ''; persist(); }
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Thay thế fetch('/api'): GET → doGet, POST → doPost */
export async function call(method: 'GET' | 'POST', params: any): Promise<any> {
  init();
  await wait(method === 'GET' ? 120 : 280);
  if (method === 'POST' && params.action === 'uploadImage') {
    const auth = post({ action: 'adminCheck', token: params.token });
    if (!auth.ok) return auth;
    const id = 'u' + Date.now().toString(36);
    saveDemoUpload(id, 'data:' + (params.mime || 'image/jpeg') + ';base64,' + params.data);
    const url = 'https://demo.local/u/' + id;
    if (params.slot) B.upsertImage_(String(params.slot), url, '');
    persist();
    return { ok: true, url, slot: params.slot || '' };
  }
  if (method === 'POST' && params.action === 'analytics') {
    const auth = post({ action: 'adminCheck', token: params.token });
    if (!auth.ok) return auth;
    return sampleAnalytics(Number(params.days) || 30);
  }
  const r = method === 'GET' ? get(params) : post(params);
  if (method === 'POST' && params.action === 'createOrder' && r.ok) r.demo = true;
  return r;
}

/** Thanh toán giả lập (thay cho Stripe Checkout) */
export async function payDemo(id: string) {
  init(); await wait(600);
  const info = post({ action: 'paymentInfo', id, secret: 'demo-worker' });
  if (!info.ok) return info;
  if (info.order.expired) return { ok: false, error: 'expired' };
  return post({ action: 'markPaid', id, payment: 'demo_' + Date.now().toString(36), amount: info.order.amount, secret: 'demo-worker' });
}

export function demoOutbox(): any[] { init(); return (state.outbox || []).slice().reverse(); }
export function demoRunReminders() { init(); return B.sendReminders(); }
export function resetDemo() {
  try { localStorage.removeItem(KEY); localStorage.removeItem('sy_demo_uploads'); sessionStorage.clear(); } catch { /* */ }
  B = null; state = null; seedToken = '';
}

/** Số liệu truy cập MẪU (bản thật lấy từ Cloudflare Web Analytics) */
function sampleAnalytics(days: number) {
  const byDate = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = day(-i); const wd = new Date(d).getDay(); const base = 60 + Math.round(30 * Math.sin(i / 3)) + (wd === 0 || wd === 6 ? 45 : 0);
    byDate.push({ key: d, views: base * 3, visits: base });
  }
  const tot = byDate.reduce((s, x) => s + x.visits, 0);
  const split = (pairs: [string, number][]) => pairs.map(([k, f]) => ({ key: k, views: Math.round(tot * f * 2.8), visits: Math.round(tot * f) }));
  return {
    ok: true, configured: true, sample: true, since: day(-(days - 1)), until: day(0), byDate,
    byReferer: split([['google.com', .38], ['(trực tiếp)', .22], ['instagram.com', .14], ['tiktok.com', .1], ['facebook.com', .07], ['threads.net', .04], ['tripadvisor.com', .03], ['bing.com', .02]]),
    byCountry: split([['Vietnam', .41], ['United States', .14], ['Japan', .12], ['Taiwan', .09], ['Australia', .07], ['Singapore', .06], ['Korea, Republic of', .05], ['France', .03]]),
    byPath: split([['/', .34], ['/dat-lich', .2], ['/goi-thue', .17], ['/bang-gia', .1], ['/blog/7-diem-chup-anh-kimono-dep-nhat-o-asakusa', .08], ['/hoi-dap', .06], ['/tra-cuu', .03]]),
    byDevice: split([['mobile', .74], ['desktop', .22], ['tablet', .04]])
  };
}
