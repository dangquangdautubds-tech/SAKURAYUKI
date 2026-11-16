// Bản XEM THỬ 1 file HTML (chạy backend giả lập ngay trên trình duyệt) → dist-preview/sakura-yuki-preview.html
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('./', import.meta.url).pathname;
const out = path.join(root, '..', 'dist-preview');
await build({
  root, logLevel: 'warn', configFile: path.join(root, 'vite.config.ts'),
  build: { outDir: path.join(out, 'tmp'), emptyOutDir: true, assetsInlineLimit: 100000000, cssCodeSplit: false, modulePreload: false,
    chunkSizeWarningLimit: 5000, rolldownOptions: { output: { codeSplitting: false } } }
});
const dir = path.join(out, 'tmp');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, ''); // khung xem thử chặn tải font ngoài
html = html.replace(/<link rel="icon"[^>]*>/, () => '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' + fs.readFileSync(path.join(dir, 'favicon.svg')).toString('base64') + '">');
html = html.replace(/<link rel="stylesheet"[^>]*href="\/?([^"]+)"[^>]*>/g, (_, f) => '<style>' + fs.readFileSync(path.join(dir, f), 'utf8') + '</style>');
let js = '';
html = html.replace(/<script type="module" crossorigin src="\/?([^"]+)"><\/script>/, (_, f) => { js = fs.readFileSync(path.join(dir, f), 'utf8'); return ''; });
if (!js) throw new Error('no script');
html = html.replace('</body>', () => '<script>window.__SY_DEMO__ = true;</script>\n<script type="module">' + js.replace(/<\/script/gi, '<\\/script') + '</script>\n</body>');
fs.writeFileSync(path.join(out, 'sakura-yuki-preview.html'), html);
fs.rmSync(dir, { recursive: true, force: true });
console.log('preview', (html.length / 1024).toFixed(0) + ' KB');
