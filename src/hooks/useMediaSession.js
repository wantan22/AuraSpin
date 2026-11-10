import { useEffect, useRef } from 'react';

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

/**
 * Pushes the current track to the OS media hub (desktop notification flyouts, iOS / Android
 * lock screens) and wires the hardware / lock-screen transport keys back into the app.
 */
export function useMediaSession({ track, artwork, isPlaying, time, onPlay, onPause, onNext, onPrev, onSeek }) {
  const handlers = useRef({});
  handlers.current = { onPlay, onPause, onNext, onPrev, onSeek, time };

  // Metadata
  useEffect(() => {
    if (!supported()) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const id = track.videoId;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'AuraSpin',
      // The rendered vinyl (square, tonearm reflects play state) is preferred; YouTube
      // thumbnails remain as fallbacks while it renders or if a platform rejects data URLs.
      artwork: artwork
        ? [{ src: artwork, sizes: '512x512', type: 'image/png' }]
        : [
            { src: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
            { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
          ],
    });
  }, [track, artwork]);

  // Document title mirrors the now-playing state (shows in tabs and some OS widgets).
  useEffect(() => {
    document.title = track ? `${isPlaying ? '▶ ' : ''}${track.title} · AuraSpin` : 'AuraSpin';
  }, [track, isPlaying]);

  useEffect(() => {
    if (!supported()) return;
    navigator.mediaSession.playbackState = track ? (isPlaying ? 'playing' : 'paused') : 'none';
  }, [track, isPlaying]);

  // Position state (enables lock-screen scrubber). Throttled to whole seconds.
  const sec = Math.floor(time.current);
  useEffect(() => {
    if (!supported() || !navigator.mediaSession.setPositionState) return;
    if (!track || !time.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: time.duration,
        position: Math.min(time.current, time.duration),
        playbackRate: 1,
      });
    } catch {
      /* ignore invalid state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, sec, time.duration]);

  // Action handlers, registered once and routed through refs.
  useEffect(() => {
    if (!supported()) return undefined;
    const ms = navigator.mediaSession;
    const set = (action, fn) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* action not supported on this platform */
      }
    };
    set('play', () => handlers.current.onPlay?.());
    set('pause', () => handlers.current.onPause?.());
    set('stop', () => handlers.current.onPause?.());
    set('nexttrack', () => handlers.current.onNext?.());
    set('previoustrack', () => handlers.current.onPrev?.());
    set('seekto', (d) => d.seekTime != null && handlers.current.onSeek?.(d.seekTime));
    set('seekforward', (d) => handlers.current.onSeek?.(handlers.current.time.current + (d.seekOffset || 10)));
    set('seekbackward', (d) =>
      handlers.current.onSeek?.(Math.max(0, handlers.current.time.current - (d.seekOffset || 10)))
    );
    return () => {
      ['play', 'pause', 'stop', 'nexttrack', 'previoustrack', 'seekto', 'seekforward', 'seekbackward'].forEach((a) =>
        set(a, null)
      );
      ms.metadata = null;
      ms.playbackState = 'none';
    };
  }, []);
}
