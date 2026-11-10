import { useRef, useState } from 'react';
import { IconDisc, IconPlay, IconQueue, IconX } from './Icons.jsx';

function Grip(props) {
  return (
    <button
      type="button"
      className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg opacity-40 transition hover:opacity-90 focus-visible:opacity-90 active:cursor-grabbing"
      {...props}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
        {[2, 7, 12].map((y) => (
          <g key={y}>
            <circle cx="2.5" cy={y} r="1.4" />
            <circle cx="7.5" cy={y} r="1.4" />
          </g>
        ))}
      </svg>
    </button>
  );
}

function Row({ track, label, current, playing, onPlay, onRemove, grip, style, dragging, compact }) {
  return (
    <div
      style={style}
      className={`group relative flex items-center gap-2.5 rounded-2xl p-2 pr-2 ${
        dragging
          ? 'z-10 bg-white shadow-lg ring-1 ring-black/5 dark:bg-gravel-3 dark:ring-white/10'
          : current
          ? 'bg-white/75 shadow-sm dark:bg-white/[0.07]'
          : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.04]'
      }`}
    >
      {grip}
      <button onClick={onPlay} className={`relative shrink-0 overflow-hidden rounded-xl ${compact ? 'h-10 w-10' : 'h-11 w-11'}`} aria-label={`Play ${track.title}`}>
        <img src={track.thumb} alt="" loading="lazy" draggable="false" className="h-full w-full scale-[1.35] object-cover" />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition ${
            current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {current ? <IconDisc size={16} className={playing ? 'animate-spin-record' : ''} /> : <IconPlay size={15} />}
        </span>
      </button>
      <button onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className={`truncate text-sm ${current ? 'font-semibold' : 'font-medium'}`}>{track.title}</div>
        <div className="truncate text-xs muted">
          {label && <span className="tabular-nums">{label} · </span>}
          {track.artist}
        </div>
      </button>
      {onRemove && (
        <button
          className="icon-btn h-8 w-8 muted opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
          onClick={onRemove}
          aria-label={`Remove ${track.title} from queue`}
        >
          <IconX size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * Now playing + Up next. Upcoming songs can be dragged by their grip (mouse or touch)
 * or nudged with ↑/↓ while the grip is focused. `onMove(from, to)` takes queue indices.
 */
export default function QueuePanel({ queue, index, isPlaying, onPlayIndex, onRemove, onClearUpcoming, onMove, compact = false }) {
  const current = queue[index];
  const upcoming = queue.slice(index + 1);
  const listRef = useRef(null);
  const drag = useRef(null);
  const [dragState, setDragState] = useState(null); // { from, over, dy }

  const startDrag = (k) => (e) => {
    if (!onMove || e.button > 0) return;
    e.preventDefault();
    const rows = [...listRef.current.children];
    const h = rows[k]?.getBoundingClientRect().height || 56;
    drag.current = { from: k, startY: e.clientY, h, count: rows.length };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragState({ from: k, over: k, dy: 0 });
  };
  const moveDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    const over = Math.max(0, Math.min(d.count - 1, d.from + Math.round(dy / d.h)));
    setDragState({ from: d.from, over, dy });
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d && dragState && dragState.over !== d.from) onMove(index + 1 + d.from, index + 1 + dragState.over);
    setDragState(null);
  };
  const keyMove = (k) => (e) => {
    if (!onMove) return;
    if (e.key === 'ArrowUp' && k > 0) {
      e.preventDefault();
      onMove(index + 1 + k, index + k);
    } else if (e.key === 'ArrowDown' && k < upcoming.length - 1) {
      e.preventDefault();
      onMove(index + 1 + k, index + 2 + k);
    }
  };

  // While dragging, the held row follows the pointer and its neighbours slide out of the way.
  const styleFor = (k) => {
    if (!dragState || !drag.current) return { transition: 'transform 200ms ease' };
    const { from, over, dy } = dragState;
    const h = drag.current.h;
    if (k === from) return { transform: `translateY(${dy}px)`, transition: 'none' };
    let shift = 0;
    if (from < over && k > from && k <= over) shift = -h;
    if (from > over && k < from && k >= over) shift = h;
    return { transform: `translateY(${shift}px)`, transition: 'transform 200ms ease' };
  };

  if (!current && !upcoming.length) {
    return (
      <div className="mx-4 mt-2 rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/10">
        <IconQueue size={26} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-semibold">The queue is empty</p>
        <p className="mt-1 text-xs muted">
          Tap the queue icon on any song in a shelf, search result or For You card to line it up. When the last song ends, the
          record is lifted off the platter.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'px-2 pb-3' : 'px-2.5 pb-4'}>
      {current && (
        <>
          <div className="label px-2.5 pb-1">Now playing</div>
          <Row track={current} current playing={isPlaying} onPlay={() => onPlayIndex(index)} compact={compact} />
        </>
      )}
      <div className="flex items-center justify-between px-2.5 pb-1 pt-4">
        <span className="label">Up next{upcoming.length ? ` · ${upcoming.length}` : ''}</span>
        {upcoming.length > 0 && (
          <button onClick={onClearUpcoming} className="rounded-full px-2 py-0.5 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/5">
            Clear
          </button>
        )}
      </div>
      {upcoming.length ? (
        <>
          <div ref={listRef} className="select-none">
            {upcoming.map((t, k) => (
              <Row
                key={t.id || `${t.videoId}-${k}`}
                track={t}
                compact={compact}
                label={String(k + 1).padStart(2, '0')}
                onPlay={() => onPlayIndex(index + 1 + k)}
                onRemove={() => onRemove(index + 1 + k)}
                style={styleFor(k)}
                dragging={dragState?.from === k}
                grip={
                  onMove && upcoming.length > 1 ? (
                    <Grip
                      aria-label={`Reorder ${t.title}. Drag, or use the up and down arrow keys.`}
                      title="Drag to reorder"
                      onPointerDown={startDrag(k)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={keyMove(k)}
                    />
                  ) : null
                }
              />
            ))}
          </div>
          {onMove && upcoming.length > 1 && <p className="px-2.5 pt-2 text-[11px] muted">Drag ⠿ to change the order.</p>}
        </>
      ) : (
        <p className="px-2.5 py-2 text-xs muted">Nothing queued. The record will be cleared when this song ends.</p>
      )}
    </div>
  );
}
