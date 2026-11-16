/**
 * =============================================================================
 *  SAKURA YUKI — CLOUDFLARE WORKER
 *  • Phục vụ website (thư mục web/dist) + SEO: tiêu đề, mô tả, nội dung bài blog
 *    được chèn sẵn vào HTML để Google đọc được.
 *  • /api  → chuyển tiếp tới Google Apps Script (có cache 60 giây ở biên).
 *  • Thu cọc online qua Stripe Checkout (thẻ + PayPay) và nhận webhook xác nhận.
 *  • /sitemap.xml cho Google.
 *
 *  Biến môi trường (Cloudflare → Worker → Settings → Variables and Secrets):
 *    APPS_SCRIPT_URL        URL Web App …/exec                  (bắt buộc)
 *    WORKER_SECRET          chuỗi bí mật, giống Script Property WORKER_SECRET
 *    STRIPE_SECRET_KEY      sk_live_… / sk_test_…               (để thu cọc online)
 *    STRIPE_WEBHOOK_SECRET  whsec_…                             (để thu cọc online)
 *    STRIPE_PAYPAY          "true" để bật PayPay (mặc định chỉ thẻ)
 * =============================================================================
 */
import { renderMarkdown, plainText } from '../web/src/lib/markdown.js';

const PAGES = {
  '/': { vi: 'Thuê kimono cao cấp tại Tokyo', en: 'Premium kimono rental in Tokyo' },
  '/goi-thue': { vi: 'Gói thuê kimono', en: 'Kimono rental plans' },
  '/bang-gia': { vi: 'Bảng giá', en: 'Pricing' },
  '/dat-lich': { vi: 'Đặt lịch thuê kimono', en: 'Book a kimono rental' },
  '/dat-lich/ket-qua': { vi: 'Kết quả đặt lịch', en: 'Booking result', noindex: true },
  '/tra-cuu': { vi: 'Tra cứu đơn', en: 'Find your booking', noindex: true },
  '/chup-anh': { vi: 'Gói chụp ảnh kimono', en: 'Kimono photoshoot packages' },
  '/tinh-gia': { vi: 'Tính giá nhanh', en: 'Price estimate' },
  '/mau-toc': { vi: 'Mẫu làm tóc', en: 'Hairstyles' },
  '/hoi-dap': { vi: 'Câu hỏi thường gặp', en: 'FAQ' },
  '/album': { vi: 'Album ảnh khách hàng', en: 'Guest gallery' },
  '/blog': { vi: 'Blog kinh nghiệm thuê kimono', en: 'Blog' },
  '/lien-he': { vi: 'Liên hệ & chi nhánh', en: 'Contact & shops' },
  '/admin': { vi: 'Quản trị', en: 'Admin', noindex: true }
};
const ADMIN_MUTATIONS = new Set(['save', 'delete', 'reorder', 'saveSettings', 'uploadImage', 'setImageUrl', 'deleteImage', 'updateOrderStatus']);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/api' || path.startsWith('/api/')) return await handleApi(request, env, ctx, url, path);
      if (path === '/sitemap.xml') return await sitemap(env, ctx, url);
      if (path === '/robots.txt') return new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
      if (path === '/index.html') return Response.redirect(url.origin + '/', 301);
      if (/\.[a-z0-9]{2,5}$/i.test(path)) return env.ASSETS.fetch(request);   // file tĩnh: js, css, ảnh, robots.txt
      return await renderPage(request, env, ctx, url, path);
    } catch (err) {
      console.error(err);
      return path.startsWith('/api') ? json({ ok: false, error: 'Lỗi máy chủ, vui lòng thử lại' }, 502) : env.ASSETS.fetch(new Request(url.origin + '/', request));
    }
  }
};

/* ================================ API ================================== */

async function gas(env, method, params) {
  if (!env.APPS_SCRIPT_URL) throw new Error('Chưa cấu hình APPS_SCRIPT_URL');
  const res = method === 'GET'
    ? await fetch(env.APPS_SCRIPT_URL + '?' + new URLSearchParams(params), { redirect: 'follow' })
    : await fetch(env.APPS_SCRIPT_URL, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(params), redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); } catch (_) { throw new Error('Apps Script trả về dữ liệu không hợp lệ (' + res.status + ')'); }
}

const edgeCache = () => (typeof caches !== 'undefined' ? caches.default : null);
const cacheKey = (url, name) => new Request(url.origin + '/__cache/' + name);

async function cachedGas(env, ctx, url, name, params, ttl = 60) {
  const cache = edgeCache(), key = cacheKey(url, name);
  if (cache) { const hit = await cache.match(key); if (hit) return hit.json(); }
  const data = await gas(env, 'GET', params);
  if (cache && data.ok) ctx.waitUntil(cache.put(key, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + ttl } })));
  return data;
}

async function purgeSite(url) {
  const cache = edgeCache();
  if (cache) await cache.delete(cacheKey(url, 'site'));
}

async function handleApi(request, env, ctx, url, path) {
  if (path === '/api/stripe-webhook' && request.method === 'POST') return stripeWebhook(request, env);
  if (path === '/api/checkout' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    return json(await startCheckout(env, url, String(body.id || ''), String(body.email || ''), body.lang));
  }
  if (request.method === 'GET') {
    const p = Object.fromEntries(url.searchParams);
    if (p.action === 'site') return json(await cachedGas(env, ctx, url, 'site', { action: 'site' }), 200, { 'cache-control': 'public, max-age=30' });
    if (p.action === 'post') return json(await cachedGas(env, ctx, url, 'post-' + encodeURIComponent(p.slug || ''), { action: 'post', slug: p.slug || '' }));
    if (['availability', 'lookup'].includes(p.action)) return json(await gas(env, 'GET', p));
    return json({ ok: false, error: 'Không hỗ trợ' }, 400);
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') return json({ ok: false, error: 'Yêu cầu không hợp lệ' }, 400);
  if (['paymentInfo', 'markPaid'].includes(body.action)) return json({ ok: false, error: 'Forbidden' }, 403);   // chỉ Worker được gọi
  delete body.secret;
  const data = await gas(env, 'POST', body);
  if (data.ok && ADMIN_MUTATIONS.has(body.action)) ctx.waitUntil(purgeSite(url));
  // Đơn cần trả cọc online → tạo phiên thanh toán Stripe ngay
  if (body.action === 'createOrder' && data.ok && data.needsPayment) {
    const pay = await startCheckout(env, url, data.orderId, String(body.email || ''), body.lang);
    data.checkoutUrl = pay.ok ? pay.url : null;
    if (!pay.ok) data.paymentError = pay.error;
  }
  return json(data);
}

/* ============================ STRIPE CHECKOUT ========================== */

async function startCheckout(env, url, id, email, lang) {
  if (!env.STRIPE_SECRET_KEY || !env.WORKER_SECRET) return { ok: false, error: 'Tiệm chưa bật thanh toán online. Vui lòng nhắn tiệm để được hướng dẫn đặt cọc.' };
  const info = await gas(env, 'POST', { action: 'paymentInfo', id, secret: env.WORKER_SECRET });
  if (!info.ok) return { ok: false, error: 'Không tìm thấy đơn' };
  const o = info.order;
  if (o.email.toLowerCase() !== email.toLowerCase()) return { ok: false, error: 'Không tìm thấy đơn' };
  if (o.status !== 'Chờ thanh toán') return { ok: false, error: 'Đơn này không cần thanh toán thêm' };
  if (o.expired) return { ok: false, error: 'Đơn đã quá hạn thanh toán, vui lòng đặt lại' };
  const back = url.origin + '/dat-lich/ket-qua?order=' + encodeURIComponent(id) + '&email=' + encodeURIComponent(email);
  const make = async withPayPay => {
    const f = new URLSearchParams({
      mode: 'payment', 'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'jpy',
      'line_items[0][price_data][unit_amount]': String(o.amount),
      'line_items[0][price_data][product_data][name]': `${o.shop} — Deposit ${id} (${o.guests} pax)`,
      customer_email: o.email, client_reference_id: id, 'metadata[order_id]': id,
      'payment_intent_data[metadata][order_id]': id,
      success_url: back + '&paid=1', cancel_url: back + '&cancelled=1',
      locale: ({ vi: 'vi', en: 'en', ja: 'ja' })[lang] || 'auto',
      expires_at: String(Math.floor(Date.now() / 1000) + 30 * 60 + 30),
      'payment_method_types[0]': 'card'
    });
    if (withPayPay) f.append('payment_method_types[1]', 'paypay');
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', body: f,
      headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': id + '-' + (withPayPay ? 'pp' : 'card') + '-' + Math.floor(Date.now() / 60000) }
    });
    return res.json();
  };
  let s = await make(env.STRIPE_PAYPAY === 'true');
  if (s.error && env.STRIPE_PAYPAY === 'true') s = await make(false);            // PayPay chưa được Stripe kích hoạt → chỉ dùng thẻ
  if (s.error || !s.url) { console.error('Stripe', JSON.stringify(s.error)); return { ok: false, error: 'Không tạo được trang thanh toán' }; }
  return { ok: true, url: s.url };
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function verifyStripe(payload, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map(kv => kv.split('=')).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || '').split(',').filter(x => x.trim().startsWith('v1=')).map(x => x.trim().slice(3));
  if (!parts.t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;           // chống gửi lại tin cũ
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + payload)));
  return sigs.some(s => s.length === expected.length && [...s].reduce((a, c, i) => a | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

async function stripeWebhook(request, env) {
  const payload = await request.text();
  if (!env.STRIPE_WEBHOOK_SECRET || !(await verifyStripe(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))) return json({ ok: false }, 400);
  const evt = JSON.parse(payload);
  const s = evt.data && evt.data.object;
  const paidEvent = (evt.type === 'checkout.session.completed' && s.payment_status === 'paid') || evt.type === 'checkout.session.async_payment_succeeded';
  if (paidEvent) {
    const id = (s.metadata && s.metadata.order_id) || s.client_reference_id;
    const r = await gas(env, 'POST', { action: 'markPaid', id, payment: s.payment_intent || s.id, amount: s.amount_total, secret: env.WORKER_SECRET });
    if (!r.ok) return json({ ok: false }, 500);                                   // Stripe sẽ gửi lại
  }
  return json({ received: true });
}

/* ============================ SEO & TRANG HTML ========================= */

async function renderPage(request, env, ctx, url, path) {
  const indexRes = await env.ASSETS.fetch(new Request(url.origin + '/', request));
  let html = await indexRes.text();
  let site = null;
  try { const r = await cachedGas(env, ctx, url, 'site', { action: 'site' }); site = r.ok ? r.site : null; } catch (_) {}
  const st = (site && site.settings) || {};
  const shop = st.shop_name || 'Sakura Yuki Kimono Rental';
  const tagline = st.shop_tagline_vi || PAGES['/'].vi;
  let status = 200, title, desc, body = '', image = (site && site.images && site.images.hero) || '', noindex = false;
  const lds = [];   // các khối dữ liệu cấu trúc cho Google

  const post = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (post) {
    const r = await cachedGas(env, ctx, url, 'post-' + post[1], { action: 'post', slug: post[1] }).catch(() => ({ ok: false }));
    if (r.ok) {
      const p = r.post;
      title = `${p.title} | ${shop}`; desc = p.summary || plainText(p.content); image = p.cover || image;
      body = `<article><h1>${esc(p.title)}</h1><p>${esc(p.date)}</p>${renderMarkdown(p.content)}</article><p><a href="/blog">← Blog</a> · <a href="/dat-lich">Đặt lịch</a></p>`;
      lds.push({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.date, dateModified: p.updated || p.date, image: p.cover || undefined, inLanguage: p.lang, publisher: { '@type': 'Organization', name: shop } });
    } else status = 404;
  } else if (PAGES[path]) {
    const pg = PAGES[path];
    noindex = !!pg.noindex;
    title = path === '/' ? `${shop} | ${tagline}` : `${pg.vi} | ${shop}`;
    desc = path === '/' ? `${shop} — ${tagline}. Đặt lịch online, mặc đồ và làm tóc chuyên nghiệp.` : `${pg.vi} — ${shop}. ${tagline}.`;
    const nav = Object.entries(PAGES).filter(([, v]) => !v.noindex).map(([k, v]) => `<a href="${k}">${esc(v.vi)}</a>`).join(' · ');
    let extra = '';
    if (path === '/blog' && site) extra = '<ul>' + site.posts.map(p => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a> — ${esc(p.summary || '')}</li>`).join('') + '</ul>';
    if ((path === '/goi-thue' || path === '/bang-gia') && site) extra = '<ul>' + site.products.map(p => `<li>${esc(p.name.vi)} — ¥${Number(p.price).toLocaleString('en-US')}</li>`).join('') + '</ul>';
    if (path === '/lien-he' && site) extra = '<ul>' + site.branches.map(b => `<li>${esc(b.name.vi)} — ${esc(b.address)}</li>`).join('') + '</ul>';
    if (path === '/chup-anh' && site) extra = '<ul>' + site.photoshoots.map(p => `<li>${esc(p.name.vi)} — ¥${Number(p.price).toLocaleString('en-US')}${p.duration ? ' · ' + esc(p.duration) : ''}</li>`).join('') + '</ul>';
    if (path === '/hoi-dap' && site) extra = site.faqs.map(f => `<h2>${esc(f.q.vi)}</h2><p>${esc(f.a.vi)}</p>`).join('');
    body = `<h1>${esc(path === '/' ? shop : pg.vi)}</h1><p>${esc(desc)}</p>${extra}<nav>${nav}</nav>`;
    if (path === '/' && site) lds.push({ '@context': 'https://schema.org', '@graph': site.branches.map(b => ({ '@type': 'LocalBusiness', name: `${shop} — ${b.name.vi}`, address: b.address, telephone: b.phone || st.shop_phone || undefined, url: url.origin })) });
    // Trang hỏi đáp: khai báo FAQPage để Google hiện câu hỏi ngay trong kết quả tìm kiếm
    if (path === '/hoi-dap' && site && site.faqs.length) lds.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: site.faqs.slice(0, 30).map(f => ({ '@type': 'Question', name: f.q.vi, acceptedAnswer: { '@type': 'Answer', text: f.a.vi } }))
    });
  } else status = 404;

  if (status === 404) { title = `404 | ${shop}`; desc = 'Không tìm thấy trang'; noindex = true; body = '<h1>404</h1><p><a href="/">← Trang chủ</a></p>'; }
  const canonical = url.origin + (path === '/' ? '/' : path);
  // Đường dẫn phân cấp: Google hiện "Trang chủ › Bảng giá" thay vì URL thô
  if (status === 200 && path !== '/') {
    const leaf = post ? title.split(' | ')[0] : (PAGES[path] ? PAGES[path].vi : '');
    if (leaf) lds.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: shop, item: url.origin + '/' },
        ...(post ? [{ '@type': 'ListItem', position: 2, name: PAGES['/blog'].vi, item: url.origin + '/blog' }] : []),
        { '@type': 'ListItem', position: post ? 3 : 2, name: leaf, item: canonical }
      ]
    });
  }
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="${post ? 'article' : 'website'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    noindex ? '<meta name="robots" content="noindex">' : '',
    ...lds.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`),
    st.cf_beacon_token ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: st.cf_beacon_token, spa: true })}'></script>` : ''
  ].filter(Boolean).join('\n    ');
  html = html.replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root"><div data-ssr style="max-width:720px;margin:0 auto;padding:120px 16px 48px;font-family:serif">${body}</div></div>`);
  const headers = {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'geolocation=(), microphone=(), camera=()'
  };
  if (path === '/admin' || path.startsWith('/admin/')) headers['x-robots-tag'] = 'noindex, nofollow';
  return new Response(html, { status, headers });
}

async function sitemap(env, ctx, url) {
  let posts = [];
  try { const r = await cachedGas(env, ctx, url, 'site', { action: 'site' }); posts = r.ok ? r.site.posts : []; } catch (_) {}
  const urls = Object.entries(PAGES).filter(([, v]) => !v.noindex).map(([k]) => `<url><loc>${url.origin}${k}</loc></url>`)
    .concat(posts.map(p => `<url><loc>${url.origin}/blog/${esc(p.slug)}</loc><lastmod>${esc(p.updated || p.date)}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

export const _test = { verifyStripe, renderMarkdown };
