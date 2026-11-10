import { useState } from 'react';
import { fetchPlaylist, fetchVideoMeta, parseYouTubeUrl, searchVideos } from '../lib/youtube.js';
import { IconCheck, IconKey, IconLink, IconPlay, IconPlus, IconSearch, IconTrash, IconX } from './Icons.jsx';

function Bars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-label="Now playing">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="w-[3px] rounded-full bg-current"
          style={{ animation: `eq 0.9s ${d}s ease-in-out infinite alternate`, height: '100%' }}
        />
      ))}
      <style>{'@keyframes eq{0%{transform:scaleY(.25)}100%{transform:scaleY(1)}}'}</style>
    </span>
  );
}

function TrackRow({ track, index, current, playing, onPlay, action }) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl p-2 pr-2.5 transition ${
        current ? 'bg-white/75 shadow-sm dark:bg-white/[0.07]' : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.04]'
      }`}
    >
      <button onClick={onPlay} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl" aria-label={`Play ${track.title}`}>
        <img src={track.thumb} alt="" loading="lazy" className="h-full w-full scale-[1.35] object-cover" />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition ${
            current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {current && playing ? <Bars /> : <IconPlay size={16} />}
        </span>
      </button>
      <button onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className={`truncate text-sm ${current ? 'font-semibold' : 'font-medium'}`}>{track.title}</div>
        <div className="truncate text-xs muted">
          {index != null && <span className="tabular-nums">{String(index + 1).padStart(2, '0')} · </span>}
          {track.artist}
        </div>
      </button>
      {action}
    </div>
  );
}

function SearchHub({ apiKey, onOpenApi, onAdd, onPlayList, folderName, existingIds }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(() => new Set());
  const isLink = !!parseYouTubeUrl(q);

  const run = async (e) => {
    e?.preventDefault();
    const text = q.trim();
    if (!text) return;
    setError('');
    setBusy(true);
    setAdded(new Set());
    try {
      const link = parseYouTubeUrl(text);
      if (link) {
        let list = [];
        if (link.playlistId && apiKey) {
          list = await fetchPlaylist(link.playlistId, apiKey).catch(() => []);
        }
        if (!list.length && link.videoId) list = [await fetchVideoMeta(link.videoId, apiKey)];
        if (!list.length) throw new Error('Playlist links need an API key. Add one under API Credentials, or paste a single video link.');
        setResults(list);
      } else {
        if (!apiKey) {
          setResults(null);
          throw new Error('nokey');
        }
        setResults(await searchVideos(text, apiKey));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = (track) => {
    onAdd([track]);
    setAdded((s) => new Set(s).add(track.videoId));
  };

  return (
    <div data-tour="search" className="rounded-2xl p-1">
      <form onSubmit={run} className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 muted">
          {isLink ? <IconLink size={17} /> : <IconSearch size={17} />}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles or paste a YouTube link"
          className="field rounded-2xl py-3 pl-10 pr-20"
          enterKeyHint="search"
          aria-label="Search YouTube or paste a link"
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {q && (
            <button
              type="button"
              className="icon-btn h-7 w-7 muted"
              onClick={() => {
                setQ('');
                setResults(null);
                setError('');
              }}
              aria-label="Clear"
            >
              <IconX size={14} />
            </button>
          )}
          <button type="submit" className="btn-primary h-8 rounded-xl px-3 py-0 text-xs" disabled={!q.trim() || busy}>
            {busy ? '…' : isLink ? 'Fetch' : 'Go'}
          </button>
        </div>
      </form>

      {error === 'nokey' ? (
        <div className="mt-2 flex items-start gap-3 rounded-2xl bg-milk-100/80 p-3 text-xs dark:bg-white/[0.04]">
          <IconKey size={16} className="mt-0.5 shrink-0 text-milk-500" />
          <div className="flex-1">
            Title search uses the YouTube Data API. Save your own Google Cloud key to enable it — pasting links works without one.
            <button onClick={onOpenApi} className="mt-1.5 block font-semibold underline underline-offset-2">
              Add API key
            </button>
          </div>
        </div>
      ) : (
        error && <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      )}

      {results && (
        <div className="mt-2 animate-rise rounded-2xl bg-white/40 p-1.5 dark:bg-white/[0.025]">
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <span className="label">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </span>
            <div className="flex items-center gap-1">
              {results.length > 1 && (
                <button
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => {
                    const fresh = results.filter((t) => !existingIds.has(t.videoId));
                    onAdd(fresh);
                    setAdded(new Set(results.map((t) => t.videoId)));
                  }}
                >
                  Add all to {folderName}
                </button>
              )}
              <button className="icon-btn h-7 w-7" onClick={() => setResults(null)} aria-label="Close results">
                <IconX size={14} />
              </button>
            </div>
          </div>
          <div className="scroll-thin max-h-[40vh] overflow-y-auto">
            {results.map((t, i) => {
              const done = added.has(t.videoId) || existingIds.has(t.videoId);
              return (
                <TrackRow
                  key={t.videoId + i}
                  track={t}
                  onPlay={() => onPlayList(results, i)}
                  action={
                    <button
                      onClick={() => add(t)}
                      disabled={done}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        done
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-charcoal text-chalk hover:scale-105 dark:bg-warm dark:text-obsidian'
                      }`}
                      aria-label={done ? 'Added' : `Add ${t.title} to ${folderName}`}
                      title={done ? 'In shelf' : `Add to ${folderName}`}
                    >
                      {done ? <IconCheck size={15} /> : <IconPlus size={16} />}
                    </button>
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPane({
  folder,
  apiKey,
  onOpenApi,
  onAddTracks,
  onPlayFolder,
  onPlayList,
  onRemove,
  currentVideoId,
  isPlaying,
  embedded = false,
  forYou = null,
}) {
  const existingIds = new Set(folder.tracks.map((t) => t.videoId));
  const [tab, setTab] = useState('shelf');
  return (
    <div className={`flex flex-col ${embedded ? '' : 'h-full min-h-0'}`}>
      <div className="px-4 pb-2 pt-4">
        <SearchHub
          key={folder.id}
          apiKey={apiKey}
          onOpenApi={onOpenApi}
          onAdd={onAddTracks}
          onPlayList={onPlayList}
          folderName={folder.name}
          existingIds={existingIds}
        />
      </div>

      {forYou && (
        <div className="mx-4 mt-1 grid grid-cols-2 rounded-xl bg-black/[0.04] p-1 text-xs font-semibold dark:bg-white/[0.05]" role="tablist">
          {[
            ['shelf', 'Shelf'],
            ['foryou', 'For You'],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg py-1.5 transition ${tab === id ? 'bg-white shadow-sm dark:bg-white/10' : 'opacity-55 hover:opacity-80'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'foryou' && forYou ? (
        <div className={`pt-4 ${embedded ? '' : 'scroll-thin min-h-0 flex-1 overflow-y-auto'}`}>{forYou}</div>
      ) : (
        <>
      <div className="flex items-end justify-between px-5 pb-2 pt-3">
        <div className="min-w-0">
          <div className="label">Shelf</div>
          <h3 className="truncate font-display text-xl font-semibold tracking-tight">{folder.name}</h3>
        </div>
        {folder.tracks.length > 0 && (
          <button className="btn-ghost shrink-0 rounded-full px-3 py-1.5 text-xs" onClick={() => onPlayFolder(0)}>
            <IconPlay size={13} /> Play all
          </button>
        )}
      </div>

      <div className={`px-2.5 pb-4 ${embedded ? '' : 'scroll-thin min-h-0 flex-1 overflow-y-auto'}`}>
        {folder.tracks.length === 0 ? (
          <div className="mx-2 mt-2 rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm muted dark:border-white/10">
            This shelf is empty.
            <br />
            Search above or paste a YouTube / YouTube Music link, then tap <b>+</b>.
          </div>
        ) : (
          folder.tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              current={t.videoId === currentVideoId}
              playing={isPlaying}
              onPlay={() => onPlayFolder(i)}
              action={
                <button
                  className="icon-btn h-8 w-8 opacity-100 muted transition lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                  onClick={() => onRemove(t.id)}
                  aria-label={`Remove ${t.title}`}
                >
                  <IconTrash size={15} />
                </button>
              }
            />
          ))
        )}
      </div>
        </>
      )}
    </div>
  );
}
