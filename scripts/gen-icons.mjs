// Generates the Spanscope logo mark (SVG) and PWA PNG icons from one geometry
// definition. Dependency-free: a tiny supersampling rasterizer + PNG encoder.
// Usage: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/', import.meta.url));

// ---- Brand geometry (512 x 512 design grid) ----
const BG_FROM = '#7b5cff';
const BG_TO = '#4a2bc2';
const WHITE = '#ffffff';
const NODE_COLORS = ['#3fb950', '#f2b134', '#ff6b61']; // healthy / narrow / wide
const LENS = { cx: 232, cy: 232, r: 140, w: 32 };
const HANDLE = { x1: 342, y1: 342, x2: 420, y2: 420, w: 52 };
const TOP = { cx: 232, cy: 170, r: 28 };
const KIDS = [160, 232, 304].map((cx) => ({ cx, cy: 282, r: 22 }));
const LINK_W = 14;

function shapes() {
  const s = [];
  for (const k of KIDS) s.push({ t: 'seg', x1: TOP.cx, y1: TOP.cy, x2: k.cx, y2: k.cy, w: LINK_W, c: WHITE });
  s.push({ t: 'circle', ...TOP, c: WHITE });
  KIDS.forEach((k, i) => s.push({ t: 'circle', ...k, c: NODE_COLORS[i] }));
  s.push({ t: 'ring', ...LENS, c: WHITE });
  s.push({ t: 'seg', ...HANDLE, c: WHITE });
  return s;
}

// ---- SVG output ----
function svgMark({ rounded, transform }) {
  const body = shapes()
    .map((p) => {
      if (p.t === 'seg') return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.c}" stroke-width="${p.w}" stroke-linecap="round"/>`;
      if (p.t === 'ring') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="none" stroke="${p.c}" stroke-width="${p.w}"/>`;
      return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${p.c}"/>`;
    })
    .join('\n    ');
  return `<defs><linearGradient id="ssbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BG_FROM}"/><stop offset="1" stop-color="${BG_TO}"/></linearGradient></defs>
  <rect width="512" height="512"${rounded ? ' rx="112"' : ''} fill="url(#ssbg)"/>
  <g${transform ? ` transform="${transform}"` : ''}>
    ${body}
  </g>`;
}

// Maskable: full-bleed background, artwork scaled into the 80% safe zone.
const MASK_SCALE = 0.7;
const MASK_C = 261; // visual centre of the artwork
const maskT = `translate(${256 - MASK_C * MASK_SCALE} ${256 - MASK_C * MASK_SCALE}) scale(${MASK_SCALE})`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  ${svgMark({ rounded: true })}\n</svg>\n`;
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  ${svgMark({ rounded: false, transform: maskT })}\n</svg>\n`;

// Logo: mark + wordmark. Wordmark colour adapts to light/dark (README on GitHub dark mode).
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1840 512" role="img" aria-label="Spanscope">
  <title>Spanscope</title>
  <style>
    .wm { fill: #2e1f80; font: 700 250px system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media (prefers-color-scheme: dark) { .wm { fill: #e4dcff; } }
  </style>
  ${svgMark({ rounded: true })}
  <text class="wm" x="576" y="344" textLength="1230" lengthAdjust="spacingAndGlyphs">Spanscope</text>
</svg>
`;

writeFileSync(OUT + 'icon.svg', iconSvg);
writeFileSync(OUT + 'icon-maskable.svg', maskSvg);
writeFileSync(OUT + 'logo.svg', logoSvg);

// ---- Rasterizer ----
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;

function inside(p, x, y) {
  if (p.t === 'circle') return (x - p.cx) ** 2 + (y - p.cy) ** 2 <= p.r ** 2;
  if (p.t === 'ring') {
    const d = Math.hypot(x - p.cx, y - p.cy);
    return Math.abs(d - p.r) <= p.w / 2;
  }
  // capsule
  const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
  const t = Math.max(0, Math.min(1, ((x - p.x1) * dx + (y - p.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (p.x1 + t * dx), y - (p.y1 + t * dy)) <= p.w / 2;
}

function inRoundRect(x, y, r) {
  if (!r) return x >= 0 && y >= 0 && x <= 512 && y <= 512;
  const cx = Math.max(r, Math.min(512 - r, x));
  const cy = Math.max(r, Math.min(512 - r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function render(size, { rounded, scale = 1, offset = 0 }) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  const list = shapes().map((p) => ({ ...p, rgb: hex(p.c) }));
  const from = hex(BG_FROM), to = hex(BG_TO);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const X = ((i + (sx + 0.5) / SS) / size) * 512;
          const Y = ((j + (sy + 0.5) / SS) / size) * 512;
          if (!inRoundRect(X, Y, rounded ? 112 : 0)) continue;
          const t = (X + Y) / 1024;
          let col = [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
          const lx = (X - offset) / scale, ly = (Y - offset) / scale;
          for (const p of list) if (inside(p, lx, ly)) col = p.rgb;
          r += col[0]; g += col[1]; b += col[2]; a += 1;
        }
      }
      const o = (j * size + i) * 4;
      const n = SS * SS;
      // premultiplied average -> straight alpha
      px[o] = a ? Math.round(r / a) : 0;
      px[o + 1] = a ? Math.round(g / a) : 0;
      px[o + 2] = a ? Math.round(b / a) : 0;
      px[o + 3] = Math.round((a / n) * 255);
    }
  }
  return encodePng(size, size, px);
}

// ---- PNG encoder ----
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const maskOffset = 256 - MASK_C * MASK_SCALE;
writeFileSync(OUT + 'icon-192.png', render(192, { rounded: true }));
writeFileSync(OUT + 'icon-512.png', render(512, { rounded: true }));
writeFileSync(OUT + 'icon-maskable-512.png', render(512, { rounded: false, scale: MASK_SCALE, offset: maskOffset }));
writeFileSync(OUT + 'apple-touch-icon.png', render(180, { rounded: false }));
console.log('Icons written to', OUT);
