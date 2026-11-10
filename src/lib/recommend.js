// Listening history + recommendation engine.
//
// History shape (per user, stored under auraspin-history-<uid>):
//   { plays: { [videoId]: { track, count, first, last } } }
//
// Recommendations come from two places:
//   • the user's own history (no API key): heavy rotation, pick back up
//   • YouTube Data API searches seeded by their top artists / favourite song (needs a key)
// YouTube retired the "related videos" endpoint in 2023, so discovery is search-based.
import { searchVideos } from './youtube.js';

const DAY = 86400000;
const HALF_LIFE = 14 * DAY; // a play two weeks ago counts half as much as one today
const MAX_ENTRIES = 400;
export const RECS_TTL = 6 * 3600000;

export const emptyHistory = () => ({ plays: {} });

export function recordPlay(history, track, now = Date.now()) {
  const plays = { ...(history?.plays || {}) };
  const prev = plays[track.videoId];
  plays[track.videoId] = {
    track: { videoId: track.videoId, title: track.title, artist: track.artist, thumb: track.thumb },
    count: (prev?.count || 0) + 1,
    first: prev?.first || now,
    last: now,
    // decayed score, updated incrementally so we never need per-play timestamps
    score: decay(prev, now) + 1,
  };
  const ids = Object.keys(plays);
  if (ids.length > MAX_ENTRIES) {
    ids
      .sort((a, b) => plays[a].last - plays[b].last)
      .slice(0, ids.length - MAX_ENTRIES)
      .forEach((id) => delete plays[id]);
  }
  return { plays };
}

function decay(entry, now = Date.now()) {
  if (!entry) return 0;
  const base = entry.score ?? entry.count;
  return base * Math.pow(0.5, (now - entry.last) / HALF_LIFE);
}

const entries = (history) => Object.values(history?.plays || {});
export const totalPlays = (history) => entries(history).reduce((n, e) => n + e.count, 0);

/** Most-played tracks, weighted toward recent listening. */
export function heavyRotation(history, n = 10) {
  return entries(history)
    .map((e) => ({ e, s: decay(e) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ e }) => e.track);
}

/** Tracks the user clearly liked (2+ plays) but hasn't heard in a week. */
export function pickBackUp(history, n = 10, now = Date.now()) {
  return entries(history)
    .filter((e) => e.count >= 2 && now - e.last > 7 * DAY)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((e) => e.track);
}

/** Artists ranked by decayed play score. */
export function topArtists(history, n = 3) {
  const by = new Map();
  for (const e of entries(history)) {
    const a = (e.track.artist || '').trim();
    if (!a || a === 'YouTube') continue;
    by.set(a, (by.get(a) || 0) + decay(e));
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([a]) => a);
}

/** Changes when the user's taste profile meaningfully shifts — used to invalidate the cache. */
export function seedKey(history) {
  const fav = heavyRotation(history, 1)[0];
  return [...topArtists(history, 3), fav?.videoId || ''].join('|');
}

// Strip "(Official Video)", "[Lyrics]", "ft. X" etc. so titles compare and search cleanly.
const cleanTitle = (t = '') =>
  t
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(official|music|video|lyrics?|audio|mv|hd|4k|remaster(ed)?)\b/gi, '')
    .replace(/\s(ft|feat)\.?\s.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const looksLikeCompilation = (t) => /\b(playlist|mix|compilation|full album|hours?|top \d+|best of)\b/i.test(t);

/**
 * Builds discovery groups from YouTube search. `knownIds` (history + library) are excluded
 * so recommendations are always new to the user.
 */
export async function fetchDiscovery(history, apiKey, knownIds) {
  const artists = topArtists(history, 3);
  const fav = heavyRotation(history, 1)[0];
  const seen = new Set(knownIds);
  const plans = artists.map((a) => ({
    id: `artist:${a}`,
    title: `Because you play ${a}`,
    subtitle: 'More from an artist on repeat',
    q: a,
  }));
  if (fav) {
    const t = cleanTitle(fav.title);
    plans.push({
      id: `like:${fav.videoId}`,
      title: `Similar to ${t || fav.title}`,
      subtitle: 'Picked from your current favourite',
      q: `songs similar to ${t} ${fav.artist}`,
      exclude: t.toLowerCase(),
    });
  }

  const settled = await Promise.allSettled(plans.map((p) => searchVideos(p.q, apiKey, { music: true, max: 15 })));
  const groups = [];
  let firstError = null;
  settled.forEach((res, i) => {
    if (res.status === 'rejected') {
      firstError = firstError || res.reason;
      return;
    }
    const p = plans[i];
    const tracks = res.value.filter((t) => {
      if (seen.has(t.videoId) || looksLikeCompilation(t.title)) return false;
      if (p.exclude && t.title.toLowerCase().includes(p.exclude)) return false;
      seen.add(t.videoId); // no duplicates across groups either
      return true;
    });
    if (tracks.length) groups.push({ id: p.id, title: p.title, subtitle: p.subtitle, tracks: tracks.slice(0, 10) });
  });
  if (!groups.length && firstError) throw firstError;
  return groups;
}
