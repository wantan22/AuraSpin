// YouTube IFrame API loader + Data API v3 helpers.

let apiPromise;
export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('Could not load the YouTube player.'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Accepts youtube.com, m.youtube.com, music.youtube.com, youtu.be, shorts, embed and live links. */
export function parseYouTubeUrl(input) {
  const text = input.trim();
  if (!/youtu\.?be|youtube\.com/i.test(text)) return null;
  let url;
  try {
    url = new URL(text.startsWith('http') ? text : 'https://' + text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  let videoId = null;
  if (host === 'youtu.be') videoId = url.pathname.slice(1, 12);
  else if (/youtube\.com$/.test(host)) {
    videoId = url.searchParams.get('v');
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (!videoId && m) videoId = m[1];
  }
  const playlistId = url.searchParams.get('list');
  if (videoId && !ID_RE.test(videoId)) videoId = null;
  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}

export const thumbFor = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

let decoder;
export function decodeEntities(str = '') {
  decoder = decoder || document.createElement('textarea');
  decoder.innerHTML = str;
  return decoder.value;
}

const cleanArtist = (s = '') => s.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();

export function makeTrack({ videoId, title, artist, thumb }) {
  return {
    videoId,
    title: decodeEntities(title || 'Untitled'),
    artist: cleanArtist(decodeEntities(artist || 'YouTube')) || 'YouTube',
    thumb: thumb || thumbFor(videoId),
  };
}

async function apiGet(path, params, key) {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.details?.[0]?.reason;
    if (reason === 'quotaExceeded') throw new Error('Daily YouTube API quota exceeded for this key.');
    if (/key/i.test(reason || '') || res.status === 400)
      throw new Error('That API key was rejected. Check it under API Credentials.');
    if (res.status === 403) throw new Error('This key is not allowed to call YouTube Data API v3. Enable the API in Google Cloud.');
    throw new Error(data?.error?.message || `YouTube API error (${res.status}).`);
  }
  return data;
}

export async function searchVideos(query, key, { music = false, max = 15 } = {}) {
  const params = { part: 'snippet', type: 'video', maxResults: String(max), q: query, videoEmbeddable: 'true' };
  if (music) params.videoCategoryId = '10'; // YouTube "Music" category
  const data = await apiGet('search', params, key);
  return (data.items || [])
    .filter((it) => it.id?.videoId)
    .map((it) =>
      makeTrack({
        videoId: it.id.videoId,
        title: it.snippet.title,
        artist: it.snippet.channelTitle,
        thumb: it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.medium?.url,
      })
    );
}

export async function fetchPlaylist(playlistId, key) {
  const data = await apiGet('playlistItems', { part: 'snippet', maxResults: '50', playlistId }, key);
  return (data.items || [])
    .filter(
      (it) =>
        it.snippet?.resourceId?.videoId &&
        it.snippet.title !== 'Private video' &&
        it.snippet.title !== 'Deleted video'
    )
    .map((it) =>
      makeTrack({
        videoId: it.snippet.resourceId.videoId,
        title: it.snippet.title,
        artist: it.snippet.videoOwnerChannelTitle,
        thumb: it.snippet.thumbnails?.high?.url,
      })
    );
}

/** Metadata for a single video. Uses the Data API when a key exists, otherwise public oEmbed. */
export async function fetchVideoMeta(videoId, key) {
  if (key) {
    try {
      const data = await apiGet('videos', { part: 'snippet', id: videoId }, key);
      const sn = data.items?.[0]?.snippet;
      if (sn) return makeTrack({ videoId, title: sn.title, artist: sn.channelTitle, thumb: sn.thumbnails?.high?.url });
    } catch {
      /* fall through to oEmbed */
    }
  }
  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  for (const endpoint of [
    `https://www.youtube.com/oembed?format=json&url=${watch}`,
    `https://noembed.com/embed?url=${watch}`,
  ]) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const d = await res.json();
      if (d.title) return makeTrack({ videoId, title: d.title, artist: d.author_name });
    } catch {
      /* try next */
    }
  }
  return makeTrack({ videoId, title: 'YouTube track', artist: 'YouTube' });
}
