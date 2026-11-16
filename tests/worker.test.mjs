// Kiểm thử Worker: API proxy, Stripe checkout + webhook, SEO, sitemap — với backend Code.gs giả lập
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createServices } from '../web/src/demo/gasServices.js';
import { createBackend } from '../web/src/demo/backend.generated.js';
import worker from '../worker/index.js';

const state = {}; const B = createBackend(createServices(state));
state.props.ADMIN_PASSWORD = 'pw-123456789'; state.props.WORKER_SECRET = 'ws-secret';
B.setup();
const stripeCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith('https://gas.test')) {
    const u = new URL(url);
    const out = init.method === 'POST' ? B.doPost({ postData: { contents: init.body } }) : B.doGet({ parameter: Object.fromEntries(u.searchParams) });
    return new Response(out.getContent(), { headers: { 'content-type': 'application/json' } });
  }
  if (url.startsWith('https://api.stripe.com')) {
    const f = new URLSearchParams(init.body); stripeCalls.push(f);
    if (f.getAll('payment_method_types[1]').includes('paypay')) return new Response(JSON.stringify({ error: { message: 'paypay not enabled' } }));
    return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }));
  }
  throw new Error('unexpected fetch ' + url);
};
const indexHtml = '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>';
const env = {
  APPS_SCRIPT_URL: 'https://gas.test/exec', WORKER_SECRET: 'ws-secret', STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_PAYPAY: 'true',
  ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; return p === '/' ? new Response(indexHtml, { headers: { 'content-type': 'text/html' } }) : new Response('asset ' + p); } }
};
const ctx = { waitUntil() {} };
const call = (path, init) => worker.fetch(new Request('https://sakurayuki.test' + path, init), env, ctx);
const postApi = async body => (await call('/api', { method: 'POST', body: JSON.stringify(body) })).json();

let r = await postApi({ action: 'adminLogin', password: 'pw-123456789' }); const token = r.token; assert.ok(token);
r = await postApi({ action: 'save', token, collection: 'branches', item: { Ten: 'Asakusa', Dia_Chi: 'Taito-ku, Tokyo', Suc_Chua: 6 } }); const cn = r.item.ID;
r = await postApi({ action: 'save', token, collection: 'products', item: { Ten_Kimono: 'Furisode', Loai_Goi: 'Kimono nữ', Gia_JPY: 9800 } }); const sp = r.item.ID;
r = await postApi({ action: 'save', token, collection: 'posts', item: { Tieu_De: 'Mặc kimono ở Asakusa', Tom_Tat: 'Kinh nghiệm', Noi_Dung: '## Mẹo\n<script>alert(1)</script> **đẹp**', Trang_Thai: 'Đã đăng' } });
await postApi({ action: 'saveSettings', token, values: { payment_online: true } });

r = await (await call('/api?action=site')).json(); assert.equal(r.site.products.length, 1);
r = await postApi({ action: 'paymentInfo', id: 'x', secret: 'ws-secret' }); assert.equal(r.error, 'Forbidden');

const day = new Date(Date.now() + 3 * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
r = await postApi({ action: 'createOrder', branchId: cn, productId: sp, date: day, time: '10:00', women: 2, name: 'Khách', email: 'k@x.com', phone: '09012345678', lang: 'vi', source: 'TikTok' });
assert.ok(r.ok, r.error); assert.equal(r.needsPayment, true); assert.equal(r.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_1');
const last = stripeCalls.at(-1); assert.equal(last.get('line_items[0][price_data][unit_amount]'), '2000'); assert.equal(last.get('metadata[order_id]'), r.orderId);
console.log('stripe calls', stripeCalls.length, '(paypay fallback to card)');
const oid = r.orderId;
// webhook với chữ ký sai
const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', metadata: { order_id: oid }, payment_intent: 'pi_1', amount_total: 2000 } } });
let res = await call('/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=bad' } }); assert.equal(res.status, 400);
const t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', 'whsec_test').update(t + '.' + payload).digest('hex');
res = await call('/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${t},v1=${sig}` } }); assert.equal(res.status, 200);
r = await postApi({ action: 'orderStatus', id: oid, email: 'k@x.com' }); assert.equal(r.order.status, 'Đã nhận cọc');
r = await (await call('/api/checkout', { method: 'POST', body: JSON.stringify({ id: oid, email: 'k@x.com' }) })).json(); assert.equal(r.ok, false);
console.log('checkout after paid:', r.error);

// SEO
let html = await (await call('/blog/mac-kimono-o-asakusa')).text();
assert.match(html, /<title>Mặc kimono ở Asakusa \| Sakura Yuki Kimono Rental<\/title>/); assert.match(html, /<h2>Mẹo<\/h2>/); assert.ok(!html.includes('<script>alert'));
assert.match(html, /BlogPosting/);
res = await call('/blog/khong-co'); assert.equal(res.status, 404);
res = await call('/khong-ton-tai'); assert.equal(res.status, 404);
html = await (await call('/lien-he')).text(); assert.match(html, /Taito-ku/);
html = await (await call('/')).text(); assert.match(html, /LocalBusiness/);
res = await call('/admin'); assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
html = await (await call('/sitemap.xml')).text(); assert.match(html, /blog\/mac-kimono-o-asakusa/);
assert.equal(await (await call('/assets/app.js')).text(), 'asset /assets/app.js');
console.log((await (await call('/robots.txt')).text()).trim().replace(/\n/g, ' | '));
console.log('ALL WORKER TESTS PASSED');
