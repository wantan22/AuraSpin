import { useRef, useState } from 'react';
import { css, vinylTone, smoky, pastel, accent, rgbToHsl, hslToRgb } from '../lib/color.js';

// Geometry (all in % of the square deck):
//   platter centre (46, 48), radius 40
//   tonearm pivot  (88, 14), effective length ~66
// Rest angle -3deg keeps the stylus outside the record. 18deg puts it on the lead-in groove,
// 40deg on the last groove next to the label — so the arm angle doubles as song position.
const ARM_REST = -3;
const ARM_START = 18;
const ARM_END = 40;
const ARM_MIN = -8;
const ARM_MAX = 44;
const ON_RECORD = 14; // drop the needle past this angle and it lands on the vinyl

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function Turntable({
  track,
  palette,
  spinning,
  dark,
  onToggle,
  progress = 0,
  onArmDrop,
  onArmLift,
  variant = 'tinted', // 'tinted' = translucent colour vinyl, 'classic' = black vinyl + printed label
  className = '',
}) {
  const [c1, c2, c3] = palette;
  const classic = variant === 'classic';
  const h1 = rgbToHsl(c1);
  // Classic vinyl: a deep, glossy pressing in the song's dominant colour, with a darker label.
  const discColor = hslToRgb({ h: h1.h, s: Math.min(Math.max(h1.s, 0.35), 0.75), l: 0.22 });
  const labelBg = hslToRgb({ h: h1.h, s: Math.min(Math.max(h1.s, 0.25), 0.55), l: 0.1 });
  const labelInk = accent(c1, true);
  const tone = vinylTone(c1, dark);
  const glow = dark ? smoky(c1) : pastel(c1);

  const deckRef = useRef(null);
  const drag = useRef(null);
  const [dragAngle, setDragAngle] = useState(null);

  const playAngle = ARM_START + clamp(progress || 0, 0, 1) * (ARM_END - ARM_START);
  const armAngle = dragAngle ?? (spinning ? playAngle : ARM_REST);

  const angleAt = (e) => {
    const r = deckRef.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width * 0.88);
    const dy = e.clientY - (r.top + r.height * 0.14);
    // arm at 0deg points straight down; rotating clockwise swings the stylus left
    return clamp((Math.atan2(-dx, dy) * 180) / Math.PI, ARM_MIN, ARM_MAX);
  };

  const armDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unavailable — moves still arrive while over the handle */
    }
    drag.current = { start: armAngle, moved: false };
    setDragAngle(armAngle);
  };
  const armMove = (e) => {
    if (!drag.current) return;
    const a = angleAt(e);
    if (Math.abs(a - drag.current.start) > 2) drag.current.moved = true;
    setDragAngle(a);
  };
  const armUp = (e) => {
    if (!drag.current) return;
    const { moved } = drag.current;
    const a = moved ? angleAt(e) : armAngle;
    drag.current = null;
    setDragAngle(null);
    if (!moved) {
      onToggle?.(); // a tap on the arm behaves like the play button
      return;
    }
    if (a >= ON_RECORD) onArmDrop?.(clamp((a - ARM_START) / (ARM_END - ARM_START), 0, 1));
    else if (spinning) onArmLift?.();
  };
  const dragging = dragAngle !== null;
  const play = spinning ? 'running' : 'paused';

  return (
    <div
      ref={deckRef}
      className={`relative aspect-square select-none ${className}`}
      style={{ containerType: 'inline-size' }}
    >
      {!classic && (
        <>
          {/* Ambient glow behind the record base */}
          <div
            className="pointer-events-none absolute left-[46%] top-[48%] h-[95%] w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-1000"
            style={{
              background: `radial-gradient(circle, ${css(glow, dark ? 0.55 : 0.9)} 0%, ${css(
                dark ? smoky(c2) : pastel(c2),
                dark ? 0.25 : 0.5
              )} 45%, transparent 70%)`,
            }}
          />
          {/* Platter mat */}
          <div className="absolute left-[4%] top-[6%] h-[84%] w-[84%] rounded-full bg-black/[0.06] shadow-[inset_0_2px_10px_rgba(0,0,0,0.15)] dark:bg-black/30" />
        </>
      )}

      {/* Record (click to toggle playback) */}
      <button
        type="button"
        data-tour="platter"
        onClick={onToggle}
        aria-label={spinning ? 'Pause' : 'Play'}
        className="group absolute left-[6%] top-[8%] h-[80%] w-[80%] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-milk-300/50"
      >
        <div
          className={`absolute inset-0 animate-warp rounded-full will-change-transform transition-[background-color] duration-1000 ${
            classic
              ? 'shadow-[0_40px_70px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset]'
              : 'shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)_inset]'
          }`}
          style={{
            ...(classic
              ? { backgroundColor: css(discColor) }
              : { backgroundColor: css(tone, dark ? 0.86 : 0.8) }),
            animationPlayState: play,
          }}
        >
          {/* Wow (slow speed waver per revolution) → flutter (fast jitter) → steady spin */}
          <div className="absolute inset-0 animate-wow rounded-full will-change-transform" style={{ animationPlayState: play }}>
          <div className="absolute inset-0 animate-flutter rounded-full will-change-transform" style={{ animationPlayState: play }}>
          {/* Spinning body */}
          <div
            className="absolute inset-0 animate-spin-record rounded-full will-change-transform"
            style={{ animationPlayState: play }}
          >
            {/* depth + translucent edge */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 50% 50%, transparent 0 34%, rgba(0,0,0,0.18) 34.5%, transparent 36%, transparent 94%, ${css(
                  c2,
                  0.35
                )} 97%, rgba(255,255,255,0.25) 99.4%, transparent 100%)`,
              }}
            />
            {/* fine grooves */}
            <div
              className={`absolute inset-[3%] rounded-full ${
                classic ? '' : 'opacity-50 dark:opacity-60'
              }`}
              style={{
                background: classic
                  ? 'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0 2px, rgba(255,255,255,0.035) 2.5px, rgba(255,255,255,0) 3px)'
                  : 'repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0 1.6px, rgba(0,0,0,0.16) 1.6px 2.4px)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 0 37%, #000 38% 99%, transparent 100%)',
                maskImage: 'radial-gradient(circle, transparent 0 37%, #000 38% 99%, transparent 100%)',
              }}
            />
            {/* track gaps */}
            {[0.52, 0.66, 0.8].map((r) => (
              <div
                key={r}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
                style={{ width: `${r * 100}%`, height: `${r * 100}%`, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }}
              />
            ))}
            {/* coloured iridescence sweep (rotates with the disc so motion reads) */}
            <div
              className={`absolute inset-0 rounded-full ${classic ? 'opacity-[0.12]' : 'opacity-20'}`}
              style={{
                background: `conic-gradient(from 20deg, transparent 0 8%, ${css(c3, 0.9)} 14%, transparent 22% 55%, ${css(
                  c2,
                  0.9
                )} 62%, transparent 70%)`,
              }}
            />
            {/* centre label: printed (classic) or cover art (tinted) */}
            <div className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-[0_0_0_3px_rgba(0,0,0,0.25),0_4px_14px_rgba(0,0,0,0.35)]">
              {classic ? (
                <div
                  className="relative flex h-full w-full flex-col items-center justify-center text-center transition-colors duration-1000"
                  style={{ backgroundColor: css(labelBg), color: css(labelInk) }}
                >
                  <div className="absolute inset-[5%] rounded-full border opacity-40" style={{ borderColor: 'currentColor' }} />
                  <div className="absolute inset-[9%] rounded-full border opacity-20" style={{ borderColor: 'currentColor' }} />
                  <span className="absolute top-[15%] font-semibold uppercase tracking-[0.25em] opacity-60" style={{ fontSize: '0.75cqw' }}>
                    AuraSpin Records
                  </span>
                  {/* title sits wholly above the spindle hole, artist below it */}
                  <span
                    className="absolute bottom-[57%] line-clamp-2 max-w-[68%] font-display font-semibold leading-tight"
                    style={{ fontSize: '1.9cqw' }}
                  >
                    {track ? track.title : 'AuraSpin'}
                  </span>
                  <span className="absolute top-[60%] max-w-[64%] truncate font-medium" style={{ fontSize: '1.15cqw' }}>
                    {track ? track.artist : 'Side A'}
                  </span>
                  <span className="absolute bottom-[14%] uppercase tracking-[0.2em] opacity-55" style={{ fontSize: '0.7cqw' }}>
                    Side A · 33⅓ RPM
                  </span>
                </div>
              ) : track ? (
                <img
                  src={track.thumb}
                  alt=""
                  draggable="false"
                  className="h-full w-full scale-[1.35] object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-milk-200 dark:bg-gravel-3">
                  <span className="font-display text-[clamp(10px,2.4cqw,18px)] font-semibold tracking-tight text-charcoal/70 dark:text-warm/60">
                    AuraSpin
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            </div>
          </div>
          </div>
          </div>

          {/* Static glossy reflections (do not rotate, like light on a real record) */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.28) 38%, rgba(255,255,255,0.05) 48%, rgba(255,255,255,0) 56%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.12) 82%, rgba(255,255,255,0) 90%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full opacity-60"
            style={{
              background:
                'conic-gradient(from 300deg, transparent 0 6%, rgba(255,255,255,0.18) 10%, transparent 15% 50%, rgba(255,255,255,0.12) 56%, transparent 61%)',
            }}
          />
          {/* spindle */}
          <div className="absolute left-1/2 top-1/2 h-[3.2%] w-[3.2%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-400 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        </div>

        {/* hover hint */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {spinning ? 'Pause' : 'Spin'}
          </span>
        </div>
      </button>

      {/* Tonearm base (static) */}
      {classic && (
        <div className="pointer-events-none absolute left-[88%] top-[14%] h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]" />
      )}
      <div className="pointer-events-none absolute left-[88%] top-[14%] h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-white to-zinc-300 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] dark:from-zinc-500 dark:to-zinc-700 dark:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]">
        <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-inner dark:from-zinc-600 dark:to-zinc-800" />
      </div>

      {/* Tonearm (rotates about the pivot) */}
      <div
        className="pointer-events-none absolute left-[82%] top-[8%] h-[74%] w-[12%]"
        style={{
          transformOrigin: '50% 8.1%',
          transform: `rotate(${armAngle}deg)`,
          transition: dragging ? 'none' : 'transform 0.95s cubic-bezier(.45,.05,.2,1)',

        }}
      >
        {/* stylus riding the warp: a tiny bob while the needle is in the groove */}
        <div
          className="h-full w-full animate-armbob"
          style={{ transformOrigin: '50% 8.1%', animationPlayState: spinning && !dragging ? 'running' : 'paused' }}
        >
        <svg viewBox="0 0 120 740" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="arm-metal" x1="0" x2="1">
              <stop offset="0" stopColor={dark ? '#6b6b73' : '#c9c9cf'} />
              <stop offset="0.45" stopColor={dark ? '#d4d4d8' : '#ffffff'} />
              <stop offset="1" stopColor={dark ? '#52525b' : '#a1a1aa'} />
            </linearGradient>
            <linearGradient id="arm-head" x1="0" x2="1">
              <stop offset="0" stopColor={dark ? '#27272a' : '#2a2a30'} />
              <stop offset="1" stopColor={dark ? '#3f3f46' : '#46464f'} />
            </linearGradient>
          </defs>
          {/* soft shadow drawn as plain shapes (a CSS drop-shadow filter re-rendered every frame) */}
          <g transform="translate(5 10)" opacity={dark ? 0.35 : 0.18} fill="none" stroke="#000" strokeLinecap="round">
            <path d="M60 60 L60 560 Q60 610 44 640" strokeWidth="16" />
            <path d="M44 640 L36 705" strokeWidth="30" />
          </g>
          {/* counterweight */}
          <rect x="38" y="2" width="44" height="36" rx="9" fill="url(#arm-head)" />
          <rect x="44" y="34" width="32" height="14" rx="4" fill="url(#arm-metal)" />
          {/* pivot cap */}
          <circle cx="60" cy="60" r="16" fill="url(#arm-metal)" stroke="rgba(0,0,0,0.15)" />
          {/* arm tube with S-bend near the head */}
          <path
            d="M60 60 L60 560 Q60 610 44 640"
            fill="none"
            stroke="url(#arm-metal)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* finger lift */}
          <path d="M50 650 l-22 -6" stroke="url(#arm-metal)" strokeWidth="5" strokeLinecap="round" />
          {/* headshell */}
          <g transform="rotate(22 40 668)">
            <rect x="24" y="636" width="34" height="64" rx="6" fill="url(#arm-head)" />
            <rect x="30" y="694" width="20" height="16" rx="3" fill={css(c1, 1)} />
            <path d="M40 710 L40 722" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* invisible, finger-sized grab handle along the arm + headshell */}
          <path
            d="M60 70 L60 560 Q60 610 44 640 L36 710"
            fill="none"
            stroke="transparent"
            strokeWidth="56"
            strokeLinecap="round"
            style={{ pointerEvents: 'stroke', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={armDown}
            onPointerMove={armMove}
            onPointerUp={armUp}
            onPointerCancel={armUp}
          >
            <title>Drag the needle onto the record to play — where you drop it sets the position</title>
          </path>
        </svg>
        </div>
      </div>
    </div>
  );
}
