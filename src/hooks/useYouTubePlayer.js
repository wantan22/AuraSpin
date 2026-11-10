import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeAPI } from '../lib/youtube.js';

// YT.PlayerState values
export const YTS = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

const ERROR_TEXT = {
  2: 'That video ID is invalid.',
  5: 'This video cannot be played in an HTML5 player.',
  100: 'This video was removed or made private.',
  101: 'The owner does not allow this video to be embedded.',
  150: 'The owner does not allow this video to be embedded.',
};

/**
 * Drives an invisible YouTube IFrame player. The iframe lives in `hostRef` (kept off-screen by
 * the caller). It is created on mount and destroyed on unmount, so logging out tears it down.
 */
export function useYouTubePlayer({ onEnded, onError, initialVolume = 80 } = {}) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pendingRef = useRef(null);
  const wantPlayRef = useRef(false);
  const cbRef = useRef({});
  cbRef.current = { onEnded, onError };

  const [ready, setReady] = useState(false);
  const [ytState, setYtState] = useState(YTS.UNSTARTED);
  const [wantPlay, setWantPlay] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [volume, setVolumeState] = useState(initialVolume);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let player;
    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        const el = document.createElement('div');
        hostRef.current.appendChild(el);
        player = new YT.Player(el, {
          width: 200,
          height: 200,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              player.setVolume(initialVolume);
              setReady(true);
              if (pendingRef.current) {
                const { videoId, autoplay, start } = pendingRef.current;
                pendingRef.current = null;
                autoplay
                  ? player.loadVideoById({ videoId, startSeconds: start || 0 })
                  : player.cueVideoById({ videoId, startSeconds: start || 0 });
              }
            },
            onStateChange: (e) => {
              setYtState(e.data);
              if (e.data === YTS.PLAYING) {
                wantPlayRef.current = true;
                setWantPlay(true);
              } else if (e.data === YTS.PAUSED) {
                wantPlayRef.current = false;
                setWantPlay(false);
              } else if (e.data === YTS.ENDED) {
                cbRef.current.onEnded?.();
              }
            },
            onError: (e) => {
              cbRef.current.onError?.(ERROR_TEXT[e.data] || 'This video could not be played.');
            },
          },
        });
      })
      .catch((err) => setLoadError(err.message));

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress polling while something is loaded.
  useEffect(() => {
    if (!ready) return undefined;
    const tick = () => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setTime({ current: p.getCurrentTime() || 0, duration: p.getDuration() || 0 });
    };
    tick();
    const active = ytState === YTS.PLAYING || ytState === YTS.BUFFERING;
    // 2 updates/sec is smooth enough for a progress bar and halves re-render work.
    const id = setInterval(tick, active ? 500 : 1000);
    return () => clearInterval(id);
  }, [ready, ytState]);

  const load = useCallback((videoId, { autoplay = true, start = 0 } = {}) => {
    wantPlayRef.current = autoplay;
    setWantPlay(autoplay);
    setTime({ current: start, duration: 0 });
    const p = playerRef.current;
    if (!p) {
      pendingRef.current = { videoId, autoplay, start };
      return;
    }
    autoplay ? p.loadVideoById({ videoId, startSeconds: start }) : p.cueVideoById({ videoId, startSeconds: start });
  }, []);

  const play = useCallback(() => {
    wantPlayRef.current = true;
    setWantPlay(true);
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    wantPlayRef.current = false;
    setWantPlay(false);
    playerRef.current?.pauseVideo();
  }, []);

  const stop = useCallback(() => {
    wantPlayRef.current = false;
    setWantPlay(false);
    playerRef.current?.stopVideo?.();
  }, []);

  const seek = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, true);
    setTime((t) => ({ ...t, current: seconds }));
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    playerRef.current?.setVolume(v);
    if (v > 0) playerRef.current?.unMute?.();
  }, []);

  /** Sets the player's volume without changing the user's chosen level (for effects). */
  const setVolumeRaw = useCallback((v) => {
    playerRef.current?.setVolume?.(Math.max(0, Math.min(100, Math.round(v))));
  }, []);

  const getTime = useCallback(() => {
    const p = playerRef.current;
    return { current: p?.getCurrentTime?.() || 0, duration: p?.getDuration?.() || 0 };
  }, []);

  // "Spinning" follows the real player state; buffering counts while the user wants playback.
  const isPlaying = ytState === YTS.PLAYING || (wantPlay && ytState === YTS.BUFFERING);

  return {
    hostRef,
    ready,
    ytState,
    isPlaying,
    wantPlay,
    buffering: wantPlay && ytState === YTS.BUFFERING,
    time,
    volume,
    loadError,
    load,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setVolumeRaw,
    getTime,
  };
}
