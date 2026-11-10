import { css, pastel, smoky } from '../lib/color.js';

/**
 * Full-screen colour wash. Performance notes (this sits behind every frosted panel):
 *  • Each blob is a soft radial-gradient — no `filter: blur()`, which on 700px layers was
 *    the single most expensive thing on the page.
 *  • The aura does not move. Anything animating under the frosted glass forces the glass to
 *    re-blur every frame; a still background is blurred once and then just composited.
 *  • Colour changes (new song) cross-fade via the `color` transition, then everything is idle.
 */
export default function AuraBackground({ palette, dark, active, className = 'fixed inset-0 -z-10' }) {
  const tones = palette.map((c) => (dark ? smoky(c) : pastel(c)));
  const alpha = dark ? (active ? 0.6 : 0.42) : active ? 0.95 : 0.75;
  const blobs = [
    { pos: 'left-[-25%] top-[-35%] h-[95vmax] w-[95vmax]', c: tones[0] },
    { pos: 'right-[-30%] top-[0%] h-[85vmax] w-[85vmax]', c: tones[1] },
    { pos: 'bottom-[-45%] left-[10%] h-[90vmax] w-[90vmax]', c: tones[2] },
  ];
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-chalk transition-colors duration-700 dark:bg-obsidian" />
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${b.pos}`}
          style={{
            color: css(b.c, alpha),
            background: 'radial-gradient(closest-side, currentColor 0%, transparent 100%)',
            transition: 'color 1.4s ease',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-chalk/60 dark:to-obsidian/70" />
    </div>
  );
}
