/**
 * =============================================================================
 *  SAKURA YUKI KIMONO RENTAL — BACKEND (Google Apps Script + Google Sheets)
 * =============================================================================
 *  Website gọi file này qua Cloudflare Worker (/api). Toàn bộ dữ liệu nằm trong
 *  Google Sheet chứa script này. Hướng dẫn cài đặt đầy đủ: README.md của dự án.
 *
 *  CÀI ĐẶT NHANH
 *  1. Tạo Google Sheet → Extensions → Apps Script → dán file này → Lưu.
 *  2. Mở hàm `setupSecrets` ở cuối file, điền thông tin, bấm Run 1 lần,
 *     rồi XOÁ giá trị đã điền khỏi code (bí mật được cất trong Script Properties).
 *  3. Chạy `setup` (tạo các tab, dữ liệu mặc định, trigger nhắc lịch) → cấp quyền.
 *  4. Chạy `testNotifications` để thử Telegram/LINE/email.
 *  5. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone.
 *     Copy URL …/exec → đặt vào biến APPS_SCRIPT_URL của Cloudflare Worker.
 *  6. Mỗi lần sửa code: Deploy → Manage deployments → ✎ → New version.
 *
 *  KHÔNG đổi tên tab hoặc tên cột trong Google Sheet.
 * =============================================================================
 */

/* ------------------------------ CẤU HÌNH -------------------------------- */
const CONFIG = {
  TIMEZONE: 'Asia/Tokyo',
  SESSION_HOURS: 6,          // giữ đăng nhập quản trị (tối đa 6)
  CACHE_SEC: 60,             // website nhận thay đổi sau tối đa ~1 phút
  MAX_LIST_ORDERS: 2000
};

/* Bí mật — lưu trong Script Properties, KHÔNG viết vào code:
   ADMIN_PASSWORD (mật khẩu ban đầu), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
   LINE_CHANNEL_TOKEN, LINE_ADMIN_ID, WORKER_SECRET,
   CF_API_TOKEN, CF_ACCOUNT_ID, CF_SITE_TAG (báo cáo lượt truy cập)          */
function secret_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }

/* ------------------------------ BẢNG DỮ LIỆU ---------------------------- */
const SHEETS = {
  products: { name: 'SAN_PHAM', prefix: 'SP', headers: ['ID', 'Ten_Kimono', 'Loai_Goi', 'Gia_JPY', 'Link_Anh', 'Trang_Thai', 'Ten_EN', 'Ten_JA', 'Mo_Ta', 'Mo_Ta_EN', 'Mo_Ta_JA', 'Chi_Nhanh', 'Thu_Tu', 'Anh_Phu', 'Video'] },
  // 4 nhóm "thẻ nội dung" dùng chung cấu trúc: tên, nhãn phụ, mô tả, giá từ, ảnh chính, ảnh phụ (mỗi dòng 1 link), video
  hairs: { name: 'KIEU_TOC', prefix: 'KT', headers: ['ID', 'Ten', 'Ten_EN', 'Nhan', 'Nhan_EN', 'Mo_Ta', 'Mo_Ta_EN', 'Gia_JPY', 'Link_Anh', 'Anh_Phu', 'Video', 'Hien_Thi', 'Thu_Tu'] },
  concepts: { name: 'CONCEPT', prefix: 'CC', headers: ['ID', 'Ten', 'Ten_EN', 'Nhan', 'Nhan_EN', 'Mo_Ta', 'Mo_Ta_EN', 'Gia_JPY', 'Link_Anh', 'Anh_Phu', 'Video', 'Hien_Thi', 'Thu_Tu'] },
  services: { name: 'DICH_VU', prefix: 'DV', headers: ['ID', 'Ten', 'Ten_EN', 'Nhan', 'Nhan_EN', 'Mo_Ta', 'Mo_Ta_EN', 'Gia_JPY', 'Link_Anh', 'Anh_Phu', 'Video', 'Hien_Thi', 'Thu_Tu'] },
  // Nhóm kimono: mô tả cho từng mục ở trang "Gói thuê" (cột Ten phải trùng với Loai_Goi của trang phục)
  cats: { name: 'NHOM_KIMONO', prefix: 'NK', headers: ['ID', 'Ten', 'Ten_EN', 'Nhan', 'Nhan_EN', 'Mo_Ta', 'Mo_Ta_EN', 'Gia_JPY', 'Link_Anh', 'Anh_Phu', 'Video', 'Hien_Thi', 'Thu_Tu'] },
  // Gói chụp ảnh: thêm thời lượng, số ảnh, loại nhóm (dùng cho bộ chọn Solo/Đôi/Nhóm)
  photoshoots: { name: 'GOI_CHUP', prefix: 'GC', headers: ['ID', 'Ten', 'Ten_EN', 'Nhan', 'Nhan_EN', 'Mo_Ta', 'Mo_Ta_EN', 'Gia_JPY', 'Link_Anh', 'Anh_Phu', 'Video', 'Hien_Thi', 'Thu_Tu', 'Thoi_Luong', 'So_Anh', 'Loai_Nhom'] },
  branches: { name: 'CHI_NHANH', prefix: 'CN', headers: ['ID', 'Ten', 'Ten_EN', 'Ten_JA', 'Dia_Chi', 'Ghi_Chu_Dia_Chi', 'Dien_Thoai', 'Gio_Mo_Cua', 'Map_Link', 'Map_Embed', 'Slot_Start', 'Slot_End', 'Slot_Minutes', 'Suc_Chua', 'Ngay_Nghi', 'Telegram_Chat_ID', 'Hien_Thi', 'Thu_Tu'] },
  posts: { name: 'BAI_VIET', prefix: 'BV', headers: ['ID', 'Slug', 'Tieu_De', 'Tom_Tat', 'Noi_Dung', 'Anh_Bia', 'Ngon_Ngu', 'Trang_Thai', 'Ngay_Dang', 'Cap_Nhat_Luc', 'Thu_Tu'] },
  faqs: { name: 'HOI_DAP', prefix: 'HD', headers: ['ID', 'Cau_Hoi', 'Tra_Loi', 'Cau_Hoi_EN', 'Tra_Loi_EN', 'Cau_Hoi_JA', 'Tra_Loi_JA', 'Hien_Thi', 'Thu_Tu', 'Nhom', 'Nhom_EN'] },
  reviews: { name: 'DANH_GIA', prefix: 'DG', headers: ['ID', 'Ten_Khach', 'Ngon_Ngu', 'So_Sao', 'Noi_Dung', 'Hien_Thi', 'Thu_Tu'] },
  orders: { name: 'DON_HANG', headers: ['Ma_Don', 'Thoi_Gian_Dat', 'Ten_Khach', 'Email', 'So_Dien_Thoai', 'Tai_Khoan_Mang_Xa_Hoi', 'Ngay_Hen', 'Gio_Hen', 'So_Khach', 'Goi_Do', 'Lam_Toc', 'Tien_Coc', 'Trang_Thai', 'Chi_Nhanh', 'Chi_Tiet_Khach', 'Ghi_Chu', 'Ngon_Ngu', 'Nguon', 'Thanh_Toan', 'Da_Nhac_Lich', 'Cap_Nhat_Luc', 'Ma_Goi'] },
  images: { name: 'ANH_WEBSITE', headers: ['Slot', 'URL', 'Drive_File_ID', 'Cap_Nhat_Luc'] },
  settings: { name: 'CAI_DAT', headers: ['Khoa', 'Gia_Tri', 'Mo_Ta'] }
};

const PRODUCT_STATUSES = ['Có sẵn', 'Đang giặt', 'Tạm ẩn', 'Hết hàng'];
const HIDDEN_PRODUCT = ['Tạm ẩn', 'Hết hàng'];
const ORDER_STATUSES = ['Chờ thanh toán', 'Chờ xác nhận', 'Đã nhận cọc', 'Đang phục vụ', 'Đã hoàn thành', 'Đã huỷ'];
const POST_STATUSES = ['Nháp', 'Đã đăng'];

/* --------------------------- CÀI ĐẶT (CAI_DAT) --------------------------- */
// [khoá, mặc định, kiểu, nhóm, nhãn]
const SETTINGS_SCHEMA = [
  ['booking_enabled', true, 'bool', 'Đặt lịch', 'Nhận đặt lịch online'],
  ['booking_closed_message', 'Hiện tiệm tạm ngưng nhận đặt lịch online. Vui lòng nhắn LINE/Telegram để được hỗ trợ.', 'textarea', 'Đặt lịch', 'Thông báo khi tạm ngưng'],
  ['deposit_per_person', 1000, 'number', 'Đặt lịch', 'Tiền cọc mỗi khách (JPY)'],
  ['max_guests', 20, 'number', 'Đặt lịch', 'Số khách tối đa mỗi đơn'],
  ['min_hours_ahead', 2, 'number', 'Đặt lịch', 'Phải đặt trước ít nhất (giờ)'],
  ['return_by', '17:30', 'time', 'Đặt lịch', 'Giờ trả đồ'],
  ['payment_online', false, 'bool', 'Thanh toán', 'Bắt buộc trả cọc online (thẻ / PayPay qua Stripe)'],
  ['payment_hold_minutes', 35, 'number', 'Thanh toán', 'Giữ chỗ chờ thanh toán (phút), quá hạn tự huỷ'],
  ['notify_telegram', true, 'bool', 'Thông báo', 'Báo đơn mới qua Telegram'],
  ['notify_line', true, 'bool', 'Thông báo', 'Báo đơn mới qua LINE (gói miễn phí 200 tin/tháng)'],
  ['email_customer', true, 'bool', 'Thông báo', 'Gửi email xác nhận cho khách'],
  ['email_status', true, 'bool', 'Thông báo', 'Gửi email khi đổi trạng thái đơn'],
  ['reminder_enabled', true, 'bool', 'Thông báo', 'Email nhắc lịch 1 ngày trước giờ hẹn'],
  ['reminder_hour', 18, 'number', 'Thông báo', 'Giờ gửi email nhắc (0–23, giờ Nhật)'],
  ['email_admin_copy', '', 'text', 'Thông báo', 'Gửi bản sao đơn mới tới email (để trống = không gửi)'],
  ['theme_default', 'light', 'select:light|dark|auto', 'Giao diện', 'Chế độ mặc định (light = sáng, dark = tối, auto = theo máy khách)'],
  ['theme_toggle', true, 'bool', 'Giao diện', 'Cho khách tự đổi sáng/tối'],
  ['announcement_enabled', false, 'bool', 'Giao diện', 'Hiện dòng thông báo đầu trang'],
  ['announcement_vi', '', 'text', 'Giao diện', 'Thông báo (Tiếng Việt)'],
  ['announcement_en', '', 'text', 'Giao diện', 'Thông báo (English)'],
  ['announcement_ja', '', 'text', 'Giao diện', 'Thông báo (日本語)'],
  ['announcement_link', '', 'text', 'Giao diện', 'Link khi bấm thông báo (tuỳ chọn)'],
  ['home_show_featured', true, 'bool', 'Giao diện', 'Trang chủ: hiện gói nổi bật'],
  ['home_show_reviews', true, 'bool', 'Giao diện', 'Trang chủ: hiện đánh giá khách'],
  ['home_show_blog', true, 'bool', 'Giao diện', 'Trang chủ: hiện bài blog mới'],
  ['home_show_concepts', true, 'bool', 'Giao diện', 'Trang chủ: hiện mục Concept kimono'],
  ['home_show_photoshoot', true, 'bool', 'Giao diện', 'Trang chủ: hiện mục Gói chụp ảnh'],
  ['home_show_services', true, 'bool', 'Giao diện', 'Trang chủ: hiện mục Dịch vụ kèm theo'],
  ['home_show_hairs', true, 'bool', 'Giao diện', 'Trang chủ: hiện mục Kiểu tóc'],
  ['google_rating', '', 'text', 'Thông tin tiệm', 'Điểm đánh giá Google (vd 4.9) — để trống = ẩn huy hiệu'],
  ['google_reviews', '', 'text', 'Thông tin tiệm', 'Số lượt đánh giá Google (vd 2.300+)'],
  ['google_reviews_url', '', 'text', 'Thông tin tiệm', 'Link trang đánh giá Google Maps'],
  ['shop_name', 'Sakura Yuki Kimono Rental', 'text', 'Thông tin tiệm', 'Tên tiệm'],
  ['shop_kanji', '桜雪', 'text', 'Thông tin tiệm', 'Tên chữ Nhật (logo)'],
  ['shop_tagline_vi', 'Thuê kimono cao cấp tại Tokyo', 'text', 'Thông tin tiệm', 'Khẩu hiệu (VI)'],
  ['shop_tagline_en', 'Premium kimono rental in Tokyo', 'text', 'Thông tin tiệm', 'Khẩu hiệu (EN)'],
  ['shop_tagline_ja', '東京の上質な着物レンタル', 'text', 'Thông tin tiệm', 'Khẩu hiệu (JA)'],
  ['shop_phone', '', 'text', 'Thông tin tiệm', 'Điện thoại chung'],
  ['shop_whatsapp', '', 'text', 'Thông tin tiệm', 'WhatsApp (số, không dấu +)'],
  ['shop_email', '', 'text', 'Thông tin tiệm', 'Email liên hệ'],
  ['line_id', '', 'text', 'Thông tin tiệm', 'LINE Official Account ID (vd @sakurayuki)'],
  ['line_url', '', 'text', 'Thông tin tiệm', 'Link LINE (vd https://line.me/R/ti/p/@sakurayuki)'],
  ['telegram_user', '', 'text', 'Thông tin tiệm', 'Telegram username của tiệm'],
  ['telegram_url', '', 'text', 'Thông tin tiệm', 'Link Telegram (vd https://t.me/sakurayuki)'],
  ['facebook', '', 'text', 'Mạng xã hội', 'Facebook'],
  ['instagram', '', 'text', 'Mạng xã hội', 'Instagram'],
  ['tiktok', '', 'text', 'Mạng xã hội', 'TikTok'],
  ['threads', '', 'text', 'Mạng xã hội', 'Threads'],
  ['stats_kimono', '', 'text', 'Thông tin tiệm', 'Số mẫu kimono hiển thị ở trang chủ (để trống = ẩn)'],
  ['stats_guests', '', 'text', 'Thông tin tiệm', 'Số khách đã phục vụ (để trống = ẩn)'],
  ['website_url', '', 'text', 'Kỹ thuật', 'Địa chỉ website (vd https://sakurayuki.jp) — dùng trong email'],
  // Chữ trên trang chủ — để trống = dùng câu mặc định của website
  ['txt_hero_kicker_vi', '', 'text', 'Nội dung trang chủ', 'Ảnh bìa: dòng chữ nhỏ phía trên (Tiếng Việt)'],
  ['txt_hero_kicker_en', '', 'text', 'Nội dung trang chủ', 'Ảnh bìa: dòng chữ nhỏ phía trên (English)'],
  ['txt_hero_title_vi', '', 'text', 'Nội dung trang chủ', 'Ảnh bìa: tiêu đề lớn (Tiếng Việt)'],
  ['txt_hero_title_en', '', 'text', 'Nội dung trang chủ', 'Ảnh bìa: tiêu đề lớn (English)'],
  ['txt_hero_sub_vi', '', 'textarea', 'Nội dung trang chủ', 'Ảnh bìa: dòng mô tả (Tiếng Việt)'],
  ['txt_hero_sub_en', '', 'textarea', 'Nội dung trang chủ', 'Ảnh bìa: dòng mô tả (English)'],
  ['txt_intro_title_vi', '', 'text', 'Nội dung trang chủ', 'Giới thiệu: tiêu đề (Tiếng Việt)'],
  ['txt_intro_title_en', '', 'text', 'Nội dung trang chủ', 'Giới thiệu: tiêu đề (English)'],
  ['txt_intro_text_vi', '', 'textarea', 'Nội dung trang chủ', 'Giới thiệu: đoạn văn (Tiếng Việt)'],
  ['txt_intro_text_en', '', 'textarea', 'Nội dung trang chủ', 'Giới thiệu: đoạn văn (English)'],
  ['txt_intro_bullets_vi', '', 'textarea', 'Nội dung trang chủ', 'Giới thiệu: các gạch đầu dòng (mỗi dòng 1 ý) (Tiếng Việt)'],
  ['txt_intro_bullets_en', '', 'textarea', 'Nội dung trang chủ', 'Giới thiệu: các gạch đầu dòng (mỗi dòng 1 ý) (English)'],
  ['txt_why_title_vi', '', 'text', 'Nội dung trang chủ', 'Vì sao chọn: tiêu đề (Tiếng Việt)'],
  ['txt_why_title_en', '', 'text', 'Nội dung trang chủ', 'Vì sao chọn: tiêu đề (English)'],
  ['txt_why1_title_vi', '', 'text', 'Nội dung trang chủ', 'Lý do 1: tiêu đề (Tiếng Việt)'],
  ['txt_why1_title_en', '', 'text', 'Nội dung trang chủ', 'Lý do 1: tiêu đề (English)'],
  ['txt_why1_text_vi', '', 'textarea', 'Nội dung trang chủ', 'Lý do 1: nội dung (Tiếng Việt)'],
  ['txt_why1_text_en', '', 'textarea', 'Nội dung trang chủ', 'Lý do 1: nội dung (English)'],
  ['txt_why2_title_vi', '', 'text', 'Nội dung trang chủ', 'Lý do 2: tiêu đề (Tiếng Việt)'],
  ['txt_why2_title_en', '', 'text', 'Nội dung trang chủ', 'Lý do 2: tiêu đề (English)'],
  ['txt_why2_text_vi', '', 'textarea', 'Nội dung trang chủ', 'Lý do 2: nội dung (Tiếng Việt)'],
  ['txt_why2_text_en', '', 'textarea', 'Nội dung trang chủ', 'Lý do 2: nội dung (English)'],
  ['txt_why3_title_vi', '', 'text', 'Nội dung trang chủ', 'Lý do 3: tiêu đề (Tiếng Việt)'],
  ['txt_why3_title_en', '', 'text', 'Nội dung trang chủ', 'Lý do 3: tiêu đề (English)'],
  ['txt_why3_text_vi', '', 'textarea', 'Nội dung trang chủ', 'Lý do 3: nội dung (Tiếng Việt)'],
  ['txt_why3_text_en', '', 'textarea', 'Nội dung trang chủ', 'Lý do 3: nội dung (English)'],
  ['txt_styles_title_vi', '', 'text', 'Nội dung trang chủ', 'Kiểu kimono: tiêu đề (Tiếng Việt)'],
  ['txt_styles_title_en', '', 'text', 'Nội dung trang chủ', 'Kiểu kimono: tiêu đề (English)'],
  ['txt_styles_sub_vi', '', 'text', 'Nội dung trang chủ', 'Kiểu kimono: dòng mô tả (Tiếng Việt)'],
  ['txt_styles_sub_en', '', 'text', 'Nội dung trang chủ', 'Kiểu kimono: dòng mô tả (English)'],
  ['txt_concepts_title_vi', '', 'text', 'Nội dung trang chủ', 'Concept: tiêu đề (Tiếng Việt)'],
  ['txt_concepts_title_en', '', 'text', 'Nội dung trang chủ', 'Concept: tiêu đề (English)'],
  ['txt_concepts_sub_vi', '', 'text', 'Nội dung trang chủ', 'Concept: dòng mô tả (Tiếng Việt)'],
  ['txt_concepts_sub_en', '', 'text', 'Nội dung trang chủ', 'Concept: dòng mô tả (English)'],
  ['txt_photo_title_vi', '', 'text', 'Nội dung trang chủ', 'Gói chụp ảnh: tiêu đề (Tiếng Việt)'],
  ['txt_photo_title_en', '', 'text', 'Nội dung trang chủ', 'Gói chụp ảnh: tiêu đề (English)'],
  ['txt_photo_sub_vi', '', 'text', 'Nội dung trang chủ', 'Gói chụp ảnh: dòng mô tả (Tiếng Việt)'],
  ['txt_photo_sub_en', '', 'text', 'Nội dung trang chủ', 'Gói chụp ảnh: dòng mô tả (English)'],
  ['txt_photo_note_vi', '', 'textarea', 'Nội dung trang chủ', 'Gói chụp ảnh: ghi chú về giá (Tiếng Việt)'],
  ['txt_photo_note_en', '', 'textarea', 'Nội dung trang chủ', 'Gói chụp ảnh: ghi chú về giá (English)'],
  ['txt_services_title_vi', '', 'text', 'Nội dung trang chủ', 'Dịch vụ kèm theo: tiêu đề (Tiếng Việt)'],
  ['txt_services_title_en', '', 'text', 'Nội dung trang chủ', 'Dịch vụ kèm theo: tiêu đề (English)'],
  ['txt_services_sub_vi', '', 'textarea', 'Nội dung trang chủ', 'Dịch vụ kèm theo: dòng mô tả (Tiếng Việt)'],
  ['txt_services_sub_en', '', 'textarea', 'Nội dung trang chủ', 'Dịch vụ kèm theo: dòng mô tả (English)'],
  ['txt_banner_eyebrow_vi', '', 'text', 'Nội dung trang chủ', 'Băng ảnh lớn: dòng chữ nhỏ (Tiếng Việt)'],
  ['txt_banner_eyebrow_en', '', 'text', 'Nội dung trang chủ', 'Băng ảnh lớn: dòng chữ nhỏ (English)'],
  ['txt_banner_title_vi', '', 'text', 'Nội dung trang chủ', 'Băng ảnh lớn: tiêu đề (Tiếng Việt)'],
  ['txt_banner_title_en', '', 'text', 'Nội dung trang chủ', 'Băng ảnh lớn: tiêu đề (English)'],
  ['txt_banner_text_vi', '', 'textarea', 'Nội dung trang chủ', 'Băng ảnh lớn: nội dung (Tiếng Việt)'],
  ['txt_banner_text_en', '', 'textarea', 'Nội dung trang chủ', 'Băng ảnh lớn: nội dung (English)'],
  ['txt_cta_title_vi', '', 'text', 'Nội dung trang chủ', 'Cuối trang: lời kêu gọi (Tiếng Việt)'],
  ['txt_cta_title_en', '', 'text', 'Nội dung trang chủ', 'Cuối trang: lời kêu gọi (English)'],
  ['txt_cta_sub_vi', '', 'text', 'Nội dung trang chủ', 'Cuối trang: dòng phụ (Tiếng Việt)'],
  ['txt_cta_sub_en', '', 'text', 'Nội dung trang chủ', 'Cuối trang: dòng phụ (English)'],
  // Giá & công cụ tính giá
  ['price_hair', 0, 'number', 'Đặt lịch', 'Giá làm tóc mỗi khách (JPY) — 0 = miễn phí / đã gồm'],
  ['card_fee_percent', 0, 'number', 'Thanh toán', 'Phụ phí thẻ & ví điện tử (%) — 0 = không hiện giá thẻ'],
  ['calc_enabled', true, 'bool', 'Đặt lịch', 'Hiện trang "Tính giá nhanh"'],
  // Chữ trên các trang con — để trống = dùng câu mặc định của website.
  // Ô "danh sách" viết mỗi dòng một ý; dòng có dấu | sẽ tách thành "Tiêu đề | Nội dung".
  ['txt_plans_intro_vi', '', 'textarea', 'Nội dung trang con', 'Gói thuê: đoạn giới thiệu đầu trang (Tiếng Việt)'],
  ['txt_plans_intro_en', '', 'textarea', 'Nội dung trang con', 'Gói thuê: đoạn giới thiệu đầu trang (English)'],
  ['txt_choose_title_vi', '', 'text', 'Nội dung trang con', 'Gói thuê: tiêu đề mục "Cách chọn kimono" (Tiếng Việt)'],
  ['txt_choose_title_en', '', 'text', 'Nội dung trang con', 'Gói thuê: tiêu đề mục "Cách chọn kimono" (English)'],
  ['txt_choose_items_vi', '', 'textarea', 'Nội dung trang con', 'Gói thuê: các gợi ý chọn kimono — mỗi dòng "Tiêu đề | Nội dung" (Tiếng Việt)'],
  ['txt_choose_items_en', '', 'textarea', 'Nội dung trang con', 'Gói thuê: các gợi ý chọn kimono — mỗi dòng "Tiêu đề | Nội dung" (English)'],
  ['txt_include_items_vi', '', 'textarea', 'Nội dung trang con', 'Bảng giá: những gì đã gồm trong giá — mỗi dòng 1 ý (Tiếng Việt)'],
  ['txt_include_items_en', '', 'textarea', 'Nội dung trang con', 'Bảng giá: những gì đã gồm trong giá — mỗi dòng 1 ý (English)'],
  ['txt_pricing_note_vi', '', 'textarea', 'Nội dung trang con', 'Bảng giá: ghi chú về cách tính giá (Tiếng Việt)'],
  ['txt_pricing_note_en', '', 'textarea', 'Nội dung trang con', 'Bảng giá: ghi chú về cách tính giá (English)'],
  ['txt_policies_title_vi', '', 'text', 'Nội dung trang con', 'Chính sách: tiêu đề mục (Tiếng Việt)'],
  ['txt_policies_title_en', '', 'text', 'Nội dung trang con', 'Chính sách: tiêu đề mục (English)'],
  ['txt_policies_items_vi', '', 'textarea', 'Nội dung trang con', 'Chính sách: các khoản — mỗi dòng "Tiêu đề | Nội dung" (Tiếng Việt)'],
  ['txt_policies_items_en', '', 'textarea', 'Nội dung trang con', 'Chính sách: các khoản — mỗi dòng "Tiêu đề | Nội dung" (English)'],
  ['txt_photo_steps_vi', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: quy trình nhận ảnh — mỗi dòng "Tiêu đề | Nội dung" (Tiếng Việt)'],
  ['txt_photo_steps_en', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: quy trình nhận ảnh — mỗi dòng "Tiêu đề | Nội dung" (English)'],
  ['txt_photo_included_vi', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: mọi gói đều có — mỗi dòng 1 ý (Tiếng Việt)'],
  ['txt_photo_included_en', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: mọi gói đều có — mỗi dòng 1 ý (English)'],
  ['txt_photo_options_vi', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: tuỳ chọn thêm — mỗi dòng "Tên | Giá/ghi chú" (Tiếng Việt)'],
  ['txt_photo_options_en', '', 'textarea', 'Nội dung trang con', 'Chụp ảnh: tuỳ chọn thêm — mỗi dòng "Tên | Giá/ghi chú" (English)'],
  ['txt_access_note_vi', '', 'textarea', 'Nội dung trang con', 'Liên hệ: ghi chú đường đi / nhóm đông (Tiếng Việt)'],
  ['txt_access_note_en', '', 'textarea', 'Nội dung trang con', 'Liên hệ: ghi chú đường đi / nhóm đông (English)'],
  ['txt_book_online_vi', '', 'textarea', 'Nội dung trang con', 'Đặt lịch: ai nên đặt online — mỗi dòng 1 ý (Tiếng Việt)'],
  ['txt_book_online_en', '', 'textarea', 'Nội dung trang con', 'Đặt lịch: ai nên đặt online — mỗi dòng 1 ý (English)'],
  ['txt_book_chat_vi', '', 'textarea', 'Nội dung trang con', 'Đặt lịch: khi nào nên nhắn tin — mỗi dòng 1 ý (Tiếng Việt)'],
  ['txt_book_chat_en', '', 'textarea', 'Nội dung trang con', 'Đặt lịch: khi nào nên nhắn tin — mỗi dòng 1 ý (English)'],
  ['cf_beacon_token', '', 'text', 'Kỹ thuật', 'Cloudflare Web Analytics token (đếm lượt truy cập)']
];

/* ================================ ROUTER ================================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case 'site': return json_({ ok: true, site: getSite_() });
      case 'post': return json_(getPost_(p.slug));
      case 'availability': return json_(availability_(p.branch, p.date));
      case 'lookup': return json_(lookupOrders_(p.q));
      default: return json_({ ok: true, service: 'Sakura Yuki API', time: new Date().toISOString() });
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Yêu cầu rỗng');
    const d = JSON.parse(e.postData.contents);
    switch (d.action) {
      // ---------- khách ----------
      case 'createOrder': return json_(createOrder_(d));
      case 'lookup': return json_(lookupOrders_(d.q));
      case 'orderStatus': return json_(orderStatus_(d.id, d.email));
      case 'availability': return json_(availability_(d.branch, d.date));
      // ---------- Cloudflare Worker (thanh toán) ----------
      case 'paymentInfo': requireWorker_(d.secret); return json_(paymentInfo_(d.id));
      case 'markPaid': requireWorker_(d.secret); return json_(markPaid_(d.id, d.payment, d.amount));
      // ---------- quản trị ----------
      case 'adminLogin': return json_(adminLogin_(d.password));
      case 'adminLogout': return json_(adminLogout_(d.token));
      case 'adminCheck': requireAdmin_(d.token); return json_({ ok: true });
      case 'changePassword': requireAdmin_(d.token); return json_(changePassword_(d.current, d.next));
      case 'getSettings': requireAdmin_(d.token); return json_(getSettingsAdmin_());
      case 'saveSettings': requireAdmin_(d.token); return json_(saveSettings_(d.values));
      case 'list': requireAdmin_(d.token); return json_({ ok: true, items: listItems_(d.collection) });
      case 'save': requireAdmin_(d.token); return json_(saveItem_(d.collection, d.item));
      case 'delete': requireAdmin_(d.token); return json_(deleteItem_(d.collection, d.id));
      case 'reorder': requireAdmin_(d.token); return json_(reorder_(d.collection, d.ids));
      case 'listOrders': requireAdmin_(d.token); return json_({ ok: true, orders: listOrders_(), statuses: ORDER_STATUSES });
      case 'updateOrderStatus': requireAdmin_(d.token); return json_(updateOrderStatus_(d.orderId, d.status));
      case 'listImages': requireAdmin_(d.token); return json_({ ok: true, images: getImages_() });
      case 'uploadImage': requireAdmin_(d.token); return json_(uploadImage_(d));
      case 'setImageUrl': requireAdmin_(d.token); return json_(setImageUrl_(d.slot, d.url));
      case 'deleteImage': requireAdmin_(d.token); return json_(deleteImage_(d.slot));
      case 'analytics': requireAdmin_(d.token); return json_(analytics_(d.days));
      case 'testNotify': requireAdmin_(d.token); return json_(testNotify_());
      case 'runReminders': requireAdmin_(d.token); return json_({ ok: true, sent: sendReminders() });
      default: throw new Error('Hành động không hợp lệ');
    }
  } catch (err) {
    console.error(err);
    const msg = String(err.message || err);
    return json_({ ok: false, error: msg, unauthorized: msg === 'UNAUTHORIZED' });
  }
}

/* ============================ SHEET HELPERS ============================= */

function sheet_(key) {
  const def = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(def.name);
  if (!sh) sh = ss.insertSheet(def.name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(def.headers);
    sh.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#8B263E').setFontColor('#FAF8F5');
    sh.setFrozenRows(1);
  } else {
    // bổ sung cột mới (khi nâng cấp từ bản cũ)
    const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    def.headers.forEach(h => {
      if (have.indexOf(h) < 0) {
        const c = have.length + 1;
        sh.getRange(1, c).setValue(h).setFontWeight('bold').setBackground('#8B263E').setFontColor('#FAF8F5');
        have.push(h);
      }
    });
  }
  return sh;
}

function headerMap_(sh) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const m = {}; head.forEach((h, i) => { if (h) m[h] = i; });
  return { head: head, m: m };
}

/** Đọc toàn bộ bảng thành mảng object theo tên cột */
function readRows_(key) {
  const sh = sheet_(key), last = sh.getLastRow();
  if (last < 2) return [];
  const hm = headerMap_(sh);
  const vals = sh.getRange(2, 1, last - 1, hm.head.length).getValues();
  return vals.map((r, i) => {
    const o = { _row: i + 2 };
    hm.head.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });
}

function writeRow_(key, row, obj) {
  const sh = sheet_(key), hm = headerMap_(sh);
  const arr = hm.head.map(h => (h in obj ? obj[h] : ''));
  if (row) {
    const cur = sh.getRange(row, 1, 1, hm.head.length).getValues()[0];
    const merged = hm.head.map((h, j) => (h in obj ? obj[h] : cur[j]));
    sh.getRange(row, 1, 1, hm.head.length).setValues([merged]);
    return row;
  }
  sh.appendRow(arr);
  return sh.getLastRow();
}

function setCell_(key, row, col, value) {
  const sh = sheet_(key), hm = headerMap_(sh);
  if (!(col in hm.m)) throw new Error('Thiếu cột ' + col);
  sh.getRange(row, hm.m[col] + 1).setValue(value);
}

const str_ = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max || 500);
const int_ = (v, min, max) => Math.max(min, Math.min(max, parseInt(v, 10) || 0));
const bool_ = v => v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1' || v === 'Có';
const safe_ = v => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
const text_ = v => typeof v === 'string' ? "'" + v : v;            // giữ nguyên dạng chữ trong Sheets
const fmtDate_ = (v, f) => v instanceof Date ? Utilities.formatDate(v, CONFIG.TIMEZONE, f) : String(v == null ? '' : v);
const today_ = () => Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
const nowHM_ = () => Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'HH:mm');
const byOrder_ = (a, b) => (Number(a.Thu_Tu) || 9999) - (Number(b.Thu_Tu) || 9999) || String(a.ID).localeCompare(String(b.ID));

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function escHtml_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/** Link chia sẻ Google Drive / Imgur → link ảnh trực tiếp. Cloudinary giữ nguyên. */
function normalizeImage_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  let m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{20,})/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
  m = url.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?!a\/|gallery\/)(\w{5,8})$/);
  if (m) return 'https://i.imgur.com/' + m[1] + '.jpg';
  return url;
}

/* =============================== CACHE ================================== */
// CacheService giới hạn ~100KB mỗi giá trị → chia nhỏ
function cacheGet_(key) {
  const c = CacheService.getScriptCache();
  const n = Number(c.get(key + ':n') || 0);
  if (!n) return null;
  const keys = []; for (let i = 0; i < n; i++) keys.push(key + ':' + i);
  const parts = c.getAll(keys); let s = '';
  for (let i = 0; i < keys.length; i++) { if (parts[keys[i]] == null) return null; s += parts[keys[i]]; }
  try { return JSON.parse(s); } catch (_) { return null; }
}
function cachePut_(key, obj, ttl) {
  const s = JSON.stringify(obj), size = 30000, n = Math.ceil(s.length / size) || 1, m = {};
  for (let i = 0; i < n; i++) m[key + ':' + i] = s.substr(i * size, size);
  m[key + ':n'] = String(n);
  try { CacheService.getScriptCache().putAll(m, ttl || CONFIG.CACHE_SEC); } catch (err) { console.warn('cache', err); }
}
function cacheClear_() { const c = CacheService.getScriptCache(); c.remove('site:n'); c.remove('settings:n'); }

/* =============================== CÀI ĐẶT ================================ */

function parseSetting_(type, v) {
  if (type === 'bool') return bool_(v);
  if (type === 'number') return Number(v) || 0;
  if (type === 'time') return v instanceof Date ? fmtDate_(v, 'HH:mm') : String(v || '');
  return String(v == null ? '' : v);
}

function getSettings_() {
  const hit = cacheGet_('settings');
  if (hit) return hit;
  const out = {};
  SETTINGS_SCHEMA.forEach(s => out[s[0]] = s[1]);
  readRows_('settings').forEach(r => {
    const def = SETTINGS_SCHEMA.filter(s => s[0] === r.Khoa)[0];
    if (def && r.Gia_Tri !== '') out[r.Khoa] = parseSetting_(def[2], r.Gia_Tri);
  });
  cachePut_('settings', out, 300);
  return out;
}

function getSettingsAdmin_() {
  const p = PropertiesService.getScriptProperties();
  let emailQuota = null; try { emailQuota = MailApp.getRemainingDailyQuota(); } catch (_) {}
  return {
    ok: true,
    settings: getSettings_(),
    schema: SETTINGS_SCHEMA.map(s => ({ key: s[0], type: s[2], group: s[3], label: s[4] })),
    status: {
      telegram: !!(p.getProperty('TELEGRAM_BOT_TOKEN') && p.getProperty('TELEGRAM_CHAT_ID')),
      line: !!(p.getProperty('LINE_CHANNEL_TOKEN') && p.getProperty('LINE_ADMIN_ID')),
      worker: !!p.getProperty('WORKER_SECRET'),
      analytics: !!(p.getProperty('CF_API_TOKEN') && p.getProperty('CF_ACCOUNT_ID') && p.getProperty('CF_SITE_TAG')),
      emailQuota: emailQuota,
      reminderTrigger: hasTrigger_('sendReminders')
    }
  };
}

function saveSettings_(values) {
  if (!values || typeof values !== 'object') throw new Error('Thiếu dữ liệu');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const rows = readRows_('settings');
    const oldHour = getSettings_().reminder_hour;
    SETTINGS_SCHEMA.forEach(s => {
      if (!(s[0] in values)) return;
      let v = values[s[0]];
      if (s[2] === 'bool') v = bool_(v);
      else if (s[2] === 'number') { v = Number(v); if (!isFinite(v)) throw new Error('Giá trị số không hợp lệ: ' + s[4]); }
      else if (s[2].indexOf('select:') === 0) { if (s[2].slice(7).split('|').indexOf(String(v)) < 0) throw new Error('Lựa chọn không hợp lệ: ' + s[4]); }
      else v = text_(str_(v, 2000));
      const r = rows.filter(x => x.Khoa === s[0])[0];
      writeRow_('settings', r ? r._row : 0, { Khoa: s[0], Gia_Tri: v, Mo_Ta: s[4] });
    });
    cacheClear_();
    const st = getSettings_();
    if (Number(st.reminder_hour) !== Number(oldHour)) installTriggers_();
    return { ok: true, settings: st };
  } finally { lock.releaseLock(); }
}

/* ============================ DỮ LIỆU WEBSITE =========================== */

function getSite_() {
  const hit = cacheGet_('site');
  if (hit) return hit;
  const today = today_();
  const site = {
    settings: getSettings_(),
    branches: readRows_('branches').filter(b => bool_(b.Hien_Thi)).sort(byOrder_).map(publicBranch_),
    products: readRows_('products').filter(p => p.ID && HIDDEN_PRODUCT.indexOf(String(p.Trang_Thai)) < 0).sort(byOrder_).map(publicProduct_),
    faqs: readRows_('faqs').filter(f => bool_(f.Hien_Thi)).sort(byOrder_).map(f => ({
      id: f.ID, q: { vi: f.Cau_Hoi, en: f.Cau_Hoi_EN }, a: { vi: f.Tra_Loi, en: f.Tra_Loi_EN },
      group: { vi: String(f.Nhom || ''), en: String(f.Nhom_EN || f.Nhom || '') } })),
    reviews: readRows_('reviews').filter(r => bool_(r.Hien_Thi)).sort(byOrder_).map(r => ({
      id: r.ID, name: r.Ten_Khach, lang: r.Ngon_Ngu, stars: int_(r.So_Sao, 1, 5), text: r.Noi_Dung })),
    posts: readRows_('posts').filter(p => p.Trang_Thai === 'Đã đăng' && fmtDate_(p.Ngay_Dang, 'yyyy-MM-dd') <= today)
      .sort((a, b) => fmtDate_(b.Ngay_Dang, 'yyyy-MM-dd').localeCompare(fmtDate_(a.Ngay_Dang, 'yyyy-MM-dd')))
      .map(p => publicPost_(p, false)),
    hairs: publicCards_('hairs'), concepts: publicCards_('concepts'), photoshoots: publicCards_('photoshoots'),
    services: publicCards_('services'), cats: publicCards_('cats'),
    images: getImages_()
  };
  cachePut_('site', site, CONFIG.CACHE_SEC);
  return site;
}

function publicBranch_(b) {
  return {
    id: String(b.ID), name: { vi: b.Ten, en: b.Ten_EN || b.Ten, ja: b.Ten_JA || b.Ten },
    address: b.Dia_Chi, addressNote: b.Ghi_Chu_Dia_Chi, phone: b.Dien_Thoai, hours: b.Gio_Mo_Cua,
    mapLink: b.Map_Link, mapEmbed: b.Map_Embed,
    slotStart: fmtDate_(b.Slot_Start, 'HH:mm') || '09:00', slotEnd: fmtDate_(b.Slot_End, 'HH:mm') || '17:00',
    slotMinutes: Number(b.Slot_Minutes) || 30, capacity: Number(b.Suc_Chua) || 0,
    closedDates: parseDates_(b.Ngay_Nghi)
  };
}

function publicProduct_(p) {
  return {
    id: String(p.ID), category: String(p.Loai_Goi || 'Khác'), price: Number(p.Gia_JPY) || 0,
    image: normalizeImage_(p.Link_Anh), images: imageList_(p.Link_Anh, p.Anh_Phu), video: String(p.Video || ''), status: String(p.Trang_Thai || 'Có sẵn'),
    name: { vi: p.Ten_Kimono, en: p.Ten_EN || p.Ten_Kimono, ja: p.Ten_JA || p.Ten_Kimono },
    desc: { vi: p.Mo_Ta, en: p.Mo_Ta_EN || p.Mo_Ta, ja: p.Mo_Ta_JA || p.Mo_Ta },
    branches: String(p.Chi_Nhanh || '').split(/[,\s]+/).filter(Boolean)
  };
}

/** Ảnh chính + ảnh phụ (mỗi dòng 1 link) → mảng link ảnh trực tiếp */
function imageList_(main, extra) {
  const out = [];
  [String(main || '')].concat(String(extra || '').split(/[\n,]+/)).forEach(u => { u = normalizeImage_(u); if (u && out.indexOf(u) < 0) out.push(u); });
  return out.slice(0, MAX_IMAGES);
}
const MAX_IMAGES = 16;
const CARD_COLLECTIONS = ['hairs', 'concepts', 'photoshoots', 'services', 'cats'];
const GROUP_KINDS = ['solo', 'couple', 'group'];
function publicCards_(col) {
  return readRows_(col).filter(c => c.ID && bool_(c.Hien_Thi)).sort(byOrder_).map(c => {
    const o = {
      id: String(c.ID), name: { vi: c.Ten, en: c.Ten_EN || c.Ten }, tag: { vi: c.Nhan, en: c.Nhan_EN || c.Nhan },
      desc: { vi: c.Mo_Ta, en: c.Mo_Ta_EN || c.Mo_Ta }, price: Number(c.Gia_JPY) || 0,
      image: normalizeImage_(c.Link_Anh), images: imageList_(c.Link_Anh, c.Anh_Phu), video: String(c.Video || '')
    };
    if (col === 'photoshoots') {
      o.duration = String(c.Thoi_Luong || ''); o.photos = String(c.So_Anh || '');
      o.kind = GROUP_KINDS.indexOf(String(c.Loai_Nhom)) >= 0 ? String(c.Loai_Nhom) : 'solo';
    }
    return o;
  });
}

function publicPost_(p, withContent) {
  const o = {
    id: String(p.ID), slug: String(p.Slug), title: p.Tieu_De, summary: p.Tom_Tat, cover: normalizeImage_(p.Anh_Bia),
    lang: p.Ngon_Ngu || 'vi', date: fmtDate_(p.Ngay_Dang, 'yyyy-MM-dd'), updated: fmtDate_(p.Cap_Nhat_Luc, 'yyyy-MM-dd')
  };
  if (withContent) o.content = String(p.Noi_Dung || '');
  return o;
}

function getPost_(slug) {
  slug = str_(slug, 120);
  const p = readRows_('posts').filter(x => String(x.Slug) === slug && x.Trang_Thai === 'Đã đăng' && fmtDate_(x.Ngay_Dang, 'yyyy-MM-dd') <= today_())[0];
  return p ? { ok: true, post: publicPost_(p, true) } : { ok: false, error: 'not_found' };
}

function parseDates_(v) { return String(v || '').split(/[\s,;]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)); }

/* ========================== KHUNG GIỜ & SỨC CHỨA ======================== */

function slotsOf_(b) {
  const toMin = s => { const a = String(s).split(':'); return +a[0] * 60 + +a[1]; };
  const out = [];
  for (let m = toMin(b.slotStart); m <= toMin(b.slotEnd); m += b.slotMinutes) out.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2));
  return out;
}

function branchById_(id) {
  const b = readRows_('branches').filter(x => String(x.ID) === String(id) && bool_(x.Hien_Thi))[0];
  return b ? publicBranch_(b) : null;
}

/** Số khách đã giữ chỗ theo khung giờ (không tính đơn huỷ) */
function bookedBySlot_(branchId, date) {
  const used = {};
  readRows_('orders').forEach(o => {
    if (String(o.Chi_Nhanh) !== String(branchId) || fmtDate_(o.Ngay_Hen, 'yyyy-MM-dd') !== date || o.Trang_Thai === 'Đã huỷ') return;
    const t = fmtDate_(o.Gio_Hen, 'HH:mm');
    used[t] = (used[t] || 0) + (Number(o.So_Khach) || 0);
  });
  return used;
}

function availability_(branchId, date) {
  const b = branchById_(branchId);
  if (!b) return { ok: false, error: 'Chi nhánh không tồn tại' };
  date = str_(date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Ngày không hợp lệ' };
  const st = getSettings_();
  const closed = b.closedDates.indexOf(date) >= 0;
  const used = bookedBySlot_(b.id, date);
  const minStamp = Utilities.formatDate(new Date(Date.now() + (Number(st.min_hours_ahead) || 0) * 3600000), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  const slots = slotsOf_(b).map(t => {
    const left = b.capacity > 0 ? Math.max(0, b.capacity - (used[t] || 0)) : null;
    const past = (date + ' ' + t) < minStamp;
    return { time: t, left: left, available: !closed && !past && (left === null || left > 0) };
  });
  return { ok: true, branch: b.id, date: date, closed: closed, capacity: b.capacity, slots: slots };
}

/* ================================ ĐƠN HÀNG ============================== */

function makeOrderId_(existing) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do {
    let r = ''; for (let i = 0; i < 4; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    id = 'SY' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyMMdd') + '-' + r;
  } while (existing[id]);
  return id;
}

function createOrder_(d) {
  if (d.website) return { ok: true, orderId: 'IGNORED' };          // honeypot chống bot
  const st = getSettings_();
  if (!st.booking_enabled) throw new Error(st.booking_closed_message || 'Tạm ngưng nhận đặt lịch');

  const o = {
    name: str_(d.name, 80), email: str_(d.email, 120).toLowerCase(), phone: str_(d.phone, 30),
    socialType: d.socialType === 'Telegram' ? 'Telegram' : 'LINE', socialId: str_(d.socialId, 60).replace(/^@+/, ''),
    date: str_(d.date, 10), time: str_(d.time, 5),
    men: int_(d.men, 0, 99), women: int_(d.women, 0, 99), kids: int_(d.kids, 0, 99),
    hair: bool_(d.hair), note: str_(d.note, 500), source: str_(d.source, 80),
    lang: ['vi', 'en', 'ja'].indexOf(d.lang) >= 0 ? d.lang : 'vi'
  };
  if (!o.name) throw new Error('Vui lòng nhập họ tên');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) throw new Error('Email không hợp lệ');
  if (o.phone.replace(/\D/g, '').length < 6) throw new Error('Số điện thoại không hợp lệ');
  o.guests = o.men + o.women + o.kids;
  if (o.guests < 1) throw new Error('Cần ít nhất 1 khách');
  if (o.guests > (Number(st.max_guests) || 20)) throw new Error('Số khách vượt giới hạn, vui lòng liên hệ tiệm');

  const branch = branchById_(d.branchId);
  if (!branch) throw new Error('Vui lòng chọn chi nhánh');
  const product = readRows_('products').filter(p => String(p.ID) === String(d.productId))[0];
  if (!product || HIDDEN_PRODUCT.indexOf(String(product.Trang_Thai)) >= 0) throw new Error('Gói đồ này hiện không nhận đặt');
  const pb = publicProduct_(product);
  if (pb.branches.length && pb.branches.indexOf(branch.id) < 0) throw new Error('Gói đồ này không có ở chi nhánh đã chọn');

  o.branch = branch; o.product = pb;
  o.deposit = o.guests * (Number(st.deposit_per_person) || 0);
  o.social = o.socialId ? o.socialType + ': ' + (o.socialType === 'Telegram' ? '@' : '') + o.socialId : '';
  o.detail = 'Nam ' + o.men + ' · Nữ ' + o.women + ' · Trẻ em ' + o.kids;
  o.needsPayment = !!st.payment_online && o.deposit > 0;
  o.status = o.needsPayment ? 'Chờ thanh toán' : 'Chờ xác nhận';

  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    // kiểm tra lại khung giờ ngay trong khoá → không thể vượt sức chứa khi 2 khách đặt cùng lúc
    const av = availability_(branch.id, o.date);
    if (!av.ok) throw new Error(av.error);
    if (av.closed) throw new Error('Chi nhánh nghỉ ngày này');
    const slot = av.slots.filter(s => s.time === o.time)[0];
    if (!slot) throw new Error('Khung giờ không hợp lệ');
    if (!slot.available) throw new Error(slot.left === 0 ? 'Khung giờ này đã hết chỗ' : 'Khung giờ này không còn nhận đặt');
    if (slot.left !== null && slot.left < o.guests) throw new Error('Khung giờ này chỉ còn ' + slot.left + ' chỗ');

    const existing = {}; readRows_('orders').forEach(r => existing[r.Ma_Don] = 1);
    o.id = makeOrderId_(existing);
    const now = new Date();
    writeRow_('orders', 0, {
      Ma_Don: o.id, Thoi_Gian_Dat: now, Ten_Khach: safe_(o.name), Email: o.email, So_Dien_Thoai: text_(o.phone),
      Tai_Khoan_Mang_Xa_Hoi: safe_(o.social), Ngay_Hen: text_(o.date), Gio_Hen: text_(o.time), So_Khach: o.guests,
      Goi_Do: safe_(pb.name.vi), Lam_Toc: o.hair ? 'Có' : 'Không', Tien_Coc: o.deposit, Trang_Thai: o.status,
      Chi_Nhanh: branch.id, Chi_Tiet_Khach: o.detail, Ghi_Chu: safe_(o.note), Ngon_Ngu: o.lang, Nguon: safe_(o.source || 'Trực tiếp'),
      Thanh_Toan: '', Da_Nhac_Lich: '', Cap_Nhat_Luc: now, Ma_Goi: pb.id
    });
  } finally { lock.releaseLock(); }

  // Có thanh toán online: chờ Stripe xác nhận rồi mới báo (markPaid_). Không: báo ngay.
  const notify = o.needsPayment ? {} : notifyNewOrder_(o, st);
  return { ok: true, orderId: o.id, needsPayment: o.needsPayment, notify: notify, order: orderPublic_(o) };
}

function orderPublic_(o) {
  return { id: o.id, name: o.name, date: o.date, time: o.time, guests: o.guests, men: o.men, women: o.women, kids: o.kids,
    productId: o.product.id, productName: o.product.name, branchId: o.branch.id, branchName: o.branch.name,
    hair: o.hair, deposit: o.deposit, status: o.status };
}

function notifyNewOrder_(o, st) {
  const res = { telegram: false, line: false, email: false };
  const msg = adminMessage_(o, o.status === 'Đã nhận cọc');
  const branchRow = readRows_('branches').filter(b => String(b.ID) === o.branch.id)[0];
  if (st.notify_telegram) { try { res.telegram = sendTelegram_(msg.html, branchRow && branchRow.Telegram_Chat_ID); } catch (err) { console.error(err); } }
  if (st.notify_line) { try { res.line = sendLine_(msg.plain); } catch (err) { console.error(err); } }
  if (st.email_customer) { try { sendOrderEmail_(o, st); res.email = true; } catch (err) { console.error(err); } }
  if (st.email_admin_copy) { try { MailApp.sendEmail({ to: st.email_admin_copy, subject: '[' + st.shop_name + '] Đơn mới ' + o.id, body: msg.plain }); } catch (err) { console.error(err); } }
  return res;
}

function readOrders_() {
  return readRows_('orders').filter(r => r.Ma_Don).map(r => ({
    row: r._row, id: String(r.Ma_Don), createdAt: fmtDate_(r.Thoi_Gian_Dat, 'yyyy-MM-dd HH:mm'),
    name: String(r.Ten_Khach), email: String(r.Email), phone: String(r.So_Dien_Thoai), social: String(r.Tai_Khoan_Mang_Xa_Hoi || ''),
    date: fmtDate_(r.Ngay_Hen, 'yyyy-MM-dd'), time: fmtDate_(r.Gio_Hen, 'HH:mm'), guests: Number(r.So_Khach) || 0,
    product: String(r.Goi_Do), productId: String(r.Ma_Goi || ''), hair: String(r.Lam_Toc), deposit: Number(r.Tien_Coc) || 0,
    status: String(r.Trang_Thai || 'Chờ xác nhận'), branchId: String(r.Chi_Nhanh || ''), detail: String(r.Chi_Tiet_Khach || ''),
    note: String(r.Ghi_Chu || ''), lang: String(r.Ngon_Ngu || 'vi'), source: String(r.Nguon || ''), payment: String(r.Thanh_Toan || ''),
    reminded: String(r.Da_Nhac_Lich || ''), updatedAt: fmtDate_(r.Cap_Nhat_Luc, 'yyyy-MM-dd HH:mm')
  }));
}

function listOrders_() {
  return readOrders_().reverse().slice(0, CONFIG.MAX_LIST_ORDERS).map(o => { delete o.row; return o; });
}

function customerView_(o) {
  return { id: o.id, name: o.name, date: o.date, time: o.time, guests: o.guests, detail: o.detail, product: o.product,
    productId: o.productId, branchId: o.branchId, hair: o.hair === 'Có', deposit: o.deposit, status: o.status };
}

/** Khách tra cứu bằng Email hoặc SĐT */
function lookupOrders_(q) {
  q = str_(q, 120).toLowerCase();
  if (!q) return { ok: false, error: 'Vui lòng nhập Email hoặc Số điện thoại' };
  const isEmail = q.indexOf('@') >= 0, digits = q.replace(/\D/g, '');
  if (!isEmail && digits.length < 8) return { ok: false, error: 'Số điện thoại cần ít nhất 8 chữ số' };
  Utilities.sleep(300);                                            // hạn chế dò quét
  const found = readOrders_().filter(o => isEmail ? o.email.toLowerCase() === q : o.phone.replace(/\D/g, '').slice(-9) === digits.slice(-9))
    .reverse().slice(0, 20).map(customerView_);
  return { ok: true, orders: found };
}

function orderStatus_(id, email) {
  const o = readOrders_().filter(x => x.id === String(id))[0];
  if (!o || o.email.toLowerCase() !== str_(email, 120).toLowerCase()) return { ok: false, error: 'not_found' };
  return { ok: true, order: customerView_(o) };
}

function updateOrderStatus_(id, status) {
  if (ORDER_STATUSES.indexOf(status) < 0) throw new Error('Trạng thái không hợp lệ');
  const o = readOrders_().filter(x => x.id === String(id))[0];
  if (!o) throw new Error('Không tìm thấy đơn ' + id);
  if (o.status === status) return { ok: true, id: id, status: status, changed: false };
  setCell_('orders', o.row, 'Trang_Thai', status);
  setCell_('orders', o.row, 'Cap_Nhat_Luc', new Date());
  const st = getSettings_();
  if (st.email_status && o.email) { try { o.status = status; sendStatusEmail_(o, st); } catch (err) { console.error(err); } }
  return { ok: true, id: id, status: status, changed: true };
}

/* ======================= THANH TOÁN (qua Cloudflare Worker) ============= */

function requireWorker_(s) {
  const real = secret_('WORKER_SECRET');
  if (!real || String(s || '') !== real) throw new Error('Forbidden');
}

function paymentInfo_(id) {
  const o = readOrders_().filter(x => x.id === String(id))[0];
  if (!o) return { ok: false, error: 'not_found' };
  const st = getSettings_();
  const created = new Date(o.createdAt.replace(' ', 'T') + ':00+09:00').getTime();
  const expired = o.status === 'Chờ thanh toán' && Date.now() - created > (Number(st.payment_hold_minutes) || 35) * 60000;
  return { ok: true, order: { id: o.id, email: o.email, amount: o.deposit, status: o.status, lang: o.lang, product: o.product, guests: o.guests, expired: expired, shop: st.shop_name } };
}

function markPaid_(id, paymentRef, amount) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let o;
  try {
    o = readOrders_().filter(x => x.id === String(id))[0];
    if (!o) return { ok: false, error: 'not_found' };
    if (o.payment && o.status !== 'Chờ thanh toán') return { ok: true, already: true };
    setCell_('orders', o.row, 'Thanh_Toan', text_(str_(paymentRef, 120) + (amount ? ' · ¥' + amount : '')));
    setCell_('orders', o.row, 'Trang_Thai', 'Đã nhận cọc');
    setCell_('orders', o.row, 'Cap_Nhat_Luc', new Date());
  } finally { lock.releaseLock(); }
  // gửi thông báo đầy đủ như đơn mới (kèm "đã cọc")
  const st = getSettings_();
  const branch = branchById_(o.branchId) || { id: o.branchId, name: { vi: o.branchId } };
  const prod = (readRows_('products').filter(p => String(p.ID) === o.productId).map(publicProduct_)[0]) || { id: o.productId, name: { vi: o.product, en: o.product, ja: o.product }, price: 0 };
  const parts = o.detail.match(/\d+/g) || [0, 0, 0];
  const full = { id: o.id, name: o.name, email: o.email, phone: o.phone, social: o.social, date: o.date, time: o.time, guests: o.guests,
    men: +parts[0], women: +parts[1], kids: +parts[2], hair: o.hair === 'Có', note: o.note, source: o.source, lang: o.lang,
    branch: branch, product: prod, deposit: o.deposit, detail: o.detail, status: 'Đã nhận cọc' };
  notifyNewOrder_(full, st);
  return { ok: true };
}

/** Trigger mỗi giờ: huỷ đơn chờ thanh toán quá hạn (trả lại chỗ) */
function expireUnpaid() {
  const st = getSettings_();
  const limit = (Number(st.payment_hold_minutes) || 35) * 60000;
  let n = 0;
  readOrders_().forEach(o => {
    if (o.status !== 'Chờ thanh toán') return;
    const created = new Date(o.createdAt.replace(' ', 'T') + ':00+09:00').getTime();
    if (Date.now() - created > limit) {
      setCell_('orders', o.row, 'Trang_Thai', 'Đã huỷ');
      setCell_('orders', o.row, 'Ghi_Chu', text_((o.note ? o.note + ' | ' : '') + 'Tự huỷ: quá hạn thanh toán cọc'));
      setCell_('orders', o.row, 'Cap_Nhat_Luc', new Date());
      n++;
    }
  });
  return n;
}

/* ============================== NHẮC LỊCH =============================== */

/** Trigger hằng ngày: email nhắc khách có hẹn ngày mai */
function sendReminders() {
  const st = getSettings_();
  if (!st.reminder_enabled) return 0;
  const tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const branches = {}; readRows_('branches').forEach(b => branches[String(b.ID)] = publicBranch_(b));
  let n = 0;
  readOrders_().forEach(o => {
    if (o.date !== tomorrow || o.reminded || ['Chờ xác nhận', 'Đã nhận cọc'].indexOf(o.status) < 0 || !o.email) return;
    try {
      sendReminderEmail_(o, branches[o.branchId], st);
      setCell_('orders', o.row, 'Da_Nhac_Lich', text_(Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm')));
      n++;
    } catch (err) { console.error('reminder ' + o.id + ': ' + err); }
  });
  return n;
}

function hasTrigger_(fn) {
  try { return ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === fn); } catch (_) { return false; }
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['sendReminders', 'expireUnpaid'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  const h = int_(getSettings_().reminder_hour, 0, 23);
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(h).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('expireUnpaid').timeBased().everyHours(1).create();
}

/* ====================== NỘI DUNG (CRUD dùng chung) ====================== */

const COLLECTIONS = ['products', 'branches', 'posts', 'faqs', 'reviews', 'hairs', 'concepts', 'photoshoots', 'services', 'cats'];

function listItems_(col) {
  if (COLLECTIONS.indexOf(col) < 0) throw new Error('Loại dữ liệu không hợp lệ');
  return readRows_(col).filter(r => r.ID).sort(byOrder_).map(r => {
    const o = {}; SHEETS[col].headers.forEach(h => { o[h] = r[h] instanceof Date ? fmtDate_(r[h], /Slot_/.test(h) ? 'HH:mm' : 'yyyy-MM-dd') : (r[h] == null ? '' : r[h]); });
    if (col === 'products' || CARD_COLLECTIONS.indexOf(col) >= 0) o._img = normalizeImage_(r.Link_Anh);
    if (col === 'posts') o._img = normalizeImage_(r.Anh_Bia);
    return o;
  });
}

function slugify_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function validate_(col, it, rows) {
  const out = {};
  const req = (k, label, max) => { const v = str_(it[k], max); if (!v) throw new Error('Vui lòng nhập ' + label); return v; };
  const opt = (k, max) => str_(it[k], max);
  const url = k => { const v = opt(k, 600); if (v && !/^https:\/\//i.test(v) && !/^data:image\//.test(v)) throw new Error('Link ảnh phải bắt đầu bằng https://'); return v; };
  const urls = k => { const list = String(it[k] || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    if (list.length > MAX_IMAGES - 1) throw new Error('Tối đa ' + (MAX_IMAGES - 1) + ' ảnh phụ');
    list.forEach(v => { if (v.length > 600 || !/^https:\/\//i.test(v)) throw new Error('Link ảnh phải bắt đầu bằng https://'); }); return list.join('\n'); };
  const video = k => { const v = opt(k, 600); if (v && !/^https:\/\//i.test(v)) throw new Error('Link video phải bắt đầu bằng https://'); return v; };
  if (CARD_COLLECTIONS.indexOf(col) >= 0) {
    out.Ten = safe_(req('Ten', 'tên', 120)); out.Ten_EN = safe_(opt('Ten_EN', 120));
    out.Nhan = safe_(opt('Nhan', 160)); out.Nhan_EN = safe_(opt('Nhan_EN', 160));
    out.Mo_Ta = safe_(opt('Mo_Ta', 2000)); out.Mo_Ta_EN = safe_(opt('Mo_Ta_EN', 2000));
    const cp = Math.round(Number(it.Gia_JPY) || 0); if (!(cp >= 0) || cp > 10000000) throw new Error('Giá không hợp lệ');
    out.Gia_JPY = cp; out.Link_Anh = url('Link_Anh'); out.Anh_Phu = urls('Anh_Phu'); out.Video = video('Video');
    out.Hien_Thi = it.Hien_Thi === undefined ? true : bool_(it.Hien_Thi);
    if (col === 'photoshoots') {
      out.Thoi_Luong = safe_(opt('Thoi_Luong', 60)); out.So_Anh = safe_(opt('So_Anh', 60));
      out.Loai_Nhom = GROUP_KINDS.indexOf(it.Loai_Nhom) >= 0 ? it.Loai_Nhom : 'solo';
    }
  } else if (col === 'products') {
    out.Anh_Phu = urls('Anh_Phu'); out.Video = video('Video');
    out.Ten_Kimono = safe_(req('Ten_Kimono', 'tên kimono', 120)); out.Loai_Goi = safe_(req('Loai_Goi', 'loại gói', 60));
    const price = Math.round(Number(it.Gia_JPY)); if (!(price >= 0) || price > 10000000) throw new Error('Giá thuê không hợp lệ');
    out.Gia_JPY = price; out.Link_Anh = url('Link_Anh');
    out.Trang_Thai = PRODUCT_STATUSES.indexOf(it.Trang_Thai) >= 0 ? it.Trang_Thai : 'Có sẵn';
    ['Ten_EN', 'Ten_JA'].forEach(k => out[k] = safe_(opt(k, 120)));
    ['Mo_Ta', 'Mo_Ta_EN', 'Mo_Ta_JA'].forEach(k => out[k] = safe_(opt(k, 1500)));
    out.Chi_Nhanh = text_(opt('Chi_Nhanh', 200));
  } else if (col === 'branches') {
    out.Ten = safe_(req('Ten', 'tên chi nhánh', 80));
    ['Ten_EN', 'Ten_JA', 'Gio_Mo_Cua', 'Dien_Thoai'].forEach(k => out[k] = text_(opt(k, 120)));
    out.Dia_Chi = safe_(req('Dia_Chi', 'địa chỉ', 300)); out.Ghi_Chu_Dia_Chi = safe_(opt('Ghi_Chu_Dia_Chi', 300));
    out.Map_Link = opt('Map_Link', 600); out.Map_Embed = opt('Map_Embed', 1200);
    ['Slot_Start', 'Slot_End'].forEach(k => { const v = opt(k, 5) || (k === 'Slot_Start' ? '09:00' : '17:00'); if (!/^\d{2}:\d{2}$/.test(v)) throw new Error('Giờ phải có dạng HH:MM'); out[k] = text_(v); });
    if (out.Slot_Start >= out.Slot_End) throw new Error('Giờ bắt đầu phải trước giờ kết thúc');
    out.Slot_Minutes = int_(it.Slot_Minutes || 30, 10, 240); out.Suc_Chua = int_(it.Suc_Chua, 0, 999);
    out.Ngay_Nghi = text_(parseDates_(it.Ngay_Nghi).join(', '));
    out.Telegram_Chat_ID = text_(opt('Telegram_Chat_ID', 40)); out.Hien_Thi = it.Hien_Thi === undefined ? true : bool_(it.Hien_Thi);
  } else if (col === 'posts') {
    out.Tieu_De = safe_(req('Tieu_De', 'tiêu đề', 200)); out.Tom_Tat = safe_(opt('Tom_Tat', 400));
    out.Noi_Dung = safe_(String(it.Noi_Dung || '').slice(0, 45000)); out.Anh_Bia = url('Anh_Bia');
    out.Ngon_Ngu = ['vi', 'en', 'ja'].indexOf(it.Ngon_Ngu) >= 0 ? it.Ngon_Ngu : 'vi';
    out.Trang_Thai = POST_STATUSES.indexOf(it.Trang_Thai) >= 0 ? it.Trang_Thai : 'Nháp';
    let date = opt('Ngay_Dang', 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today_();
    out.Ngay_Dang = text_(date); out.Cap_Nhat_Luc = new Date();
    let slug = slugify_(it.Slug || it.Tieu_De) || ('bai-viet-' + Date.now().toString(36));
    const taken = {}; rows.forEach(r => { if (String(r.ID) !== String(it.ID)) taken[String(r.Slug)] = 1; });
    let s2 = slug, i = 2; while (taken[s2]) s2 = slug + '-' + (i++);
    out.Slug = s2;
  } else if (col === 'faqs') {
    out.Cau_Hoi = safe_(req('Cau_Hoi', 'câu hỏi', 300)); out.Tra_Loi = safe_(req('Tra_Loi', 'câu trả lời', 2000));
    out.Cau_Hoi_EN = safe_(opt('Cau_Hoi_EN', 300)); out.Tra_Loi_EN = safe_(opt('Tra_Loi_EN', 2000));
    out.Nhom = safe_(opt('Nhom', 80)); out.Nhom_EN = safe_(opt('Nhom_EN', 80));
    out.Hien_Thi = it.Hien_Thi === undefined ? true : bool_(it.Hien_Thi);
  } else if (col === 'reviews') {
    out.Ten_Khach = safe_(req('Ten_Khach', 'tên khách', 80)); out.Noi_Dung = safe_(req('Noi_Dung', 'nội dung', 1500));
    out.Ngon_Ngu = text_(opt('Ngon_Ngu', 10).toUpperCase()); out.So_Sao = int_(it.So_Sao || 5, 1, 5);
    out.Hien_Thi = it.Hien_Thi === undefined ? true : bool_(it.Hien_Thi);
  }
  if ('Thu_Tu' in it && it.Thu_Tu !== '') out.Thu_Tu = int_(it.Thu_Tu, 0, 99999);
  return out;
}

function saveItem_(col, it) {
  if (COLLECTIONS.indexOf(col) < 0) throw new Error('Loại dữ liệu không hợp lệ');
  if (!it) throw new Error('Thiếu dữ liệu');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const rows = readRows_(col);
    const data = validate_(col, it, rows);
    let cur = it.ID ? rows.filter(r => String(r.ID) === String(it.ID))[0] : null;
    if (!cur) {
      const n = rows.reduce((m, r) => Math.max(m, parseInt(String(r.ID).replace(/\D/g, ''), 10) || 0), 0) + 1;
      data.ID = SHEETS[col].prefix + ('000' + n).slice(-3);
      if (!('Thu_Tu' in data)) data.Thu_Tu = n;
    }
    writeRow_(col, cur ? cur._row : 0, data);
    cacheClear_();
    const id = cur ? String(cur.ID) : data.ID;
    return { ok: true, created: !cur, item: listItems_(col).filter(x => String(x.ID) === id)[0] };
  } finally { lock.releaseLock(); }
}

function deleteItem_(col, id) {
  if (COLLECTIONS.indexOf(col) < 0) throw new Error('Loại dữ liệu không hợp lệ');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = readRows_(col).filter(x => String(x.ID) === String(id))[0];
    if (!r) throw new Error('Không tìm thấy ' + id);
    sheet_(col).deleteRow(r._row);
    cacheClear_();
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

function reorder_(col, ids) {
  if (COLLECTIONS.indexOf(col) < 0 || !Array.isArray(ids)) throw new Error('Dữ liệu không hợp lệ');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const rows = readRows_(col);
    ids.forEach((id, i) => { const r = rows.filter(x => String(x.ID) === String(id))[0]; if (r) setCell_(col, r._row, 'Thu_Tu', i + 1); });
    cacheClear_();
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ============================== ẢNH WEBSITE ============================= */

function getImages_() {
  const out = {};
  readRows_('images').forEach(r => { if (r.Slot && r.URL) out[String(r.Slot)] = normalizeImage_(r.URL); });
  return out;
}
function checkSlot_(slot) { if (!/^[a-z0-9-]{1,40}$/.test(String(slot || ''))) throw new Error('Vị trí ảnh không hợp lệ'); return String(slot); }
function trashFile_(id) { if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (_) {} } }
function upsertImage_(slot, url, fileId) {
  const r = readRows_('images').filter(x => String(x.Slot) === slot)[0];
  if (r && r.Drive_File_ID && r.Drive_File_ID !== fileId) trashFile_(r.Drive_File_ID);
  writeRow_('images', r ? r._row : 0, { Slot: slot, URL: url, Drive_File_ID: fileId || '', Cap_Nhat_Luc: new Date() });
  cacheClear_();
}
function imageFolder_() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('IMAGE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (_) {} }
  const f = DriveApp.createFolder('Sakura Yuki — Ảnh website');
  props.setProperty('IMAGE_FOLDER_ID', f.getId());
  return f;
}
/** Tải ảnh lên Drive. Có slot → gắn vào vị trí ảnh website; không slot → chỉ trả link (ảnh trang phục, blog) */
function uploadImage_(d) {
  const mime = /^image\/(jpeg|png|webp|gif)$/.test(d.mime) ? d.mime : 'image/jpeg';
  const bytes = Utilities.base64Decode(String(d.data || ''));
  if (!bytes.length) throw new Error('Ảnh rỗng');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 8MB)');
  const base = d.slot ? checkSlot_(d.slot) : 'img';
  const file = imageFolder_().createFile(Utilities.newBlob(bytes, mime, base + '-' + Date.now() + '.' + mime.split('/')[1].replace('jpeg', 'jpg')));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  if (d.slot) upsertImage_(base, url, file.getId());
  return { ok: true, url: url, slot: d.slot || '' };
}
function setImageUrl_(slot, url) {
  slot = checkSlot_(slot);
  if (!/^https:\/\/\S+$/i.test(String(url || ''))) throw new Error('Link phải bắt đầu bằng https://');
  upsertImage_(slot, normalizeImage_(url), '');
  return { ok: true, slot: slot, url: normalizeImage_(url) };
}
function deleteImage_(slot) {
  slot = checkSlot_(slot);
  const r = readRows_('images').filter(x => String(x.Slot) === slot)[0];
  if (r) { trashFile_(r.Drive_File_ID); sheet_('images').deleteRow(r._row); }
  cacheClear_();
  return { ok: true };
}

/* ============================ ĐĂNG NHẬP QUẢN TRỊ ======================== */

function hash_(pw, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8);
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function checkPassword_(pw) {
  const p = PropertiesService.getScriptProperties();
  const h = p.getProperty('ADMIN_HASH'), salt = p.getProperty('ADMIN_SALT');
  if (h && salt) return hash_(String(pw), salt) === h;
  const initial = p.getProperty('ADMIN_PASSWORD');
  if (!initial) throw new Error('Chưa đặt mật khẩu quản trị (ADMIN_PASSWORD trong Script Properties)');
  return String(pw) === initial;
}

function adminLogin_(password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= 10) throw new Error('Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
  if (!checkPassword_(password)) {
    cache.put('login_fails', String(fails + 1), 900);
    Utilities.sleep(1000);
    throw new Error('Mật khẩu không đúng');
  }
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const ttl = Math.min(21600, CONFIG.SESSION_HOURS * 3600);
  cache.put('sess_' + token, '1', ttl);
  return { ok: true, token: token, expiresIn: ttl };
}

function adminLogout_(token) { if (token) CacheService.getScriptCache().remove('sess_' + token); return { ok: true }; }

function requireAdmin_(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(String(token)) || !CacheService.getScriptCache().get('sess_' + token)) throw new Error('UNAUTHORIZED');
}

function changePassword_(current, next) {
  if (!checkPassword_(current)) throw new Error('Mật khẩu hiện tại không đúng');
  next = String(next || '');
  if (next.length < 10) throw new Error('Mật khẩu mới cần ít nhất 10 ký tự');
  const p = PropertiesService.getScriptProperties();
  const salt = Utilities.getUuid();
  p.setProperty('ADMIN_SALT', salt);
  p.setProperty('ADMIN_HASH', hash_(next, salt));
  p.deleteProperty('ADMIN_PASSWORD');
  return { ok: true };
}

/* ============================ BÁO CÁO TRUY CẬP ========================== */
/** Lấy số liệu Cloudflare Web Analytics (cần CF_API_TOKEN, CF_ACCOUNT_ID, CF_SITE_TAG) */
function analytics_(days) {
  days = int_(days || 30, 1, 90);
  const token = secret_('CF_API_TOKEN'), acc = secret_('CF_ACCOUNT_ID'), site = secret_('CF_SITE_TAG');
  if (!token || !acc || !site) return { ok: true, configured: false };
  const key = 'cfa_' + days, hit = cacheGet_(key);
  if (hit) return hit;
  const until = today_(), since = Utilities.formatDate(new Date(Date.now() - (days - 1) * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const group = (alias, dim, limit, order) => alias + ': rumPageloadEventsAdaptiveGroups(limit: ' + limit + ', filter: { siteTag: $site, date_geq: $since, date_leq: $until }, orderBy: [' + order + ']) { count SUMV dimensions { ' + dim + ' } }';
  const build = withVisits => {
    const q = 'query($acc: String!, $site: String!, $since: Date!, $until: Date!) { viewer { accounts(filter: { accountTag: $acc }) { ' +
      [group('byDate', 'date', 100, 'date_ASC'), group('byReferer', 'refererHost', 15, 'count_DESC'), group('byCountry', 'countryName', 15, 'count_DESC'),
       group('byPath', 'requestPath', 15, 'count_DESC'), group('byDevice', 'deviceType', 5, 'count_DESC')].join(' ') + ' } } }';
    return q.replace(/SUMV/g, withVisits ? 'sum { visits }' : '');
  };
  const call = q => JSON.parse(UrlFetchApp.fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ query: q, variables: { acc: acc, site: site, since: since, until: until } })
  }).getContentText());
  let res = call(build(true));
  if (res.errors && res.errors.length) res = call(build(false));
  if (res.errors && res.errors.length) return { ok: false, error: 'Cloudflare: ' + res.errors[0].message };
  const a = (((res.data || {}).viewer || {}).accounts || [])[0] || {};
  const map = (arr, dim) => (arr || []).map(x => ({ key: x.dimensions[dim] || '(trực tiếp)', views: x.count, visits: x.sum ? x.sum.visits : null }));
  const out = { ok: true, configured: true, since: since, until: until,
    byDate: map(a.byDate, 'date'), byReferer: map(a.byReferer, 'refererHost'), byCountry: map(a.byCountry, 'countryName'),
    byPath: map(a.byPath, 'requestPath'), byDevice: map(a.byDevice, 'deviceType') };
  cachePut_(key, out, 600);
  return out;
}

/* ============================== THÔNG BÁO =============================== */

function adminMessage_(o, paid) {
  const yen = n => '¥' + Number(n).toLocaleString('en-US');
  const socialLink = o.social ? (/^Telegram/.test(o.social) ? 'https://t.me/' + encodeURIComponent(o.social.replace(/^Telegram:\s*@?/, '')) : 'https://line.me/ti/p/~' + encodeURIComponent(o.social.replace(/^LINE:\s*/, ''))) : '';
  const lines = [
    ['🆔 Mã đơn', o.id], ['🏠 Chi nhánh', (o.branch.name && o.branch.name.vi) || o.branch.id], ['👤 Khách', o.name],
    ['📱 SĐT/WhatsApp', o.phone], ['✉️ Email', o.email], ['📅 Ngày giờ', o.date + ' · ' + o.time],
    ['👥 Số khách', o.guests + ' (' + o.detail + ')'], ['👘 Gói đồ', (o.product.name && o.product.name.vi) + (o.product.price ? ' — ' + yen(o.product.price) : '')],
    ['💇 Làm tóc', o.hair ? 'Có' : 'Không'], ['💴 Tiền cọc', yen(o.deposit) + (paid ? ' — ĐÃ THANH TOÁN ONLINE' : '')], ['🔎 Nguồn', o.source || 'Trực tiếp']
  ];
  if (o.note) lines.push(['📝 Ghi chú', o.note]);
  const title = paid ? '💳 ĐƠN MỚI — ĐÃ CỌC ONLINE' : '🌸 ĐƠN ĐẶT LỊCH MỚI';
  const plain = [title, '━━━━━━━━━━━━'].concat(lines.map(l => l[0] + ': ' + l[1])).concat(o.social ? ['', '💬 ' + o.social + ' → ' + socialLink] : []).join('\n');
  const html = ['<b>' + title + '</b>'].concat(lines.map(l => '<b>' + escHtml_(l[0]) + ':</b> ' + escHtml_(l[1])))
    .concat(o.social ? ['', '💬 <b>' + escHtml_(o.social) + '</b> — <a href="' + escHtml_(socialLink) + '">nhắn chào khách</a>'] : []).join('\n');
  return { plain: plain, html: html };
}

function sendTelegram_(html, chatOverride) {
  const token = secret_('TELEGRAM_BOT_TOKEN'), chat = String(chatOverride || '') || secret_('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: chat, text: html.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (res.getResponseCode() !== 200) { console.error('Telegram ' + res.getResponseCode() + ': ' + res.getContentText()); return false; }
  return true;
}

function sendLine_(text) {
  const token = secret_('LINE_CHANNEL_TOKEN'), to = secret_('LINE_ADMIN_ID');
  if (!token || !to) return false;
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] })
  });
  if (res.getResponseCode() !== 200) { console.error('LINE ' + res.getResponseCode() + ': ' + res.getContentText()); return false; }
  return true;
}

const MAIL = {
  vi: { confirm: 'Xác nhận đặt lịch', remind: 'Nhắc lịch hẹn ngày mai', status: 'Cập nhật trạng thái đơn', hello: 'Xin chào',
        thanks: 'Cảm ơn bạn đã đặt lịch thuê kimono tại', recv: 'Chúng tôi đã nhận được yêu cầu. Tiệm sẽ liên hệ để xác nhận lịch hẹn.',
        paid: 'Tiền cọc đã được thanh toán thành công. Lịch hẹn của bạn đã được xác nhận.',
        remindText: 'Hẹn gặp bạn vào ngày mai! Dưới đây là thông tin lịch hẹn.', statusLine: 'Trạng thái đơn của bạn đã được cập nhật thành:',
        code: 'Mã đơn', branch: 'Chi nhánh', date: 'Ngày', time: 'Giờ', guests: 'Số khách', pkg: 'Gói đồ', hair: 'Làm tóc', deposit: 'Tiền cọc', st: 'Trạng thái',
        yes: 'Có', no: 'Không', map: 'Chỉ đường đến tiệm', lookup: 'Tra cứu đơn', rules: 'Lưu ý',
        r1: 'Vui lòng đến đúng giờ hẹn.', r2: 'Trả trang phục trước {t} cùng ngày.', r3: 'Tiền cọc được trừ vào tổng tiền khi thanh toán tại tiệm.' },
  en: { confirm: 'Booking confirmation', remind: 'Reminder: your appointment is tomorrow', status: 'Booking status update', hello: 'Hello',
        thanks: 'Thank you for booking a kimono rental at', recv: 'We have received your request and will contact you to confirm.',
        paid: 'Your deposit has been paid. Your booking is confirmed.',
        remindText: 'See you tomorrow! Here are your booking details.', statusLine: 'Your booking status has been updated to:',
        code: 'Booking code', branch: 'Shop', date: 'Date', time: 'Time', guests: 'Guests', pkg: 'Plan', hair: 'Hair styling', deposit: 'Deposit', st: 'Status',
        yes: 'Yes', no: 'No', map: 'Directions', lookup: 'Find my booking', rules: 'Please note',
        r1: 'Please arrive on time.', r2: 'Return the outfit by {t} the same day.', r3: 'The deposit is deducted from your total at the shop.' },
  ja: { confirm: 'ご予約確認', remind: '明日のご予約のお知らせ', status: 'ご予約状況の更新', hello: 'こんにちは',
        thanks: '着物レンタルのご予約ありがとうございます —', recv: 'ご予約リクエストを受け付けました。確定のご連絡をいたします。',
        paid: '予約金のお支払いが完了し、ご予約が確定しました。',
        remindText: '明日お待ちしております。ご予約内容は以下の通りです。', statusLine: 'ご予約の状況が次のとおり更新されました：',
        code: '予約番号', branch: '店舗', date: '日付', time: '時間', guests: '人数', pkg: 'プラン', hair: 'ヘアセット', deposit: '予約金', st: '状況',
        yes: 'あり', no: 'なし', map: '店舗への地図', lookup: '予約確認', rules: 'ご注意',
        r1: 'ご予約時間にお越しください。', r2: '当日{t}までにご返却ください。', r3: '予約金は当日のお会計から差し引きます。' }
};
const STATUS_LABEL = {
  'Chờ thanh toán': { vi: 'Chờ thanh toán cọc', en: 'Awaiting deposit payment', ja: '予約金お支払い待ち' },
  'Chờ xác nhận': { vi: 'Chờ xác nhận', en: 'Awaiting confirmation', ja: '確認待ち' },
  'Đã nhận cọc': { vi: 'Đã cọc', en: 'Deposit received', ja: '予約金受領済み' },
  'Đang phục vụ': { vi: 'Đã mặc', en: 'Dressed', ja: '着付け済み' },
  'Đã hoàn thành': { vi: 'Đã trả đồ', en: 'Returned', ja: '返却済み' },
  'Đã huỷ': { vi: 'Đã huỷ', en: 'Cancelled', ja: 'キャンセル' }
};

function mailShell_(inner, st, branch) {
  const h = escHtml_;
  const addr = branch ? ('<b>' + h(branch.name.vi || '') + ':</b> ' + h(branch.address || '') + (branch.phone ? ' · ☎ ' + h(branch.phone) : '')) : '';
  const links = [st.line_url ? '<a href="' + h(st.line_url) + '" style="color:#8B263E">LINE</a>' : '', st.telegram_url ? '<a href="' + h(st.telegram_url) + '" style="color:#8B263E">Telegram</a>' : ''].filter(Boolean).join(' · ');
  return '<!DOCTYPE html><html><body style="margin:0;background:#FAF8F5;font-family:Helvetica,Arial,sans-serif;color:#2D3748">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:24px 12px"><tr><td align="center">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #E7DFD6;border-radius:6px">' +
    '<tr><td style="background:#8B263E;padding:20px 28px;color:#FAF8F5;font-family:Georgia,serif;font-size:21px">' + h(st.shop_kanji) + ' ' + h(st.shop_name) + '</td></tr>' +
    '<tr><td style="padding:28px">' + inner + '</td></tr>' +
    '<tr><td style="padding:16px 28px;background:#F1ECE4;font-size:13px;color:#5A6474">' + addr + (links ? '<br>' + links : '') + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}
function table_(rows) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7DFD6;font-size:14px;margin:16px 0">' + rows.map((r, i) =>
    '<tr><td style="padding:9px 14px;color:#5A6474;' + (i ? 'border-top:1px solid #F1ECE4' : '') + '">' + escHtml_(r[0]) + '</td><td align="right" style="padding:9px 14px;font-weight:bold;' + (i ? 'border-top:1px solid #F1ECE4' : '') + '">' + escHtml_(r[1]) + '</td></tr>').join('') + '</table>';
}
function btn_(href, label) { return href ? '<a href="' + escHtml_(href) + '" style="display:inline-block;background:#8B263E;color:#FAF8F5;text-decoration:none;padding:11px 20px;border-radius:2px;font-weight:bold;margin:4px 6px 4px 0">' + escHtml_(label) + '</a>' : ''; }
function detailRows_(t, o, lang) {
  const bn = o.branch && o.branch.name ? (o.branch.name[lang] || o.branch.name.vi) : '';
  const pn = typeof o.product === 'string' ? o.product : (o.product.name[lang] || o.product.name.vi);
  return [[t.code, o.id], [t.branch, bn], [t.date, o.date], [t.time, o.time], [t.guests, String(o.guests)], [t.pkg, pn],
    [t.hair, (o.hair === true || o.hair === 'Có') ? t.yes : t.no], [t.deposit, '¥' + Number(o.deposit).toLocaleString('en-US')],
    [t.st, (STATUS_LABEL[o.status] || {})[lang] || o.status]];
}
function rules_(t, st) {
  return '<p style="margin:16px 0 6px;font-weight:bold;color:#8B263E">' + escHtml_(t.rules) + '</p><ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.6"><li>' +
    escHtml_(t.r1) + '</li><li><b>' + escHtml_(t.r2.replace('{t}', st.return_by)) + '</b></li><li>' + escHtml_(t.r3) + '</li></ul>';
}
function lookupUrl_(st) { return st.website_url ? String(st.website_url).replace(/\/$/, '') + '/tra-cuu' : ''; }

function sendOrderEmail_(o, st) {
  const lang = MAIL[o.lang] ? o.lang : 'vi', t = MAIL[lang], h = escHtml_;
  const inner = '<p style="font-size:16px;margin:0 0 8px">' + h(t.hello) + ' <b>' + h(o.name) + '</b>,</p>' +
    '<p style="margin:0 0 6px">' + h(t.thanks) + ' <b>' + h(st.shop_name) + '</b>.</p>' +
    '<p style="margin:0;color:#5A6474">' + h(o.status === 'Đã nhận cọc' ? t.paid : t.recv) + '</p>' +
    table_(detailRows_(t, o, lang)) + rules_(t, st) + btn_(o.branch.mapLink, '📍 ' + t.map) + btn_(lookupUrl_(st), t.lookup);
  MailApp.sendEmail({ to: o.email, subject: '[' + st.shop_name + '] ' + t.confirm + ' ' + o.id, htmlBody: mailShell_(inner, st, o.branch), name: st.shop_name,
    body: t.code + ': ' + o.id + '\n' + t.date + ': ' + o.date + ' ' + o.time + '\n' + (o.branch.address || '') });
}

function sendReminderEmail_(o, branch, st) {
  const lang = MAIL[o.lang] ? o.lang : 'vi', t = MAIL[lang], h = escHtml_;
  const ob = Object.assign({}, o, { branch: branch || { name: { vi: o.branchId } } });
  const inner = '<p style="font-size:16px;margin:0 0 8px">' + h(t.hello) + ' <b>' + h(o.name) + '</b>,</p><p style="margin:0">' + h(t.remindText) + '</p>' +
    table_(detailRows_(t, ob, lang)) + rules_(t, st) + btn_(branch && branch.mapLink, '📍 ' + t.map);
  MailApp.sendEmail({ to: o.email, subject: '[' + st.shop_name + '] ' + t.remind + ' — ' + o.date + ' ' + o.time, htmlBody: mailShell_(inner, st, branch), name: st.shop_name,
    body: t.remindText + '\n' + o.date + ' ' + o.time + '\n' + (branch ? branch.address : '') });
}

function sendStatusEmail_(o, st) {
  const lang = MAIL[o.lang] ? o.lang : 'vi', t = MAIL[lang], h = escHtml_;
  const branch = branchById_(o.branchId);
  const ob = Object.assign({}, o, { branch: branch || { name: { vi: o.branchId } } });
  const label = (STATUS_LABEL[o.status] || {})[lang] || o.status;
  const inner = '<p style="font-size:16px;margin:0 0 8px">' + h(t.hello) + ' <b>' + h(o.name) + '</b>,</p><p style="margin:0">' + h(t.statusLine) + '</p>' +
    '<p style="font-size:22px;font-family:Georgia,serif;color:#8B263E;margin:12px 0">' + h(label) + '</p>' + table_(detailRows_(t, ob, lang)) + btn_(lookupUrl_(st), t.lookup);
  MailApp.sendEmail({ to: o.email, subject: '[' + st.shop_name + '] ' + t.status + ' ' + o.id + ' — ' + label, htmlBody: mailShell_(inner, st, branch), name: st.shop_name,
    body: t.statusLine + ' ' + label });
}

function testNotify_() {
  const st = getSettings_();
  const me = Session.getEffectiveUser().getEmail();
  const r = { telegram: sendTelegram_('<b>✅ Thử thông báo Telegram</b>\n' + escHtml_(st.shop_name)), line: sendLine_('✅ Thử thông báo LINE — ' + st.shop_name), email: false };
  try { MailApp.sendEmail({ to: me, subject: '✅ Thử email — ' + st.shop_name, htmlBody: mailShell_('<p>Gmail hoạt động bình thường.</p>', st, null) }); r.email = me; } catch (err) { r.emailError = String(err); }
  return { ok: true, result: r };
}

/* ======================== CHẠY THỦ CÔNG TRONG EDITOR ==================== */

/** 1 lần: điền thông tin → Run → XOÁ giá trị khỏi code sau khi chạy */
function setupSecrets() {
  const values = {
    ADMIN_PASSWORD: '',        // mật khẩu quản trị ban đầu (đổi được trong trang quản trị)
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '',
    LINE_CHANNEL_TOKEN: '',
    LINE_ADMIN_ID: '',
    WORKER_SECRET: '',         // chuỗi ngẫu nhiên dài, đặt giống biến WORKER_SECRET trên Cloudflare
    CF_API_TOKEN: '',          // tuỳ chọn: báo cáo lượt truy cập
    CF_ACCOUNT_ID: '',
    CF_SITE_TAG: ''
  };
  const p = PropertiesService.getScriptProperties();
  Object.keys(values).forEach(k => { if (values[k]) p.setProperty(k, values[k]); });
  console.log('Đã lưu: ' + Object.keys(values).filter(k => values[k]).join(', ') + '. Hãy xoá các giá trị khỏi code.');
}

/** 1 lần: tạo các tab, cài đặt mặc định, Hỏi đáp mẫu, trigger nhắc lịch */
function setup() {
  Object.keys(SHEETS).forEach(sheet_);
  const have = {}; readRows_('settings').forEach(r => have[r.Khoa] = 1);
  SETTINGS_SCHEMA.forEach(s => { if (!have[s[0]]) writeRow_('settings', 0, { Khoa: s[0], Gia_Tri: typeof s[1] === 'string' ? text_(s[1]) : s[1], Mo_Ta: s[4] }); });
  if (!readRows_('faqs').length) DEFAULT_FAQ.forEach((f, i) => writeRow_('faqs', 0, {
    ID: 'HD' + ('000' + (i + 1)).slice(-3), Cau_Hoi: f[0], Tra_Loi: f[1], Cau_Hoi_EN: f[2], Tra_Loi_EN: f[3],
    Nhom: f[4], Nhom_EN: f[5], Hien_Thi: true, Thu_Tu: i + 1 }));
  imageFolder_();
  installTriggers_();
  cacheClear_();
  const p = PropertiesService.getScriptProperties();
  ['ADMIN_PASSWORD', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'LINE_CHANNEL_TOKEN', 'LINE_ADMIN_ID', 'WORKER_SECRET', 'CF_API_TOKEN']
    .forEach(k => console.log(k + ': ' + (p.getProperty(k) || (k === 'ADMIN_PASSWORD' && p.getProperty('ADMIN_HASH')) ? 'OK' : 'chưa đặt')));
  console.log('Xong. Thêm chi nhánh và trang phục trong trang quản trị (/admin).');
}

function testNotifications() { console.log(JSON.stringify(testNotify_())); }

/** Nhắn 1 tin cho bot rồi chạy hàm này để xem Chat ID */
function getTelegramChatId() {
  const token = secret_('TELEGRAM_BOT_TOKEN');
  if (!token) return console.log('Chưa có TELEGRAM_BOT_TOKEN');
  const data = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', { muteHttpExceptions: true }).getContentText());
  const seen = {};
  (data.result || []).forEach(u => { const c = (u.message || u.channel_post || u.my_chat_member || {}).chat; if (c && !seen[c.id]) { seen[c.id] = 1; console.log('Chat ID: ' + c.id + ' — ' + (c.title || c.first_name || '') + ' (' + c.type + ')'); } });
  if (!Object.keys(seen).length) console.log('Chưa thấy tin nhắn. Nhắn cho bot rồi chạy lại.');
}

/* [câu hỏi VI, trả lời VI, câu hỏi EN, trả lời EN, nhóm VI, nhóm EN] */
const DEFAULT_FAQ = [
  ['Có cần đặt lịch trước không?', 'Nên đặt trước, nhất là mùa hoa anh đào và lá đỏ. Khách vãng lai vẫn được phục vụ nếu còn chỗ.', 'Do I need to book in advance?', 'We recommend it, especially in cherry blossom and autumn seasons. Walk-ins are welcome when slots are free.', 'Đặt lịch', 'Reservation'],
  ['Đặt lịch có mất phí không?', 'Không. Tiền cọc khi đặt online được trừ trực tiếp vào hoá đơn tại tiệm.', 'Is there a booking fee?', 'No. Any deposit paid online is deducted from your bill at the shop.', 'Đặt lịch', 'Reservation'],
  ['Muốn huỷ hoặc đổi lịch thì làm thế nào?', 'Tra cứu đơn để xem mã đơn, rồi nhắn tiệm qua LINE/Telegram kèm mã đơn. Huỷ trước 2 ngày được hoàn cọc.', 'How do I cancel or change a booking?', 'Look up your booking to find the code, then message us on LINE/Telegram. Cancel 2+ days ahead for a deposit refund.', 'Đặt lịch', 'Reservation'],
  ['Nhóm đông người có đặt được không?', 'Được. Nhóm trên 8 người nên nhắn tiệm trước để xếp đủ người mặc đồ và làm tóc.', 'Can large groups book?', 'Yes. For groups over 8, message us first so we can staff enough dressers and stylists.', 'Đặt lịch', 'Reservation'],
  ['Giá thuê đã bao gồm những gì?', 'Kimono, obi, đồ lót kimono, túi xách, guốc, tất tabi và mặc đồ tại tiệm.', 'What is included in the price?', 'Kimono, obi, undergarments, bag, sandals, tabi socks and dressing at the shop.', 'Kimono', 'Kimono'],
  ['Thời gian thuê là bao lâu?', 'Cả ngày, đến giờ trả đồ cùng ngày. Mặc đồ và làm tóc mất khoảng 45–60 phút.', 'How long is the rental?', 'All day, until the return time on the same day. Dressing and styling take about 45–60 minutes.', 'Kimono', 'Kimono'],
  ['Có size cho người cao không?', 'Có. Ghi chiều cao vào phần ghi chú khi đặt lịch để tiệm chuẩn bị.', 'Are larger sizes available?', 'Yes. Add your height in the booking notes so we can prepare.', 'Kimono', 'Kimono'],
  ['Mùa đông mặc kimono có lạnh không?', 'Tiệm có áo khoác haori và miếng dán giữ nhiệt. Bạn có thể mặc áo giữ nhiệt mỏng bên trong.', 'Is kimono cold in winter?', 'We provide haori coats and heat pads. You can wear thin thermals underneath.', 'Kimono', 'Kimono'],
  ['Làm tóc có tính thêm tiền không?', 'Xem bảng giá để biết mức phí hiện tại. Khách đặt online chọn sẵn mục làm tóc khi đặt lịch.', 'Is hair styling extra?', 'See the pricing page for the current rate. Online bookings can add styling at checkout.', 'Làm tóc & trang điểm', 'Hair & Makeup'],
  ['Có trang điểm tại tiệm không?', 'Có dịch vụ trang điểm nhẹ phù hợp với kimono. Nhắn trước nếu bạn muốn kiểu đậm hơn.', 'Do you offer makeup?', 'We offer light makeup suited to kimono. Message us ahead for a stronger look.', 'Làm tóc & trang điểm', 'Hair & Makeup'],
  ['Ảnh được giao khi nào?', 'Ảnh đã chỉnh được gửi qua link tải. Thời gian giao tuỳ gói, xem trang Chụp ảnh.', 'When do I get my photos?', 'Edited photos arrive via a download link. Delivery time depends on the package — see the Photoshoot page.', 'Chụp ảnh', 'Photos'],
  ['Trời mưa thì buổi chụp thế nào?', 'Tiệm đổi sang điểm có mái che hoặc đổi ngày miễn phí nếu báo trước giờ hẹn.', 'What happens if it rains?', 'We move to covered spots or reschedule free of charge if you tell us before your slot.', 'Chụp ảnh', 'Photos'],
  ['Trả đồ muộn có bị phí không?', 'Trả sau giờ quy định có thể bị phụ phí. Nếu cần trả hôm sau, nhắn tiệm trước để được hướng dẫn.', 'Is there a late return fee?', 'Returning after the cut-off may incur a fee. For next-day returns, message us in advance.', 'Trả đồ', 'Return'],
  ['Trả ở chi nhánh khác được không?', 'Vui lòng trả tại chi nhánh bạn đã thuê để tiệm kiểm đồ đúng bộ.', 'Can I return at another branch?', 'Please return to the branch you rented from so we can check the full set.', 'Trả đồ', 'Return'],
  ['Có giữ hành lý giúp không?', 'Có, tiệm giữ vali và balo trong giờ mở cửa. Số lượng tuỳ chỗ trống từng ngày.', 'Can you store my luggage?', 'Yes, we store suitcases and backpacks during opening hours, subject to space.', 'Hành lý', 'Luggage'],
  ['Làm bẩn hoặc hỏng kimono thì sao?', 'Vết bẩn nhẹ do sử dụng bình thường thì không tính phí. Hỏng nặng sẽ tính theo chi phí sửa thực tế.', 'What if I stain or damage the kimono?', 'Light marks from normal use are free. Serious damage is charged at the actual repair cost.', 'An toàn', 'Safety'],
  ['Nhân viên nói được tiếng gì?', 'Tiếng Việt, tiếng Anh và tiếng Nhật.', 'What languages do you speak?', 'Vietnamese, English and Japanese.', 'An toàn', 'Safety']
];
