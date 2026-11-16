# Sakura Yuki Kimono Rental — website đặt lịch

Website thuê kimono 2 ngôn ngữ (Việt / Anh) cho 2 cửa hàng Asakusa & Ginza, kèm trang quản trị.

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Website khách + trang quản trị `/admin` | React 19 + TypeScript + Vite + Tailwind | `web/` |
| Máy chủ trung gian (API, SEO, sitemap, thanh toán Stripe) | Cloudflare Worker | `worker/` |
| Dữ liệu & thông báo (Sheets, Gmail, Telegram, LINE, Drive) | Google Apps Script | `apps-script/Code.gs` |

Chi phí vận hành: Cloudflare Workers (gói miễn phí 100.000 lượt/ngày) + Google (miễn phí) + phí Stripe trên mỗi giao dịch + tên miền.

## Tính năng

**Khách:** trang chủ, gói thuê (chia theo nhóm kimono), bảng giá, tính giá nhanh, đặt lịch 5 bước (chọn chi nhánh → gói → ngày giờ còn chỗ → số khách → liên hệ), trả cọc online bằng thẻ / PayPay, tra cứu đơn bằng email hoặc SĐT, mẫu tóc, album, blog, hỏi đáp, liên hệ có bản đồ; sáng/tối; ghi nhận nguồn khách (Google, Instagram, TikTok, utm_source…).

**Quản trị (`/admin`):** tổng quan (khách hôm nay, đơn 7 ngày, cọc 30 ngày, nguồn khách, ngôn ngữ), lượt truy cập (Cloudflare Web Analytics: số lượt, trang giới thiệu, quốc gia, thiết bị), đơn hàng (lọc, đổi trạng thái → email khách, xuất CSV), trang phục, chi nhánh (khung giờ, sức chứa mỗi khung, ngày nghỉ), blog (Markdown, chèn ảnh, hẹn ngày đăng), hỏi đáp, đánh giá, ảnh website, cài đặt bật/tắt (đặt lịch, thanh toán online, Telegram, LINE, email, nhắc lịch, giao diện sáng/tối, thông báo đầu trang…), đổi mật khẩu.

**Tự động:** email xác nhận, email đổi trạng thái, email nhắc lịch 1 ngày trước, tự huỷ đơn chưa trả cọc sau 35 phút (trả lại chỗ), chống đặt vượt sức chứa khi 2 khách đặt cùng lúc.

**Bản 2 (giao diện mới):** ảnh bìa tràn màn hình, tiêu đề hồng đất căn giữa, thẻ ảnh bo góc, nút bo tròn, nút chat nổi. Thêm các mục Concept, Gói chụp ảnh (`/chup-anh`), Dịch vụ kèm theo, Kiểu tóc — mỗi mục quản lý riêng trong `/admin` và bật/tắt ở Cài đặt → Giao diện. Mỗi trang phục / kiểu tóc / gói chụp / concept / dịch vụ có 1 ảnh chính + tối đa 9 ảnh phụ + 1 video (link YouTube, Google Drive hoặc file .mp4; link TikTok/Instagram mở tab mới). Album tối đa 60 ảnh, tải nhiều ảnh một lần. Chữ trên trang chủ sửa ở Cài đặt → Nội dung trang chủ (để trống = câu mặc định). Huy hiệu điểm Google chỉ hiện khi nhập điểm thật ở Cài đặt → Thông tin tiệm.

**Bản 3 (cấu trúc trang con):** mọi trang con dùng cùng một khung — đầu trang có dòng chữ nhỏ + tiêu đề + 2 nút, cuối trang có mini hỏi đáp + danh sách bài cẩm nang + băng kêu gọi đặt lịch.

- **Gói thuê** (`/goi-thue`): chia theo nhóm kimono, có dãy link nhảy nhanh tới từng nhóm, mỗi nhóm có mô tả riêng + giá khởi điểm + thư viện ảnh, và mục "Chọn kimono thế nào?".
- **Bảng giá** (`/bang-gia`): dải "giá đã gồm" ở đầu, thẻ giá xếp dọc theo nhóm (thay bảng cũ), giá thẻ/ví điện tử hiện dưới mỗi mức giá khi nhập `card_fee_percent`, mục Thanh toán & chính sách.
- **Chụp ảnh** (`/chup-anh`): bộ chọn Một người / Cặp đôi / Nhóm, bảng gói & giá (thời lượng, số ảnh), mục "mọi gói đều có" và "tuỳ chọn thêm", quy trình nhận ảnh 3 bước, lưới ô chính sách.
- **Hỏi đáp** (`/hoi-dap`): gom câu hỏi theo chủ đề, có link nhảy nhanh và ô tìm kiếm. Chủ đề khai báo ở cột `Nhom` của tab `HOI_DAP`.
- **Liên hệ** (`/lien-he`): bản đồ lớn từng cửa hàng kèm thông tin đi lại, danh sách kênh liên hệ xếp dọc dễ bấm trên điện thoại.
- **Tính giá nhanh** (`/tinh-gia`, mới): khách chọn gói + số khách + làm tóc + gói chụp + dịch vụ kèm, xem tổng tạm tính và chi tiết từng dòng, rồi chuyển sang đặt lịch. Tắt ở Cài đặt → Đặt lịch.
- **Nhóm kimono** (tab `NHOM_KIMONO`, quản trị → Nhóm kimono): mô tả cho từng mục ở trang Gói thuê. Ô **Tên (Tiếng Việt)** phải trùng đúng với **Loại gói** của trang phục.
- Chữ trên các trang con sửa ở **Cài đặt → Nội dung trang con**. Ô dạng danh sách: mỗi dòng một ý; dòng có dấu `|` tách thành "Tiêu đề | Nội dung".
- Thông báo đầu trang nay có nút tắt (khách tắt rồi, đổi nội dung thông báo thì hiện lại).
- Thêm cho Google: `FAQPage` ở trang Hỏi đáp (hiện câu hỏi ngay trong kết quả tìm kiếm), `BreadcrumbList` ở mọi trang con, và nội dung hỏi đáp / gói chụp được chèn sẵn vào HTML cho bot đọc.
- Thêm header bảo mật (`x-content-type-options`, `referrer-policy`, `permissions-policy`), tôn trọng cài đặt "giảm hiệu ứng" của khách, menu trượt đóng được bằng phím Esc, ảnh phụ tăng lên tối đa 15 ảnh mỗi mục.

> Nâng cấp lên bản mới: dán `Code.gs` mới, chạy lại hàm `setup` (tự thêm cột và tab mới, không mất dữ liệu), rồi Deploy → New version.

## Cài đặt

### 1. Google Sheets + Apps Script
1. Tạo Google Sheet mới → **Extensions → Apps Script** → xoá code mẫu, dán toàn bộ `apps-script/Code.gs` → Lưu.
2. Trong hàm `setupSecrets` (cuối file) điền:
   - `ADMIN_PASSWORD` — mật khẩu quản trị ban đầu.
   - `WORKER_SECRET` — chuỗi ngẫu nhiên dài (vd tạo bằng `openssl rand -hex 32`), dùng lại ở bước 3.
   - Telegram: tạo bot với @BotFather → `TELEGRAM_BOT_TOKEN`; thêm bot vào nhóm, nhắn 1 tin, chạy hàm `getTelegramChatId` để lấy `TELEGRAM_CHAT_ID`.
   - LINE (tuỳ chọn): `LINE_CHANNEL_TOKEN`, `LINE_ADMIN_ID` từ LINE Developers (gói miễn phí 200 tin/tháng).
   
   Chọn hàm `setupSecrets` → **Run** → cấp quyền. **Sau đó xoá các giá trị vừa điền khỏi code** (chúng đã nằm trong Script Properties).
3. Chọn hàm `setup` → **Run** (tạo các tab, hỏi đáp mẫu, trigger nhắc lịch & huỷ đơn quá hạn).
4. Chạy `testNotifications` để thử Telegram / LINE / Gmail.
5. **Deploy → New deployment → Web app**, Execute as: *Me*, Who has access: *Anyone* → copy URL `…/exec`.
6. Mỗi lần sửa `Code.gs`: **Deploy → Manage deployments → ✎ → Version: New version** (URL giữ nguyên).

> Không đổi tên tab hoặc tên cột trong Sheet. Có thể sửa dữ liệu trực tiếp trên Sheet, website cập nhật sau ~1 phút.

### 2. Cloudflare Worker
Cần Node.js 20+.
```bash
npm install
npx wrangler login
```
- Mở `wrangler.jsonc`, dán URL `…/exec` vào `APPS_SCRIPT_URL`.
- Đặt bí mật:
```bash
npx wrangler secret put WORKER_SECRET          # giống giá trị trong Apps Script
npx wrangler secret put STRIPE_SECRET_KEY      # sk_live_… (hoặc sk_test_… khi thử)
npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_… (bước 3)
```
- Triển khai: `npm run deploy`. Gắn tên miền: Cloudflare → Workers → sakura-yuki → Settings → Domains & Routes.

**Tự deploy khi đẩy code lên GitHub:** đẩy repo lên GitHub → Cloudflare → Workers → sakura-yuki → Settings → Builds → Connect repository. Build command: `npm run build`, Deploy command: `npx wrangler deploy`.

### 3. Stripe (thu cọc online)
1. Tạo tài khoản Stripe Nhật (stripe.com/jp), hoàn tất xác minh doanh nghiệp.
2. Developers → API keys → copy Secret key → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint: `https://<tên-miền>/api/stripe-webhook`, sự kiện `checkout.session.completed` → copy Signing secret → `STRIPE_WEBHOOK_SECRET`.
4. PayPay: Settings → Payment methods → bật PayPay; khi Stripe duyệt, đặt `"STRIPE_PAYPAY": "true"` trong `wrangler.jsonc` và deploy lại. Chưa duyệt thì website tự dùng thẻ.
5. Trong `/admin` → Cài đặt → Thanh toán: bật **Bắt buộc trả cọc online**.

Đơn chờ thanh toán được giữ chỗ 35 phút; quá hạn tự huỷ. Hoàn cọc làm trong Stripe Dashboard → Payments → Refund.

### 4. Báo cáo lượt truy cập (tuỳ chọn)
1. Cloudflare → Analytics & Logs → Web Analytics → Add a site (tên miền) → copy **token** trong đoạn mã JS → dán vào `/admin` → Cài đặt → Kỹ thuật → *Cloudflare Web Analytics token* (Worker tự chèn mã đếm vào trang).
2. Lấy **Site tag** (trong URL trang Web Analytics của site) → `CF_SITE_TAG`; **Account ID** (trang Overview) → `CF_ACCOUNT_ID`; tạo API token (My Profile → API Tokens → Custom: *Account → Account Analytics → Read*) → `CF_API_TOKEN`. Lưu cả 3 vào Script Properties (Apps Script → Project Settings → Script Properties).

### 5. Nội dung ban đầu
Vào `https://<tên-miền>/admin`: thêm **Chi nhánh** (giờ, sức chứa, ngày nghỉ) → **Trang phục** → **Ảnh website** → **Cài đặt** (tên tiệm, điện thoại, LINE/Telegram, mạng xã hội, `website_url`). Khi chưa có ảnh thật, website dùng ảnh minh hoạ vẽ sẵn.

## Bản xem thử (không cần máy chủ)
`npm run preview:demo` → `dist-preview/sakura-yuki-preview.html`. Mở file trên trình duyệt: chạy chính `Code.gs` với Google Sheets giả lập, dữ liệu mẫu (ghi rõ "mẫu") lưu trong trình duyệt. Quản trị: `/admin`, mật khẩu `demo`. Thanh toán là trang giả lập; email/Telegram/LINE hiện trong Cài đặt → "Xem thử: tin đã gửi".

## Phát triển
```bash
npm run build && npx wrangler dev   # Worker + API ở cổng 8787 (terminal 1)
npm run dev                          # giao diện có tải lại nhanh ở http://localhost:5173 (terminal 2)
npm test         # kiểm thử backend (Code.gs với Sheets giả lập) + Worker
npm run build    # build web/dist
```
Sửa `apps-script/Code.gs` xong cần chạy `npm test` (tự sinh lại `web/src/demo/backend.generated.js`). Màu, chữ, khoảng cách theo `DESIGN.md` (token trong `web/src/index.css`).

## Vận hành hằng tháng
- Theo dõi đơn ở `/admin` hoặc nhóm Telegram; đổi trạng thái để khách nhận email.
- Gmail giới hạn ~100 email/ngày với tài khoản thường (Google Workspace: 1.500) — xem số còn lại ở Cài đặt → Kết nối.
- Sao lưu: File → Make a copy của Google Sheet mỗi tháng.
- Bảo mật: đổi mật khẩu quản trị ≥ 10 ký tự sau khi bàn giao; không chia sẻ Script Properties / secrets.
