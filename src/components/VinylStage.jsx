import { useEffect, useRef, useState } from 'react';
import Turntable from './Turntable.jsx';
import { css, accent } from '../lib/color.js';
import { IconChevron, IconNext, IconPause, IconPlay, IconPrev, IconQueue, IconShrink } from './Icons.jsx';
import QueuePanel from './QueuePanel.jsx';

// ---- Fullscreen helpers (must be called from a user gesture) ----
export function enterFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !fullscreenElement()) {
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      p?.catch?.(() => {});
    } catch {
      /* unsupported (e.g. iPhone Safari): the overlay still fills the viewport */
    }
  }
}
export function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit && fullscreenElement()) {
    try {
      exit.call(document)?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  }
}
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

/** Keeps the screen awake while active (Screen Wake Lock API, where supported). */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let lock;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release();
      } catch {
        /* denied or unsupported */
      }
    };
    acquire();
    // locks are dropped when the tab is hidden; re-acquire on return
    const onVis = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch?.(() => {});
    };
  }, [active]);
}

function CoverArt({ track, className, style, children }) {
  const hi = track ? `https://i.ytimg.com/vi/${track.videoId}/maxresdefault.jpg` : null;
  const [src, setSrc] = useState(hi);
  useEffect(() => setSrc(hi), [hi]);
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-md shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] ${className}`}
      style={style}
    >
      {track ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => src !== track.thumb && setSrc(track.thumb)}
          // maxresdefault returns a 120px grey placeholder instead of 404 for some videos
          onLoad={(e) => e.currentTarget.naturalWidth < 200 && src !== track.thumb && setSrc(track.thumb)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-milk-200 font-display text-3xl dark:bg-gravel-3">
          AuraSpin
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
      {children}
    </div>
  );
}

export default function VinylStage({
  open,
  onClose,
  track,
  palette,
  dark,
  isPlaying,
  buffering,
  time,
  onToggle,
  onNext,
  onPrev,
  onArmDrop,
  onArmLift,
  queueProps,
}) {
  const [chrome, setChrome] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const upNext = queueProps ? Math.max(0, queueProps.queue.length - queueProps.index - 1) : 0;
  const idle = useRef();
  const entered = useRef(false);

  useWakeLock(open);

  // Leaving browser fullscreen (Esc / swipe) also closes the stage.
  useEffect(() => {
    if (!open) return undefined;
    entered.current = !!fullscreenElement();
    const onChange = () => {
      if (fullscreenElement()) entered.current = true;
      else if (entered.current) onClose();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    const onKey = (e) => e.key === 'Escape' && !fullscreenElement() && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Controls fade away while the record spins; any touch / mouse move brings them back.
  const wake = () => {
    setChrome(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setChrome(false), 3200);
  };
  useEffect(() => {
    if (!open) return undefined;
    wake();
    return () => clearTimeout(idle.current);
  }, [open, isPlaying]);
  const showChrome = chrome || !isPlaying || queueOpen;

  if (!open) return null;
  const pct = time.duration ? (time.current / time.duration) * 100 : 0;
  const fill = css(accent(palette[0], dark));

  return (
    <div
      className={`fixed inset-0 z-[70] overflow-hidden text-charcoal dark:text-warm ${showChrome ? '' : 'cursor-none'}`}
      onPointerMove={wake}
      onPointerDown={wake}
      role="dialog"
      aria-label="Vinyl view"
    >
      {/* Flat matte desk surface with a faint wash of the cover's colour */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-b from-[#dcdce0] to-[#c9c9ce] transition-colors duration-700 dark:from-[#26262b] dark:to-[#151517]"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-0 transition-[background] duration-1000"
        style={{ background: `radial-gradient(60% 70% at 30% 50%, ${css(palette[0], dark ? 0.16 : 0.22)}, transparent 70%)` }}
        aria-hidden
      />

      {/*
        Sleeve + record, like a record pulled halfway out of its jacket:
        --c is the cover size, --d the deck size; the deck's negative margin slides the disc
        over the right side of the cover (landscape) or its lower half (portrait).
      */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-[4vw] py-[4vh] [--c:min(46vw,80vh)] [--d:min(50vw,86vh)] portrait:flex-col portrait:[--c:min(82vw,44vh)] portrait:[--d:min(92vw,50vh)]">
        <CoverArt track={track} className="z-10 w-[var(--c)] shrink-0 portrait:-ml-[calc(var(--c)*0.08)]">
          {/* playback controls printed onto the sleeve, bottom-left */}
          <div
            className={`glass absolute bottom-[5%] left-[5%] flex portrait:bottom-auto portrait:top-[5%] items-center gap-1 rounded-full px-1.5 py-1 transition-opacity duration-500 ${
              showChrome ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <button className="icon-btn h-8 w-8" onClick={onPrev} aria-label="Previous">
              <IconPrev size={14} />
            </button>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-chalk transition active:scale-95 dark:bg-warm dark:text-obsidian"
              onClick={onToggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {buffering && (
                <span className="absolute inset-[-3px] animate-spin rounded-full border-2 border-transparent border-t-current opacity-60" />
              )}
              {isPlaying ? <IconPause size={15} /> : <IconPlay size={15} className="translate-x-[1px]" />}
            </button>
            <button className="icon-btn h-8 w-8" onClick={onNext} aria-label="Next">
              <IconNext size={14} />
            </button>
            <div className="mx-1.5 h-[3px] w-[min(9vw,90px)] overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: fill }} />
            </div>
          </div>
        </CoverArt>

        <Turntable
          track={track}
          palette={palette}
          spinning={isPlaying}
          dark={dark}
          variant="classic"
          onToggle={onToggle}
          progress={time.duration ? time.current / time.duration : 0}
          onArmDrop={onArmDrop}
          onArmLift={onArmLift}
          className="z-20 w-[var(--d)] shrink-0 landscape:ml-[calc(var(--c)*-0.45_-_var(--d)*0.06)] portrait:ml-[calc(var(--d)*0.12)] portrait:mt-[calc(var(--c)*-0.36_-_var(--d)*0.08)]"
        />
      </div>

      {/* Pull-out queue: a slim tab on the left edge that slides a compact queue panel out */}
      {queueProps && (
        <div
          className="absolute left-0 top-1/2 z-40 flex -translate-y-1/2 items-center transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ transform: `translateY(-50%) translateX(${queueOpen ? '0' : 'calc(-1 * min(340px, 84vw))'})` }}
        >
          <aside
            className="glass flex h-[min(72vh,620px)] w-[min(340px,84vw)] flex-col overflow-hidden rounded-r-[26px] border-l-0"
            aria-label="Queue"
            aria-hidden={!queueOpen}
            inert={queueOpen ? undefined : ''}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-4">
              <div>
                <h3 className="font-display text-lg font-semibold leading-tight">Queue</h3>
                <p className="text-[11px] muted">{upNext ? `${upNext} up next` : 'Nothing up next'}</p>
              </div>
              <button className="icon-btn" onClick={() => setQueueOpen(false)} aria-label="Close queue">
                <IconChevron size={18} className="rotate-180" />
              </button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pt-1">
              <QueuePanel {...queueProps} compact />
            </div>
          </aside>
          <button
            onClick={() => setQueueOpen((o) => !o)}
            className={`glass -ml-px flex h-28 w-8 flex-col items-center justify-center gap-1.5 rounded-r-2xl border-l-0 transition-opacity duration-500 ${
              showChrome ? 'opacity-100' : 'opacity-40'
            }`}
            aria-expanded={queueOpen}
            aria-label={queueOpen ? 'Hide queue' : 'Show queue'}
            title={queueOpen ? 'Hide queue' : 'Show queue'}
          >
            <IconChevron size={16} className={`transition-transform duration-500 ${queueOpen ? 'rotate-180' : ''}`} />
            <IconQueue size={14} className="opacity-70" />
            {upNext > 0 && <span className="text-[10px] font-bold tabular-nums">{upNext}</span>}
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        className={`glass absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-full transition-opacity duration-500 ${
          showChrome ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Exit vinyl view"
        title="Exit (Esc)"
      >
        <IconShrink size={18} />
      </button>
    </div>
  );
}
