import { useEffect, useState } from 'react';
import { fmtTime } from '../hooks/misc.js';
import { css } from '../lib/color.js';
import {
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
  IconVolume,
  IconMute,
} from './Icons.jsx';

export default function PlayerControls({
  track,
  isPlaying,
  buffering,
  time,
  volume,
  shuffle,
  repeat,
  accentColor,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onVolume,
  onShuffle,
  onRepeat,
  compact = false,
}) {
  const [scrub, setScrub] = useState(null);
  const shown = scrub ?? time.current;
  const pct = time.duration ? (shown / time.duration) * 100 : 0;
  const fill = css(accentColor);

  useEffect(() => setScrub(null), [track?.videoId]);

  return (
    <div className="w-full">
      <div className={`text-center ${compact ? 'mb-3' : 'mb-5'}`}>
        <h2
          className={`font-display font-semibold leading-tight tracking-tight ${
            compact ? 'text-xl' : 'text-2xl lg:text-[1.7rem]'
          } line-clamp-2`}
          title={track?.title}
        >
          {track ? track.title : 'Nothing on the platter'}
        </h2>
        <p className="muted mt-1 truncate text-sm">
          {track ? track.artist : 'Search or paste a YouTube link to drop a record'}
        </p>
      </div>

      {/* progress */}
      <div className="flex items-center gap-3 text-[11px] tabular-nums muted">
        <span className="w-10 text-right">{fmtTime(shown)}</span>
        <input
          type="range"
          className="slider flex-1"
          min={0}
          max={time.duration || 1}
          step={0.1}
          value={Math.min(shown, time.duration || 1)}
          disabled={!track || !time.duration}
          style={{ '--pct': `${pct}%`, '--fill': fill }}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={() => {
            if (scrub != null) onSeek(scrub);
            setScrub(null);
          }}
          onKeyUp={() => {
            if (scrub != null) onSeek(scrub);
            setScrub(null);
          }}
          aria-label="Seek"
        />
        <span className="w-10">{fmtTime(time.duration)}</span>
      </div>

      {/* transport */}
      <div className={`flex items-center justify-center ${compact ? 'mt-3 gap-3' : 'mt-4 gap-5'}`}>
        <button
          className={`icon-btn ${shuffle ? '' : 'opacity-45'}`}
          style={shuffle ? { color: fill } : undefined}
          onClick={onShuffle}
          aria-pressed={shuffle}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <IconShuffle size={18} />
        </button>
        <button className="icon-btn h-11 w-11" onClick={onPrev} aria-label="Previous" disabled={!track}>
          <IconPrev size={22} />
        </button>
        <button
          onClick={onToggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-charcoal text-chalk shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition hover:scale-[1.04] active:scale-95 dark:bg-warm dark:text-obsidian"
        >
          {buffering && (
            <span className="absolute inset-[-4px] animate-spin rounded-full border-2 border-transparent border-t-current opacity-60" />
          )}
          {isPlaying ? <IconPause size={26} /> : <IconPlay size={26} className="translate-x-[1px]" />}
        </button>
        <button className="icon-btn h-11 w-11" onClick={onNext} aria-label="Next" disabled={!track}>
          <IconNext size={22} />
        </button>
        <button
          className={`icon-btn relative ${repeat !== 'off' ? '' : 'opacity-45'}`}
          style={repeat !== 'off' ? { color: fill } : undefined}
          onClick={onRepeat}
          aria-label={`Repeat: ${repeat}`}
          title={`Repeat: ${repeat}`}
        >
          <IconRepeat size={18} />
          {repeat === 'one' && <span className="absolute right-1 top-1 text-[9px] font-bold">1</span>}
        </button>
      </div>

      {/* volume */}
      <div className={`mx-auto flex max-w-[240px] items-center gap-2.5 ${compact ? 'mt-3' : 'mt-5'}`}>
        <button
          className="icon-btn h-7 w-7 muted"
          onClick={() => onVolume(volume > 0 ? 0 : 70)}
          aria-label={volume > 0 ? 'Mute' : 'Unmute'}
        >
          {volume > 0 ? <IconVolume size={16} /> : <IconMute size={16} />}
        </button>
        <input
          type="range"
          className="slider flex-1"
          min={0}
          max={100}
          value={volume}
          style={{ '--pct': `${volume}%`, '--fill': fill }}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
