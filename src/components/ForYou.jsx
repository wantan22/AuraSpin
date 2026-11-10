import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RECS_TTL,
  fetchDiscovery,
  heavyRotation,
  pickBackUp,
  seedKey,
  topArtists,
  totalPlays,
} from '../lib/recommend.js';
import { IconCheck, IconDisc, IconKey, IconPlay, IconPlus, IconQueue, IconRepeat } from './Icons.jsx';

const inflight = new Map();

function Card({ track, current, playing, added, onPlay, onAdd, onQueue }) {
  return (
    <div className="group w-[132px] shrink-0 snap-start">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/5 shadow-sm dark:bg-white/5">
        <button onClick={onPlay} className="absolute inset-0" aria-label={`Play ${track.title}`}>
          <img src={track.thumb} alt="" loading="lazy" className="h-full w-full scale-[1.35] object-cover transition duration-500 group-hover:scale-[1.45]" />
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/35 text-white transition ${
              current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow">
              {current && playing ? <IconDisc size={18} className="animate-spin-record" /> : <IconPlay size={16} className="translate-x-[1px]" />}
            </span>
          </span>
        </button>
        {onQueue && (
          <button
            onClick={onQueue}
            className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-charcoal opacity-100 shadow transition hover:scale-110 lg:opacity-0 lg:group-hover:opacity-100"
            aria-label={`Add ${track.title} to queue`}
            title="Add to queue"
          >
            <IconQueue size={13} />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            disabled={added}
            className={`absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow transition ${
              added
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 text-charcoal opacity-100 hover:scale-110 lg:opacity-0 lg:group-hover:opacity-100'
            }`}
            aria-label={added ? 'On this shelf' : `Add ${track.title} to shelf`}
            title={added ? 'On this shelf' : 'Add to shelf'}
          >
            {added ? <IconCheck size={13} /> : <IconPlus size={14} />}
          </button>
        )}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug" title={track.title}>
        {track.title}
      </div>
      <div className="truncate text-[11px] muted">{track.artist}</div>
    </div>
  );
}

function Row({ title, subtitle, tracks, ...rest }) {
  if (!tracks.length) return null;
  return (
    <section className="mb-5 animate-rise">
      <div className="mb-2 px-5">
        <h4 className="font-display text-[15px] font-semibold leading-tight">{title}</h4>
        {subtitle && <p className="text-[11px] muted">{subtitle}</p>}
      </div>
      <div className="scroll-thin flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {tracks.map((t, i) => (
          <Card
            key={t.videoId}
            track={t}
            current={t.videoId === rest.currentVideoId}
            playing={rest.isPlaying}
            added={rest.shelfIds.has(t.videoId)}
            onPlay={() => rest.onPlayList(tracks, i)}
            onAdd={() => rest.onAdd([t])}
            onQueue={rest.onQueue ? () => rest.onQueue([t]) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default function ForYou({ history, store, apiKey, knownIds, shelfIds, onOpenApi, onPlayList, onAdd, onQueue, currentVideoId, isPlaying }) {
  const plays = totalPlays(history);
  const rotation = useMemo(() => heavyRotation(history, 10), [history]);
  const backUp = useMemo(() => pickBackUp(history, 10), [history]);
  const artists = useMemo(() => topArtists(history, 3), [history]);
  const key = useMemo(() => seedKey(history), [history]);

  const [recs, setRecs] = useState(() => store.get('recs', null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(
    async (force = false) => {
      if (!apiKey || !plays) return;
      const cached = store.get('recs', null);
      if (!force && cached && cached.seed === key && Date.now() - cached.at < RECS_TTL) {
        setRecs(cached);
        return;
      }
      setLoading(true);
      setError('');
      try {
        // share one in-flight request per user+taste so remounts never double-spend quota
        const flightKey = `${store.uid}|${key}|${force}`;
        if (!inflight.has(flightKey)) {
          inflight.set(flightKey, fetchDiscovery(history, apiKey, knownIds).finally(() => inflight.delete(flightKey)));
        }
        const groups = await inflight.get(flightKey);
        const next = { at: Date.now(), seed: key, groups };
        store.set('recs', next);
        setRecs(next);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    // knownIds/history read at call time; the taste fingerprint (key) drives refetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiKey, key, plays > 0, store]
  );

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const rowProps = { currentVideoId, isPlaying, shelfIds, onPlayList, onAdd, onQueue };

  if (!plays) {
    return (
      <div className="mx-4 mt-2 rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/10">
        <IconDisc size={28} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-semibold">Your recommendations start here</p>
        <p className="mt-1 text-xs muted">
          Play a few records. Each song you listen to for 30 seconds (or half its length) teaches AuraSpin your taste.
        </p>
      </div>
    );
  }

  const discovery = recs?.groups || [];

  return (
    <div className="pb-4">
      <div className="mb-3 flex items-center justify-between px-5">
        <p className="text-[11px] muted">
          Based on {plays} {plays === 1 ? 'play' : 'plays'}
          {artists.length > 0 && <> · mostly {artists.slice(0, 2).join(', ')}</>}
        </p>
        {apiKey && (
          <button
            onClick={() => refresh(true)}
            disabled={loading}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
            title="Fetch fresh picks (uses ~400 API quota units)"
          >
            <IconRepeat size={12} className={loading ? 'animate-spin' : ''} /> {loading ? 'Finding…' : 'Refresh'}
          </button>
        )}
      </div>

      {apiKey ? (
        <>
          {loading && !discovery.length && (
            <div className="mb-5 flex gap-3 overflow-hidden px-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-[132px] shrink-0">
                  <div className="aspect-square animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
                </div>
              ))}
            </div>
          )}
          {error && <p className="mx-5 mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
          {discovery.map((g) => (
            <Row key={g.id} title={g.title} subtitle={g.subtitle} tracks={g.tracks} {...rowProps} />
          ))}
        </>
      ) : (
        <div className="mx-4 mb-5 flex items-start gap-3 rounded-2xl bg-milk-100/80 p-3 text-xs dark:bg-white/[0.04]">
          <IconKey size={16} className="mt-0.5 shrink-0 text-milk-500" />
          <div className="flex-1">
            Discover new songs by artists you love. Add your YouTube API key to unlock discovery rows.
            <button onClick={onOpenApi} className="mt-1.5 block font-semibold underline underline-offset-2">
              Add API key
            </button>
          </div>
        </div>
      )}

      <Row title="Your heavy rotation" subtitle="Most played lately" tracks={rotation} {...rowProps} />
      <Row title="Pick back up" subtitle="Favourites you haven’t heard in a while" tracks={backUp} {...rowProps} />
    </div>
  );
}
