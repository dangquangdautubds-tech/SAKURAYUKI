/**
 * Markdown tối giản và an toàn cho blog (dùng chung cho website và Cloudflare Worker).
 * Hỗ trợ: ## / ### tiêu đề, **đậm**, *nghiêng*, [link](url), ![ảnh](url), danh sách - và 1.,
 * > trích dẫn, --- đường kẻ. Mọi HTML trong bài đều bị vô hiệu (escape) → không chèn được mã độc.
 */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
const okUrl = u => /^(https?:\/\/|\/(?!\/)|#|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(u);

function inline(s) {
  // s đã được escape; URL bên trong cũng đã escape nên an toàn khi đặt vào thuộc tính
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, u) => okUrl(u) ? `<img src="${u}" alt="${alt}" loading="lazy">` : alt)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => okUrl(u) ? `<a href="${u}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>` : t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

export function renderMarkdown(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = []; let para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + para.map(l => inline(esc(l))).join('<br>') + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>` + list.items.map(i => '<li>' + inline(esc(i)) + '</li>').join('') + `</${list.type}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push('<blockquote>' + quote.map(l => inline(esc(l))).join('<br>') + '</blockquote>'); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushAll(); const lv = Math.max(2, m[1].length); out.push(`<h${lv}>${inline(esc(m[2]))}</h${lv}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushAll(); out.push('<hr>'); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushList(); flushQuote(); para.push(line);
  }
  flushAll();
  return out.join('\n');
}

/** Văn bản thuần (cho mô tả SEO, tóm tắt) */
export function plainText(md, max = 160) {
  const s = String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}
