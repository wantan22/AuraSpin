import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createUserStore, newId } from '../lib/storage.js';
import { accent } from '../lib/color.js';
import { useBreakpoint, usePalette } from '../hooks/misc.js';
import { useYouTubePlayer, YTS } from '../hooks/useYouTubePlayer.js';
import { useMediaSession } from '../hooks/useMediaSession.js';
import AuraBackground from './AuraBackground.jsx';
import Turntable from './Turntable.jsx';
import PlayerControls from './PlayerControls.jsx';
import NavShelf, { Brand, ThemeToggle } from './NavShelf.jsx';
import LibraryPane from './LibraryPane.jsx';
import Onboarding from './Onboarding.jsx';
import { ApiKeyModal, BottomSheet, Drawer, Toast } from './Overlays.jsx';
import { IconChevronUp, IconExpand, IconMenu } from './Icons.jsx';
import VinylStage, { enterFullscreen, exitFullscreen } from './VinylStage.jsx';
import { renderVinylArtwork } from '../lib/vinylArt.js';
import { emptyHistory, recordPlay } from '../lib/recommend.js';
import ForYou from './ForYou.jsx';

const defaultLibrary = () => {
  const id = newId();
  return { folders: [{ id, name: 'My First Shelf', tracks: [], createdAt: Date.now() }], activeId: id };
};

function sanitizeLibrary(lib) {
  if (!lib || !Array.isArray(lib.folders) || !lib.folders.length) return defaultLibrary();
  const activeId = lib.folders.some((f) => f.id === lib.activeId) ? lib.activeId : lib.folders[0].id;
  return { folders: lib.folders, activeId };
}

/**
 * Everything user-specific lives below this component, which is keyed by uid in <App>.
 * Logging out unmounts it, which destroys the YouTube player, the aura and the library view.
 */
export default function Dashboard({ user, dark, onToggleTheme, onLogout }) {
  const store = useMemo(() => createUserStore(user.uid), [user.uid]);
  const bp = useBreakpoint();

  // ---------- library ----------
  const [library, setLibrary] = useState(() => sanitizeLibrary(store.get('library')));
  useEffect(() => {
    store.set('library', library);
  }, [library, store]);
  const activeFolder = library.folders.find((f) => f.id === library.activeId) || library.folders[0];

  const createFolder = (name) => {
    const id = newId();
    setLibrary((l) => ({ folders: [...l.folders, { id, name, tracks: [], createdAt: Date.now() }], activeId: id }));
    flash(`Shelf “${name}” created`);
  };
  const renameFolder = (id, name) =>
    setLibrary((l) => ({ ...l, folders: l.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
  const deleteFolder = (id) =>
    setLibrary((l) => {
      const folders = l.folders.filter((f) => f.id !== id);
      if (!folders.length) return l;
      return { folders, activeId: l.activeId === id ? folders[0].id : l.activeId };
    });
  const selectFolder = (id) => setLibrary((l) => ({ ...l, activeId: id }));
  const addTracks = (tracks) => {
    if (!tracks.length) return;
    setLibrary((l) => ({
      ...l,
      folders: l.folders.map((f) => {
        if (f.id !== l.activeId) return f;
        const have = new Set(f.tracks.map((t) => t.videoId));
        const fresh = tracks.filter((t) => !have.has(t.videoId)).map((t) => ({ ...t, id: newId(), addedAt: Date.now() }));
        return { ...f, tracks: [...f.tracks, ...fresh] };
      }),
    }));
    flash(tracks.length === 1 ? `Added to ${activeFolder.name}` : `${tracks.length} tracks added to ${activeFolder.name}`);
  };
  const removeTrack = (trackId) =>
    setLibrary((l) => ({
      ...l,
      folders: l.folders.map((f) => (f.id === l.activeId ? { ...f, tracks: f.tracks.filter((t) => t.id !== trackId) } : f)),
    }));

  // ---------- settings ----------
  const [apiKey, setApiKeyState] = useState(() => store.get('apikey', ''));
  const saveApiKey = (k) => {
    setApiKeyState(k);
    k ? store.set('apikey', k) : store.remove('apikey');
    flash(k ? 'API key saved to your profile' : 'API key removed');
  };
  const [apiOpen, setApiOpen] = useState(false);

  // ---------- toast ----------
  const [toast, setToast] = useState('');
  const toastTimer = useRef();
  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // ---------- playback ----------
  const saved = useMemo(() => store.get('player', {}), [store]);
  const [queue, setQueue] = useState(() => (Array.isArray(saved.queue) ? saved.queue : []));
  const [index, setIndex] = useState(() => (Number.isInteger(saved.index) ? saved.index : -1));
  const [shuffle, setShuffle] = useState(!!saved.shuffle);
  const [repeat, setRepeat] = useState(saved.repeat || 'off');
  const track = queue[index] || null;

  const nextRef = useRef(() => {});
  const player = useYouTubePlayer({
    initialVolume: Number.isFinite(saved.volume) ? saved.volume : 80,
    onEnded: () => nextRef.current(true),
    onError: (msg) => {
      flash(`${msg} Skipping…`);
      setTimeout(() => nextRef.current(true), 1200);
    },
  });

  const playAt = useCallback(
    (list, i) => {
      if (!list[i]) return;
      setQueue(list);
      setIndex(i);
      player.load(list[i].videoId, { autoplay: true });
    },
    [player.load] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const next = (auto = false) => {
    if (!queue.length) return;
    if (auto && repeat === 'one') {
      player.seek(0);
      player.play();
      return;
    }
    let ni;
    if (shuffle && queue.length > 1) {
      do ni = Math.floor(Math.random() * queue.length);
      while (ni === index);
    } else ni = index + 1;
    if (ni >= queue.length) {
      if (auto && repeat === 'off') {
        player.pause();
        return;
      }
      ni = 0;
    }
    playAt(queue, ni);
  };
  nextRef.current = next;

  const prev = () => {
    if (!queue.length) return;
    if (player.getTime().current > 3) {
      player.seek(0);
      return;
    }
    playAt(queue, index - 1 < 0 ? queue.length - 1 : index - 1);
  };

  const toggle = () => {
    if (!track) {
      if (activeFolder.tracks.length) playAt(activeFolder.tracks, 0);
      else flash('Add a record to this shelf first');
      return;
    }
    if (player.isPlaying || player.wantPlay) player.pause();
    else if (player.ytState === YTS.UNSTARTED && !player.time.duration) player.load(track.videoId, { autoplay: true });
    else player.play();
  };

  // ---------- listening history (feeds For You) ----------
  const [history, setHistory] = useState(() => store.get('history', null) || emptyHistory());
  useEffect(() => {
    store.set('history', history);
  }, [history, store]);

  // A play counts once the user has actually listened for 30s (or half of a short song).
  const listen = useRef({ id: null, secs: 0, last: 0, counted: false });
  useEffect(() => {
    const L = listen.current;
    const id = track?.videoId || null;
    const cur = player.time.current;
    if (L.id !== id) {
      listen.current = { id, secs: 0, last: cur, counted: false };
      return;
    }
    const d = cur - L.last;
    L.last = cur;
    if (d < -5) {
      // jumped back to the start (repeat-one / replay) — a fresh listen
      L.secs = 0;
      L.counted = false;
      return;
    }
    if (!player.isPlaying || d <= 0 || d > 2) return; // ignore seeks
    L.secs += d;
    const need = Math.min(30, (player.time.duration || 60) * 0.5);
    if (!L.counted && L.secs >= need && track) {
      L.counted = true;
      setHistory((h) => recordPlay(h, track));
    }
  }, [player.time, player.isPlaying, track]);

  const knownIds = useMemo(() => {
    const ids = new Set(Object.keys(history.plays || {}));
    library.folders.forEach((f) => f.tracks.forEach((t) => ids.add(t.videoId)));
    return [...ids];
  }, [history, library]);

  // Tonearm: dropping the needle at fraction f of the grooves seeks there and plays.
  const armDrop = (f) => {
    if (!track) {
      toggle();
      return;
    }
    const d = player.time.duration;
    if (d) {
      player.seek(f * d);
      if (!player.isPlaying) player.play();
    } else {
      player.load(track.videoId, { autoplay: true }); // length unknown until first load
    }
  };
  const armLift = () => player.pause();

  // Restore last session's record (cued, not playing) once the player is ready.
  const restored = useRef(false);
  useEffect(() => {
    if (!player.ready || restored.current) return;
    restored.current = true;
    if (track) player.load(track.videoId, { autoplay: false, start: saved.position || 0 });
  }, [player.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist playback state (position in 5s steps).
  const pos5 = Math.floor(player.time.current / 5) * 5;
  useEffect(() => {
    store.set('player', { queue, index, shuffle, repeat, volume: player.volume, position: pos5 });
  }, [store, queue, index, shuffle, repeat, player.volume, pos5]);

  // ---------- visuals ----------
  const palette = usePalette(track?.thumb, track?.videoId);
  const accentColor = accent(palette[0], dark);

  // Rendered vinyl artwork for the OS media card / lock screen (tonearm follows play state).
  const [vinylArt, setVinylArt] = useState(null);
  useEffect(() => {
    if (!track) {
      setVinylArt(null);
      return undefined;
    }
    let alive = true;
    renderVinylArtwork({ thumb: track.thumb, palette, playing: player.isPlaying }).then(
      (url) => alive && setVinylArt(url)
    );
    return () => {
      alive = false;
    };
  }, [track, palette, player.isPlaying]);

  // ---------- full-screen vinyl view ----------
  const [stageOpen, setStageOpen] = useState(false);
  const openStage = () => {
    enterFullscreen(); // must run inside the click / key gesture
    setStageOpen(true);
  };
  const closeStage = useCallback(() => {
    exitFullscreen();
    setStageOpen(false);
  }, []);

  useMediaSession({
    track,
    artwork: vinylArt,
    isPlaying: player.isPlaying,
    time: player.time,
    onPlay: () => (track ? player.play() : toggle()),
    onPause: player.pause,
    onNext: () => next(false),
    onPrev: prev,
    onSeek: player.seek,
  });

  // Keyboard: space toggles, arrows skip (ignored while typing).
  useEffect(() => {
    const h = (e) => {
      if (e.target.closest('input, textarea, [contenteditable]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleRef.current();
      }
      if (e.key === 'f' || e.key === 'F') stageRef.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  const stageRef = useRef();
  stageRef.current = () => (stageOpen ? closeStage() : openStage());

  // ---------- onboarding ----------
  const [guide, setGuide] = useState(() => !store.get('onboarded', false));
  const finishGuide = () => {
    store.set('onboarded', true);
    setGuide(false);
  };

  // ---------- responsive shell ----------
  const [libOpen, setLibOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  // Steps 1–2 point inside the library, which lives in a drawer/sheet below desktop width.
  useEffect(() => {
    setLibOpen(guide && bp !== 'desktop' ? guideStep < 2 : false);
  }, [bp, guide, guideStep]);

  const logout = () => {
    player.stop();
    onLogout();
  };

  const nav = (embedded) => (
    <NavShelf
      user={user}
      folders={library.folders}
      activeId={activeFolder.id}
      onSelect={selectFolder}
      onCreate={createFolder}
      onRename={renameFolder}
      onDelete={deleteFolder}
      dark={dark}
      onToggleTheme={onToggleTheme}
      onOpenApi={() => setApiOpen(true)}
      hasApiKey={!!apiKey}
      onLogout={logout}
      onReplayGuide={() => {
        setGuideStep(0);
        setGuide(true);
      }}
      embedded={embedded}
    />
  );

  const libraryPane = (embedded) => (
    <LibraryPane
      folder={activeFolder}
      apiKey={apiKey}
      onOpenApi={() => setApiOpen(true)}
      onAddTracks={addTracks}
      onPlayFolder={(i) => {
        playAt(activeFolder.tracks, i);
        if (bp === 'mobile') setLibOpen(false);
      }}
      onPlayList={(list, i) => playAt(list, i)}
      onRemove={removeTrack}
      currentVideoId={track?.videoId}
      isPlaying={player.isPlaying}
      embedded={embedded}
      forYou={
        <ForYou
          history={history}
          store={store}
          apiKey={apiKey}
          knownIds={knownIds}
          shelfIds={new Set(activeFolder.tracks.map((t) => t.videoId))}
          onOpenApi={() => setApiOpen(true)}
          onPlayList={(list, i) => {
            playAt(list, i);
            if (bp === 'mobile') setLibOpen(false);
          }}
          onAdd={addTracks}
          currentVideoId={track?.videoId}
          isPlaying={player.isPlaying}
        />
      }
    />
  );

  const stage = (
    <div className="relative flex w-full flex-col items-center">
      <button
        onClick={openStage}
        className="glass absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105"
        aria-label="Full-screen vinyl view"
        title="Full-screen vinyl (F)"
      >
        <IconExpand size={17} />
      </button>
      <Turntable
        track={track}
        palette={palette}
        spinning={player.isPlaying}
        dark={dark}
        onToggle={toggle}
        progress={player.time.duration ? player.time.current / player.time.duration : 0}
        onArmDrop={armDrop}
        onArmLift={armLift}
        className={
          bp === 'desktop'
            ? 'w-[min(100%,58vh,540px)]'
            : bp === 'tablet'
            ? 'w-[min(70vw,50vh,520px)]'
            : 'w-[min(86vw,44dvh,380px)]'
        }
      />
      <div className={`w-full ${bp === 'mobile' ? 'mt-3 max-w-[380px] px-2' : 'mt-6 max-w-[460px]'}`}>
        <PlayerControls
          track={track}
          isPlaying={player.isPlaying}
          buffering={player.buffering}
          time={player.time}
          volume={player.volume}
          shuffle={shuffle}
          repeat={repeat}
          accentColor={accentColor}
          onToggle={toggle}
          onNext={() => next(false)}
          onPrev={prev}
          onSeek={player.seek}
          onVolume={player.setVolume}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))}
          compact={bp === 'mobile'}
        />
      </div>
      {player.loadError && <p className="mt-3 text-xs text-red-600 dark:text-red-300">{player.loadError}</p>}
    </div>
  );

  return (
    <>
      <AuraBackground palette={palette} dark={dark} active={player.isPlaying} />

      {/* Invisible YouTube engine. Kept rendered (not display:none) so playback is allowed. */}
      <div
        ref={player.hostRef}
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-20 h-[200px] w-[200px] overflow-hidden opacity-0"
      />

      {bp === 'desktop' && (
        <div className="grid h-[100dvh] grid-cols-[272px_minmax(340px,420px)_1fr] gap-4 p-4">
          <aside className="glass min-h-0 overflow-hidden rounded-[28px]">{nav(false)}</aside>
          <section className="glass min-h-0 overflow-hidden rounded-[28px]">{libraryPane(false)}</section>
          <main className="flex min-h-0 items-center justify-center overflow-y-auto px-6 py-6">{stage}</main>
        </div>
      )}

      {bp === 'tablet' && (
        <div className="flex h-[100dvh] flex-col">
          <header className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <button className="icon-btn glass h-11 w-11" onClick={() => setLibOpen(true)} aria-label="Open library">
              <IconMenu size={20} />
            </button>
            <Brand />
            <ThemeToggle dark={dark} onToggle={onToggleTheme} className="glass h-11 w-11" />
          </header>
          <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-8 py-6">{stage}</main>
          <Drawer open={libOpen} onClose={() => setLibOpen(false)}>
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <Brand />
            </div>
            {nav(true)}
            <div className="mx-4 border-t border-black/5 dark:border-white/5" />
            {libraryPane(true)}
          </Drawer>
        </div>
      )}

      {bp === 'mobile' && (
        <div className="flex min-h-[100dvh] flex-col">
          <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Brand />
            <ThemeToggle dark={dark} onToggle={onToggleTheme} className="glass h-10 w-10" />
          </header>
          <main className="flex flex-1 flex-col items-center justify-center px-4 pb-28 pt-2">{stage}</main>

          {/* bottom tray handle */}
          <button
            onClick={() => setLibOpen(true)}
            className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-[22px] px-4 py-3 text-left"
            aria-label="Open library"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal text-chalk dark:bg-warm dark:text-obsidian">
              <IconChevronUp size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="label block">Library</span>
              <span className="block truncate text-sm font-semibold">
                {activeFolder.name} · {activeFolder.tracks.length}{' '}
                {activeFolder.tracks.length === 1 ? 'record' : 'records'}
              </span>
            </span>
          </button>
          <BottomSheet open={libOpen} onClose={() => setLibOpen(false)}>
            {nav(true)}
            <div className="mx-4 border-t border-black/5 dark:border-white/5" />
            {libraryPane(true)}
          </BottomSheet>
        </div>
      )}

      {guide && (
        <Onboarding
          onFinish={finishGuide}
          onStepChange={setGuideStep}
        />
      )}

      <VinylStage
        open={stageOpen}
        onClose={closeStage}
        track={track}
        palette={palette}
        dark={dark}
        isPlaying={player.isPlaying}
        buffering={player.buffering}
        time={player.time}
        onToggle={toggle}
        onNext={() => next(false)}
        onPrev={prev}
        onArmDrop={armDrop}
        onArmLift={armLift}
      />

      <ApiKeyModal open={apiOpen} onClose={() => setApiOpen(false)} value={apiKey} onSave={saveApiKey} />
      <Toast message={toast} />
    </>
  );
}
