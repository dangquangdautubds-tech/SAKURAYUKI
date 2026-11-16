/**
 * Ảnh minh hoạ vẽ bằng SVG (không phải ảnh chụp) — dùng khi trang phục / vị trí ảnh chưa có ảnh thật,
 * và cho dữ liệu mẫu của chế độ xem thử. Ảnh thật do tiệm tải lên trong trang quản trị sẽ thay thế.
 */
const PALETTES: [string, string, string][] = [
  ['#8B263E', '#F3D9DF', '#B08D57'], ['#2F4A6B', '#DCE6F0', '#C9A86A'], ['#5E7A52', '#E5EDDC', '#B08D57'],
  ['#A3533B', '#F6E2D6', '#4B3B2A'], ['#6B4C7A', '#EADFF0', '#C9A86A'], ['#1F3B3A', '#D9E8E3', '#B47A62'],
  ['#B8475F', '#FBE7EA', '#2D3748'], ['#3D3A36', '#EFE9E2', '#B08D57']
];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

function pattern(id: string, kind: number, fg: string) {
  if (kind === 0) return `<pattern id="${id}" width="40" height="20" patternUnits="userSpaceOnUse"><g fill="none" stroke="${fg}" stroke-opacity=".35"><circle cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="12"/><circle cx="20" cy="20" r="6"/><circle cx="0" cy="10" r="18"/><circle cx="40" cy="10" r="18"/></g></pattern>`;
  if (kind === 1) return `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><g fill="${fg}" fill-opacity=".35"><circle cx="7" cy="7" r="3"/><circle cx="22" cy="22" r="3"/></g></pattern>`;
  if (kind === 2) return `<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M18 2l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="${fg}" fill-opacity=".3"/></pattern>`;
  return `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12h24M12 0v24" stroke="${fg}" stroke-opacity=".28"/></pattern>`;
}

/** Hình kimono cách điệu trên nền hoa văn. key quyết định màu/hoa văn (ổn định). */
export function kimonoArt(key: string, w = 600, h = 750): string {
  const n = hash(key); const [main, bg, accent] = PALETTES[n % PALETTES.length]; const kind = (n >> 4) % 4;
  const cx = w / 2, top = h * 0.16, sw = w * 0.36, bw = w * 0.17, bot = h * 0.9;
  const body = `M${cx - bw} ${top} L${cx - sw} ${top + h * .06} L${cx - sw - w * .05} ${top + h * .33} L${cx - bw - w * .02} ${top + h * .33} L${cx - bw - w * .03} ${bot} L${cx + bw + w * .03} ${bot} L${cx + bw + w * .02} ${top + h * .33} L${cx + sw + w * .05} ${top + h * .33} L${cx + sw} ${top + h * .06} L${cx + bw} ${top} Z`;
  const collar = `M${cx - bw * .55} ${top} L${cx} ${top + h * .24} L${cx + bw * .55} ${top}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs>${pattern('p', kind, main)}${pattern('q', (kind + 2) % 4, '#ffffff')}</defs>
<rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#p)"/>
<circle cx="${w * .82}" cy="${h * .14}" r="${w * .09}" fill="${accent}" fill-opacity=".55"/>
<path d="${body}" fill="${main}"/><path d="${body}" fill="url(#q)"/>
<path d="${collar}" fill="none" stroke="#FAF8F5" stroke-width="${w * .03}" stroke-linejoin="round"/>
<rect x="${cx - bw - w * .025}" y="${top + h * .34}" width="${(bw + w * .025) * 2}" height="${h * .09}" fill="${accent}"/>
<rect x="${cx - bw - w * .025}" y="${top + h * .375}" width="${(bw + w * .025) * 2}" height="${h * .012}" fill="#FAF8F5" fill-opacity=".7"/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Cảnh minh hoạ (mái đền, núi, mặt trời) — cho ảnh lớn đầu trang / cửa hàng / album */
export function sceneArt(key: string, w = 1200, h = 800): string {
  const n = hash(key); const [main, bg, accent] = PALETTES[n % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs>${pattern('p', n % 4, main)}<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#FAF8F5"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h * .55}" fill="url(#p)" opacity=".5"/>
<circle cx="${w * (.25 + (n % 5) * .1)}" cy="${h * .3}" r="${h * .14}" fill="${accent}" fill-opacity=".6"/>
<path d="M0 ${h * .72} Q${w * .25} ${h * .52} ${w * .5} ${h * .68} T${w} ${h * .62} V${h} H0Z" fill="${main}" fill-opacity=".25"/>
<g fill="${main}"><rect x="${w * .58}" y="${h * .42}" width="${w * .022}" height="${h * .36}"/><rect x="${w * .76}" y="${h * .42}" width="${w * .022}" height="${h * .36}"/>
<path d="M${w * .53} ${h * .4} Q${w * .68} ${h * .36} ${w * .84} ${h * .4} L${w * .83} ${h * .43} L${w * .54} ${h * .43}Z"/><rect x="${w * .56}" y="${h * .47}" width="${w * .24}" height="${h * .02}"/></g>
<path d="M0 ${h * .84} Q${w * .5} ${h * .74} ${w} ${h * .86} V${h} H0Z" fill="${main}" fill-opacity=".5"/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
