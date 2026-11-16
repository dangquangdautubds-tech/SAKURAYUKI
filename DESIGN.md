> **Bản 2 — cập nhật theo yêu cầu chủ tiệm (bố cục tham khảo một trang thuê kimono ở Asakusa, không dùng lại tên, ảnh hay câu chữ của họ).** Token hiện hành nằm trong `web/src/index.css`: nền #FFFFFF, chữ #333333, nút/liên kết #994F4F, tiêu đề lớn #B76E6E, nền be #F5F1EC, mực #2A2422, vàng đồng #C29A59 (đường kẻ). Chữ: Roboto Slab (tiêu đề, weight 400) + Inter (nội dung). Nút bo tròn hoàn toàn, thẻ ảnh bo 16px có lớp tối dần và chữ trắng đè lên, tiêu đề mục căn giữa kèm đường kẻ vàng. Phần dưới đây là bản 1 (kem – đỏ mận), giữ để tham khảo.

# DESIGN.md — Sakura Yuki Kimono Rental

Hướng thiết kế: **tối giản Nhật, ấm và tĩnh** — nền giấy kem, chữ mực xám đen, một màu đỏ mận
cho mọi hành động. Cảm giác của một tiệm kimono ở Asakusa: gọn, sạch, có chi tiết thủ công nhỏ
(hoạ tiết sóng seigaiha, chữ Nhật dọc), không phô trương.

> Hướng này được quyết định từ thương hiệu sẵn có (kem #FAF8F5, đỏ mận #8B263E, chữ #2D3748)
> và mong muốn "Wabi-sabi" của chủ dự án. Chưa đối chiếu với thư viện website thật (UXKIN chưa kết nối).

Mọi giá trị dưới đây đã nằm trong `web/src/index.css` (biến CSS) và `web/tailwind.config.js`.
Trang chỉ dùng **tên** token (`bg-background`, `text-primary`…), không dùng mã màu trực tiếp.

## 1. Màu

| Token | Sáng | Tối | Vai trò |
|---|---|---|---|
| `background` | #FAF8F5 | #1A1716 | Nền trang (giấy kem / mực ấm) |
| `foreground` | #2D3748 | #EFE9E2 | Chữ chính |
| `card` | #FFFFFF | #221E1C | Thẻ, ô nhập, bảng |
| `secondary` / `muted` | #F1ECE4 | #2A2522 | Dải nền phụ, nền khối xen kẽ |
| `muted-foreground` | #5A6474 | #A79F98 | Chữ phụ, chú thích (≥ 4.5:1 trên nền) |
| `border` | #E7DFD6 | #3A3431 | Viền mảnh 1px |
| **`primary`** | **#8B263E** | **#D05A75** | Nút chính, link, trạng thái đang chọn. Màu duy nhất cho hành động |
| `accent` | #F5E9EC | #3A2229 | Nền nhạt cho mục được chọn, nhãn, ô nổi bật |
| `gold` | #B08D57 | #C9A56E | Chỉ để trang trí: đường kẻ, sao đánh giá, số liệu lớn. Không dùng cho chữ nhỏ |
| `success` | #2F7D4F | #5FBF86 | Đã nhận cọc, thành công |
| `warning` | #A86A12 | #E0A54A | Chờ xác nhận, cảnh báo |
| `destructive` | #B42318 | #F07167 | Lỗi, xoá, huỷ |

Quy tắc: không gradient trang trí, không chữ gradient. Ảnh có lớp phủ tối chỉ khi chữ nằm trên ảnh.

## 2. Chữ

- **Tiêu đề**: `Noto Serif` (có dấu tiếng Việt) → `Noto Serif JP` cho tiếng Nhật. Weight 500–600.
- **Nội dung**: `Be Vietnam Pro` → `Noto Sans JP`. Weight 400, 500 cho nhấn.
- Thang cỡ (px / line-height): 12/16 · 14/20 · 16/26 (body) · 18/28 · 22/30 · 28/36 · 36/44 · 48/56.
- Body tối thiểu 16px; dòng 60–75 ký tự (`max-w-prose` cho bài blog).
- Nhãn nhỏ phía trên tiêu đề: 12px, chữ hoa, giãn chữ 0.28em, màu `primary`.
- Chữ Nhật dọc (`writing-mode: vertical-rl`) chỉ làm điểm nhấn trang trí ở hero, ẩn trên di động.

## 3. Khoảng cách & bố cục

- Thang 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Khoảng cách khối: 64px di động, 96px máy tính (`py-16 md:py-24`).
- Chiều rộng nội dung: 1152px (`max-w-6xl`), lề 16px di động / 24px máy tính.
- Bố cục lệch trái là mặc định; chỉ căn giữa cho tiêu đề khối và lời kêu gọi cuối trang.
- Mobile-first: một cột, CTA dính đáy khi cuộn.

## 4. Hình khối & chiều sâu

- Bán kính: `sm` 2px (ô nhập, nút), `md` 6px (thẻ), `lg` 10px (ảnh lớn, hộp thoại). Ảnh hero dùng **vòm** (bo tròn đỉnh) — hình dáng đặc trưng duy nhất.
- Viền 1px `border` thay cho bóng. Chỉ một bóng `shadow-soft` cho hộp thoại, menu nổi, thanh dính.
- Hoạ tiết sóng **seigaiha** chỉ dùng ở nền hero và đầu trang con, độ mờ thấp.

## 5. Thành phần

- **Nút**: chính (nền `primary`, chữ kem), phụ (viền `foreground`/20, chữ `foreground`), lặng (chỉ chữ `primary`, gạch chân khi hover).
  Cao 44px (chạm được trên di động), bo 2px. Hover: tối hơn 8%. Focus: vòng 2px `primary` cách 2px. Disabled: mờ 50%, con trỏ cấm.
- **Link**: màu `primary`, gạch chân khi hover.
- **Ô nhập**: nền `card`, viền `border`, cao 44px, focus viền `primary`. Lỗi: viền và chữ `destructive`.
- **Thẻ trang phục**: ảnh 4:5, tên serif, giá màu `primary`, viền mảnh, không bóng.
- **Điều hướng**: thanh trên cùng màu `primary` (điện thoại, mạng xã hội), header kem mờ, menu ngăn kéo trên di động.
- **Chân trang**: nền `foreground` (mực), chữ kem.
- **Nhãn trạng thái**: chữ 12px trên nền nhạt của màu trạng thái.

## 6. Hình ảnh & biểu tượng

- Ảnh thật của khách và tiệm, chụp ngoại cảnh Asakusa/Ginza. Khi chưa có ảnh: minh hoạ phẳng kimono/torii bằng SVG theo màu thương hiệu.
- Biểu tượng: `lucide-react`, nét 1.5px, cỡ 18–20px. Không dùng emoji làm biểu tượng giao diện.
