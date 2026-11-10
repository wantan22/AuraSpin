import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const GUIDE_STEPS = [
  {
    target: 'shelves',
    title: 'Build your first shelf',
    body: 'Create your first music shelf directory folder here. Shelves keep your records organised — tap the folder-plus icon to start one.',
  },
  {
    target: 'search',
    title: 'Find any record',
    body: 'Search titles or paste any standard YouTube / YouTube Music link to add music. Tap + on a result to file it on the current shelf.',
  },
  {
    target: 'platter',
    title: 'Drop the needle',
    body: 'Click to spin the record disc, swing the mechanical tonearm needle down, and trigger the colour-matching background aura flow.',
    round: true,
  },
];

const PAD = 10;
const GAP = 16;

function findTarget(name) {
  const els = [...document.querySelectorAll(`[data-tour="${name}"]`)];
  return (
    els.find((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.right > 0 &&
        r.left < window.innerWidth &&
        r.bottom > 0 &&
        r.top < window.innerHeight
      );
    }) || null
  );
}

export default function Onboarding({ onFinish, onStepChange }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState({ top: -9999, left: -9999 });
  const tipRef = useRef(null);
  const step = GUIDE_STEPS[i];
  const last = i === GUIDE_STEPS.length - 1;

  useEffect(() => {
    onStepChange?.(i);
    // let drawers/sheets begin opening before scrolling the target into view
    const t = setTimeout(() => findTarget(step.target)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 480);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Track the target continuously so the ring follows drawer animations, resizes and scrolls.
  useEffect(() => {
    let raf;
    let prev = '';
    const loop = () => {
      const el = findTarget(step.target);
      const r = el?.getBoundingClientRect();
      const key = r ? `${r.top|0},${r.left|0},${r.width|0},${r.height|0}` : 'none';
      if (key !== prev) {
        prev = key;
        setRect(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  // Place the tooltip beside the target, flipping to whichever side has room.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip) return;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampX = (x) => Math.max(16, Math.min(vw - tw - 16, x));
    const clampY = (y) => Math.max(16, Math.min(vh - th - 16, y));
    if (!rect) {
      setTipPos({ top: vh / 2 - th / 2, left: vw / 2 - tw / 2 });
      return;
    }
    const r = { top: rect.top - PAD, left: rect.left - PAD, right: rect.left + rect.width + PAD, bottom: rect.top + rect.height + PAD };
    let pos;
    if (vw >= 768 && vw - r.right >= tw + GAP + 16) pos = { left: r.right + GAP, top: clampY(r.top + (r.bottom - r.top) / 2 - th / 2) };
    else if (vw >= 768 && r.left >= tw + GAP + 16) pos = { left: r.left - GAP - tw, top: clampY(r.top + (r.bottom - r.top) / 2 - th / 2) };
    else if (vh - r.bottom >= th + GAP + 16) pos = { top: r.bottom + GAP, left: clampX(r.left + (r.right - r.left) / 2 - tw / 2) };
    else if (r.top >= th + GAP + 16) pos = { top: r.top - GAP - th, left: clampX(r.left + (r.right - r.left) / 2 - tw / 2) };
    else pos = { top: clampY(vh - th - 24), left: clampX(vw / 2 - tw / 2) };
    setTipPos(pos);
  }, [rect, i]);

  const next = () => (last ? onFinish() : setI(i + 1));

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onFinish();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft' && i > 0) setI(i - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="dialog" aria-modal="false" aria-label="App guide">
      {rect ? (
        <div
          className={`absolute transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${step.round ? 'rounded-full' : 'rounded-[22px]'}`}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(12,12,16,0.66)',
          }}
        >
          <div className={`absolute inset-0 animate-pulsering ${step.round ? 'rounded-full' : 'rounded-[22px]'}`} />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[rgba(12,12,16,0.66)]" />
      )}

      <div
        ref={tipRef}
        key={i}
        className="glass pointer-events-auto absolute w-[min(340px,calc(100vw-32px))] animate-rise rounded-3xl p-5 transition-[top,left] duration-500"
        style={tipPos}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="label">
            Step {i + 1} of {GUIDE_STEPS.length}
          </span>
          <div className="flex gap-1.5">
            {GUIDE_STEPS.map((_, d) => (
              <span key={d} className={`h-1.5 rounded-full transition-all ${d === i ? 'w-5 bg-milk-400' : 'w-1.5 bg-current opacity-20'}`} />
            ))}
          </div>
        </div>
        <h3 className="font-display text-lg font-semibold">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button className="text-xs font-semibold muted hover:underline" onClick={onFinish}>
            Skip guide
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button className="btn-ghost px-3 py-2" onClick={() => setI(i - 1)}>
                Back
              </button>
            )}
            <button className="btn-primary px-4 py-2" onClick={next} autoFocus>
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
