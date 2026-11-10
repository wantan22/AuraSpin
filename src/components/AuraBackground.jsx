import { css, pastel, smoky } from '../lib/color.js';

/**
 * Full-screen radial blur accent. Each blob transitions its own background-color, so the
 * whole aura cross-fades smoothly whenever a new cover is loaded.
 */
export default function AuraBackground({ palette, dark, active, className = 'fixed inset-0 -z-10' }) {
  const tones = palette.map((c) => (dark ? smoky(c) : pastel(c)));
  const alpha = dark ? (active ? 0.55 : 0.35) : active ? 0.95 : 0.7;
  const blobs = [
    { pos: 'left-[-15%] top-[-20%] h-[75vmax] w-[75vmax]', delay: '0s', c: tones[0] },
    { pos: 'right-[-20%] top-[10%] h-[65vmax] w-[65vmax]', delay: '-6s', c: tones[1] },
    { pos: 'bottom-[-30%] left-[20%] h-[70vmax] w-[70vmax]', delay: '-12s', c: tones[2] },
  ];
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-chalk transition-colors duration-700 dark:bg-obsidian" />
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-drift ${b.pos}`}
          style={{
            animationDelay: b.delay,
            backgroundColor: css(b.c, alpha),
            filter: `blur(${dark ? 110 : 90}px)`,
            transition: 'background-color 1.4s ease',
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
      {/* paper grain / smoke veil */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-overlay dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-chalk/60 dark:to-obsidian/70" />
    </div>
  );
}
