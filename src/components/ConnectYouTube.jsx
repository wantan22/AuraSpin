import { useEffect, useState } from 'react';
import { Modal } from './Overlays.jsx';
import { IconCheck, IconYouTube } from './Icons.jsx';
import { connectYouTube, looksLikeClientId, preloadGoogleSignIn } from '../lib/googleAuth.js';
import { fetchLikedVideos, fetchPlaylist, listMyPlaylists } from '../lib/youtube.js';

function Setup({ initial, onSave, onCancel }) {
  const [id, setId] = useState(initial || '');
  const origin = window.location.origin;
  const valid = looksLikeClientId(id);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(id.trim());
      }}
    >
      <p className="text-sm muted">
        A one-time setup in Google Cloud lets AuraSpin read your playlists. It only gets <b>read-only</b> access.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs muted">
        <li>
          In <b>Google Cloud Console</b> (same project as your API key), open <b>APIs &amp; Services → OAuth consent screen</b>.
          Choose <b>External</b>, then fill in the app name and your email.
        </li>
        <li>
          Under <b>Data access / Scopes</b>, add <code className="rounded bg-black/5 px-1 dark:bg-white/10">…/auth/youtube.readonly</code>.
        </li>
        <li>
          Under <b>Audience / Test users</b>, add the Google account(s) that will connect. Only test users can sign in until Google verifies the app.
        </li>
        <li>
          In <b>Credentials → Create credentials → OAuth client ID</b>, pick <b>Web application</b>. Under <b>Authorised JavaScript origins</b>, add:
          <code className="mt-1 block select-all rounded-lg bg-black/5 px-2 py-1 font-mono text-[11px] text-charcoal dark:bg-white/10 dark:text-warm">
            {origin}
          </code>
        </li>
        <li>Copy the <b>Client ID</b> and paste it below.</li>
      </ol>
      <label className="label mb-1.5 mt-4 block" htmlFor="clientid">
        OAuth Client ID
      </label>
      <input
        id="clientid"
        className="field font-mono text-xs"
        placeholder="1234567890-abc123.apps.googleusercontent.com"
        value={id}
        onChange={(e) => setId(e.target.value)}
        spellCheck="false"
        autoComplete="off"
      />
      {id && !valid && <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">That doesn’t look like a client ID (it ends in .apps.googleusercontent.com).</p>}
      <div className="mt-5 flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={!valid}>
          Save
        </button>
      </div>
    </form>
  );
}

function ImportRow({ thumb, title, meta, onImport }) {
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [msg, setMsg] = useState('');
  const run = async () => {
    setState('busy');
    setMsg('');
    try {
      const n = await onImport();
      setState('done');
      setMsg(n ? `${n} added` : 'Already up to date');
    } catch (e) {
      setState('error');
      setMsg(e.message);
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        {thumb ? <img src={thumb} alt="" className="h-full w-full scale-[1.35] object-cover" loading="lazy" /> : <IconYouTube size={20} className="m-3 opacity-50" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className={`truncate text-xs ${state === 'error' ? 'text-red-600 dark:text-red-300' : 'muted'}`}>{msg || meta}</div>
      </div>
      <button
        onClick={run}
        disabled={state === 'busy'}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          state === 'done' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'btn-ghost'
        }`}
      >
        {state === 'busy' ? 'Importing…' : state === 'done' ? (
          <span className="flex items-center gap-1">
            <IconCheck size={13} /> Again
          </span>
        ) : (
          'Import'
        )}
      </button>
    </div>
  );
}

export default function ConnectYouTubeModal({ open, onClose, clientId, onSaveClientId, auth, onConnected, onDisconnect, onImport }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [playlists, setPlaylists] = useState(null);
  const token = auth && auth.expiresAt > Date.now() ? auth.token : null;

  useEffect(() => {
    if (open) {
      preloadGoogleSignIn();
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !token) {
      if (!token) setPlaylists(null);
      return;
    }
    let alive = true;
    setBusy(true);
    listMyPlaylists(token)
      .then((p) => alive && setPlaylists(p))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [open, token]);

  const connect = () => {
    setError('');
    // called directly in the click so the popup isn't blocked
    connectYouTube(clientId)
      .then(onConnected)
      .catch((e) => setError(e.message));
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect YouTube">
      <div className="mb-4 flex items-center gap-3 pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
          <IconYouTube size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Connect YouTube</h2>
          <p className="text-xs muted">Import your playlists &amp; likes, including YouTube Music playlists</p>
        </div>
      </div>

      {!clientId || editing ? (
        <Setup
          initial={clientId}
          onSave={(id) => {
            onSaveClientId(id);
            setEditing(false);
          }}
          onCancel={clientId ? () => setEditing(false) : null}
        />
      ) : !token ? (
        <div>
          <p className="text-sm muted">
            Sign in with Google to see your playlists. AuraSpin asks for read-only access and keeps the connection only for this session.
          </p>
          {auth && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Your last connection expired. Connect again to continue.</p>}
          {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
          <button onClick={connect} className="btn-primary mt-5 w-full py-3">
            <IconYouTube size={18} /> Connect with Google
          </button>
          <button onClick={() => setEditing(true)} className="mt-3 w-full text-center text-xs font-semibold muted hover:underline">
            Change OAuth Client ID
          </button>
        </div>
      ) : (
        <div>
          {error && <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
          <p className="label mb-1.5">Import as shelves</p>
          <div className="scroll-thin -mx-2 max-h-[48vh] overflow-y-auto">
            <ImportRow
              title="Liked videos"
              meta="Songs you gave a 👍 on YouTube"
              onImport={async () => onImport('Liked on YouTube', await fetchLikedVideos(token))}
            />
            {busy && !playlists && <p className="p-3 text-xs muted">Loading your playlists…</p>}
            {playlists?.length === 0 && <p className="p-3 text-xs muted">No playlists found on this account.</p>}
            {playlists?.map((p) => (
              <ImportRow
                key={p.id}
                thumb={p.thumb}
                title={p.title}
                meta={`${p.count} ${p.count === 1 ? 'video' : 'videos'}${p.privacy && p.privacy !== 'public' ? ` · ${p.privacy}` : ''}`}
                onImport={async () => onImport(p.title, await fetchPlaylist(p.id, { token }))}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] muted">
            YouTube Music’s separate “Liked Music” list and uploaded songs aren’t available to other apps.
          </p>
          <div className="mt-4 flex justify-between gap-2">
            <button className="btn-ghost text-red-600 dark:text-red-300" onClick={onDisconnect}>
              Disconnect
            </button>
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
