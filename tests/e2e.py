"""Kiểm tra bản xem thử (web/dist/preview.html) bằng Chrome: lỗi console, tràn ngang, các mục chính của từng trang."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

URL = 'file://' + str(pathlib.Path('dist-preview/sakura-yuki-preview.html').resolve())
PHONE = {'width': 390, 'height': 844}
DESK = {'width': 1280, 'height': 900}

# (nhãn menu, chữ phải thấy trên trang)
PAGES = [
    ('Kiểu kimono', 'Xem theo nhóm'),
    ('Bảng giá', 'Thanh toán & chính sách'),
    ('Chụp ảnh', 'Gói & giá'),
    ('Hỏi đáp', 'Chủ đề'),
    ('Đường đi', 'Kênh liên hệ'),
    ('Tính giá', 'Tổng tạm tính'),
    ('Mẫu tóc', None),
    ('Album', None),
    ('Blog', None),
    ('Tra cứu đơn', None),
    ('Đặt lịch', 'Tóm tắt'),
    ('Trang chủ', 'Vì sao chọn'),
]

errors: list[str] = []


async def overflow(page) -> int:
    return await page.evaluate("Math.max(0, document.documentElement.scrollWidth - window.innerWidth)")


async def close_drawer(page):
    """Đóng menu trượt nếu còn mở (bấm vào trang đang xem thì nó không tự đóng)."""
    drawer = page.locator('div[role="dialog"][aria-modal="true"]')
    if await drawer.count() and await drawer.first.is_visible():
        await page.keyboard.press('Escape')      # hộp thoại phải đóng được bằng Esc
        await page.wait_for_timeout(350)
        if await drawer.count() and await drawer.first.is_visible():
            errors.append('menu trượt không đóng bằng phím Esc')
            await drawer.first.get_by_role('button', name='Close').last.click()
            await page.wait_for_timeout(300)


async def click_link(page, label: str) -> bool:
    """Bấm link đang hiện trên trang (ưu tiên link ở chân trang vì luôn có sẵn)."""
    links = page.get_by_role('link', name=label, exact=True)
    for i in range(await links.count()):
        el = links.nth(i)
        if await el.is_visible():
            await el.scroll_into_view_if_needed()
            await el.click()
            return True
    return False


async def goto(page, label: str):
    """Mở trang (bản xem thử dùng MemoryRouter nên không đi bằng URL được)."""
    await close_drawer(page)
    if not await click_link(page, label):
        menu = page.get_by_role('button', name='Menu')
        if await menu.count() and await menu.first.is_visible():
            await menu.first.click()
            await page.wait_for_timeout(350)
        if not await click_link(page, label):
            raise RuntimeError('không thấy link ' + label)
    await page.wait_for_timeout(700)
    await close_drawer(page)


async def check(page, size_name: str, labels):
    for label, must in labels:
        try:
            await goto(page, label)
        except Exception as e:
            errors.append(f'[{size_name}] không mở được "{label}": {type(e).__name__}')
            continue
        h1 = await page.locator('h1').first.text_content() if await page.locator('h1').count() else ''
        over = await overflow(page)
        ok = True
        if over > 1:
            errors.append(f'[{size_name}] "{label}" tràn ngang {over}px')
            ok = False
        if must:
            found = await page.get_by_text(must, exact=False).count()
            if not found:
                errors.append(f'[{size_name}] "{label}" thiếu mục "{must}"')
                ok = False
        print(f'  {"OK " if ok else "LỖI"} {label:12} h1={(h1 or "")[:38]!r} tràn={over}')


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        for size_name, vp in (('điện thoại', PHONE), ('máy tính', DESK)):
            ctx = await browser.new_context(viewport=vp)
            page = await ctx.new_page()
            page.on('console', lambda m: errors.append(f'[{size_name}] console {m.type}: {m.text[:160]}')
                    if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(f'[{size_name}] pageerror: {str(e)[:160]}'))
            await page.goto(URL)
            await page.wait_for_timeout(1500)
            # chọn tiếng Việt (localStorage trống → site mở theo ngôn ngữ trình duyệt)
            vi = page.get_by_role('button', name='VI', exact=True)
            if await vi.count():
                for i in range(await vi.count()):
                    if await vi.nth(i).is_visible():
                        await vi.nth(i).click(); break
                await page.wait_for_timeout(500)
            else:
                errors.append(f'[{size_name}] không thấy nút đổi ngôn ngữ VI')
            print(f'\n== {size_name} ==')
            await check(page, size_name, PAGES)

            # bộ chọn nhóm ở trang Chụp ảnh
            await goto(page, 'Chụp ảnh')
            await page.wait_for_timeout(300)
            if await page.get_by_role('radio', name='Cặp đôi').count():
                await page.get_by_role('radio', name='Cặp đôi').first.click()
                await page.wait_for_timeout(400)
                n = await page.get_by_text('Gói cặp đôi', exact=False).count()
                print(f'  {"OK " if n else "LỖI"} bộ chọn Cặp đôi → {n} kết quả')
                if not n:
                    errors.append(f'[{size_name}] bộ chọn Cặp đôi không ra gói nào')
            else:
                errors.append(f'[{size_name}] trang Chụp ảnh thiếu bộ chọn nhóm')

            # công cụ tính giá phải cộng tiền khi tăng số khách
            await goto(page, 'Tính giá')
            plus = page.get_by_role('button', name='Nữ +').first
            if await plus.count():
                await plus.click(); await page.wait_for_timeout(300)
                total = await page.locator('aside').first.inner_text()
                print(f'  OK  tính giá cộng được (¥ xuất hiện: {"¥" in total})')
                if '¥' not in total:
                    errors.append(f'[{size_name}] tính giá không ra số tiền')
            else:
                errors.append(f'[{size_name}] tính giá thiếu nút tăng số khách')

            await ctx.close()
        await browser.close()

    print('\n' + '=' * 60)
    if errors:
        print(f'{len(errors)} VẤN ĐỀ:')
        for e in dict.fromkeys(errors):
            print(' -', e)
        sys.exit(1)
    print('KHÔNG CÓ LỖI')


asyncio.run(main())
