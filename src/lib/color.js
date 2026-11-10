// Client-side canvas pixel compiler: samples cover art, buckets pixels into a coarse
// colour cube and returns the dominant, visually distinct swatches.

const cache = new Map();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function hslToRgb({ h, s, l }) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
}

export const css = ({ r, g, b }, a = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;

/** Light mode: desaturate + brighten into an airy pastel. */
export const pastel = (c) => {
  const hsl = rgbToHsl(c);
  return hslToRgb({ h: hsl.h, s: clamp(hsl.s, 0.35, 0.7) * 0.85, l: clamp(0.7 + hsl.l * 0.08, 0, 0.82) });
};

/** Dark mode: deepen into a smoky glow. */
export const smoky = (c) => {
  const hsl = rgbToHsl(c);
  return hslToRgb({ h: hsl.h, s: Math.min(hsl.s * 0.9, 0.65), l: clamp(0.24 + hsl.l * 0.2, 0, 0.42) });
};

/** Translucent vinyl body tint. */
export const vinylTone = (c, dark) => {
  const hsl = rgbToHsl(c);
  return hslToRgb({ h: hsl.h, s: Math.min(Math.max(hsl.s, 0.25), 0.6), l: dark ? 0.24 : 0.34 });
};

/** Readable accent for UI (sliders, highlights). */
export const accent = (c, dark) => {
  const hsl = rgbToHsl(c);
  return hslToRgb({ h: hsl.h, s: Math.min(Math.max(hsl.s, 0.3), 0.55), l: dark ? 0.72 : 0.36 });
};

function seedPalette(seed = 'auraspin') {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const base = h % 360;
  return [0, 40, 200].map((o) => hslToRgb({ h: base + o, s: 0.5, l: 0.55 }));
}

export const DEFAULT_PALETTE = [
  { r: 196, g: 167, b: 136 },
  { r: 150, g: 130, b: 175 },
  { r: 125, g: 165, b: 172 },
];

const distance = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

function compile(img) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // YouTube hqdefault thumbnails are 4:3 with letterbox bars — crop them off.
  const sy = img.naturalHeight * 0.125;
  ctx.drawImage(img, 0, sy, img.naturalWidth, img.naturalHeight - sy * 2, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size); // throws if the canvas is tainted

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const { s, l } = rgbToHsl({ r, g, b });
    if (l < 0.08 || l > 0.95) continue; // skip near-black / near-white
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bk = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, s: 0 };
    bk.r += r;
    bk.g += g;
    bk.b += b;
    bk.n += 1;
    bk.s += s;
    buckets.set(key, bk);
  }
  const ranked = [...buckets.values()]
    .map((bk) => ({ r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n, score: bk.n * (0.35 + bk.s / bk.n) }))
    .sort((a, b) => b.score - a.score);

  const picks = [];
  for (const c of ranked) {
    if (picks.every((p) => distance(p, c) > 60)) picks.push({ r: c.r, g: c.g, b: c.b });
    if (picks.length === 3) break;
  }
  if (!picks.length) return null;
  while (picks.length < 3) {
    const hsl = rgbToHsl(picks[0]);
    picks.push(hslToRgb({ h: hsl.h + picks.length * 35, s: Math.max(hsl.s, 0.35), l: hsl.l }));
  }
  return picks;
}

export function extractPalette(src, seed) {
  if (!src) return Promise.resolve(DEFAULT_PALETTE);
  if (cache.has(src)) return Promise.resolve(cache.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      let pal = null;
      try {
        pal = compile(img);
      } catch {
        /* CORS-tainted canvas: fall back to a seeded palette */
      }
      pal = pal || seedPalette(seed || src);
      cache.set(src, pal);
      resolve(pal);
    };
    img.onerror = () => resolve(seedPalette(seed || src));
    img.src = src;
  });
}
