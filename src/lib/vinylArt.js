// Renders a square "vinyl on a turntable" image for the OS media card / lock screen.
// Lock screens only show still artwork, so we render two states: tonearm down while
// playing, tonearm lifted while paused.
import { css, pastel, vinylTone } from './color.js';

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderVinylArtwork({ thumb, palette, playing, size = 512 }) {
  const key = `${thumb}|${playing}|${palette.map((c) => css(c)).join()}`;
  if (cache.has(key)) return cache.get(key);

  const img = thumb ? await loadImage(thumb).catch(() => null) : null;
  const S = size;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  const [c1, c2, c3] = palette;

  // soft pastel backdrop
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, css(pastel(c1)));
  bg.addColorStop(0.6, css(pastel(c2)));
  bg.addColorStop(1, css(pastel(c3)));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  const cx = S * 0.46;
  const cy = S * 0.53;
  const R = S * 0.4;

  // disc body (translucent tint) with drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = S * 0.06;
  ctx.shadowOffsetY = S * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = css(vinylTone(c1, false), 0.9);
  ctx.fill();
  ctx.restore();

  // grooves
  ctx.lineWidth = 1;
  for (let r = R * 0.4; r < R * 0.97; r += S * 0.0055) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.stroke();
  }
  [0.55, 0.7, 0.84].forEach((f) => {
    ctx.beginPath();
    ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  // rim highlight
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // label with cover art (letterbox cropped)
  const LR = R * 0.36;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, LR, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    const sy = img.naturalHeight * 0.125;
    const sh = img.naturalHeight - sy * 2;
    const sw = sh; // square crop from the centre
    const sx = (img.naturalWidth - sw) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, cx - LR, cy - LR, LR * 2, LR * 2);
  } else {
    ctx.fillStyle = css(pastel(c2));
    ctx.fillRect(cx - LR, cy - LR, LR * 2, LR * 2);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, LR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // diagonal gloss
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const gl = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gl.addColorStop(0.22, 'rgba(255,255,255,0)');
  gl.addColorStop(0.38, 'rgba(255,255,255,0.3)');
  gl.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  gl.addColorStop(0.58, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // spindle
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.012, 0, Math.PI * 2);
  ctx.fillStyle = '#e4e4e7';
  ctx.fill();

  // tonearm
  const px = S * 0.87;
  const py = S * 0.13;
  ctx.beginPath();
  ctx.arc(px, py, S * 0.055, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f4f5';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(((playing ? 20 : -3) * Math.PI) / 180);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineCap = 'round';
  ctx.lineWidth = S * 0.016;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, S * 0.5);
  ctx.quadraticCurveTo(0, S * 0.56, -S * 0.025, S * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-S * 0.05, S * 0.59, S * 0.05, S * 0.075);
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-S * 0.025, -S * 0.07, S * 0.05, S * 0.045); // counterweight
  ctx.restore();
  ctx.beginPath();
  ctx.arc(px, py, S * 0.022, 0, Math.PI * 2);
  ctx.fillStyle = '#a1a1aa';
  ctx.fill();

  let url;
  try {
    url = cv.toDataURL('image/png');
  } catch {
    url = null; // tainted canvas: fall back to plain thumbnails
  }
  cache.set(key, url);
  return url;
}
