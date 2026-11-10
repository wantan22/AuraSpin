import { useEffect, useRef, useState } from 'react';
import {
  IconCheck,
  IconCompass,
  IconFolder,
  IconFolderPlus,
  IconKey,
  IconLogout,
  IconMoon,
  IconPencil,
  IconSun,
  IconTrash,
  IconX,
  IconYouTube,
} from './Icons.jsx';

export function Brand({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative h-8 w-8 rounded-full bg-charcoal shadow-md dark:bg-warm">
        <div className="absolute inset-[5px] rounded-full border border-white/20 dark:border-black/20" />
        <div className="absolute inset-[11px] rounded-full bg-milk-300" />
      </div>
      <span className="font-display text-xl font-semibold tracking-tight">AuraSpin</span>
    </div>
  );
}

export function ThemeToggle({ dark, onToggle, className = '' }) {
  return (
    <button
      onClick={onToggle}
      className={`icon-btn ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Editorial light' : 'Obsidian dark'}
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}

function FolderRow({ folder, active, onSelect, onRename, onDelete, canDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [confirm, setConfirm] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <form
        className="flex items-center gap-1 px-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onRename(folder.id, name.trim());
          setEditing(false);
        }}
      >
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          className="field py-1.5"
          maxLength={40}
        />
        <button type="submit" className="icon-btn h-8 w-8" onMouseDown={(e) => e.preventDefault()} aria-label="Save">
          <IconCheck size={16} />
        </button>
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? 'bg-white/80 font-semibold shadow-sm dark:bg-white/[0.08]'
          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
      }`}
    >
      <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => onSelect(folder.id)}>
        <IconFolder size={17} className={active ? 'text-milk-500 dark:text-milk-300' : 'opacity-60'} />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-[11px] font-medium tabular-nums opacity-45">{folder.tracks.length}</span>
      </button>
      {confirm ? (
        <div className="flex items-center gap-0.5">
          <button
            className="rounded-lg bg-red-500/90 px-2 py-0.5 text-[11px] font-semibold text-white"
            onClick={() => onDelete(folder.id)}
          >
            Delete
          </button>
          <button className="icon-btn h-6 w-6" onClick={() => setConfirm(false)} aria-label="Cancel">
            <IconX size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <button className="icon-btn h-7 w-7" onClick={() => setEditing(true)} aria-label={`Rename ${folder.name}`}>
            <IconPencil size={13} />
          </button>
          {canDelete && (
            <button className="icon-btn h-7 w-7" onClick={() => setConfirm(true)} aria-label={`Delete ${folder.name}`}>
              <IconTrash size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function NavShelf({
  user,
  folders,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  dark,
  onToggleTheme,
  onOpenApi,
  hasApiKey,
  onOpenYouTube,
  ytConnected,
  syncStatus,
  onLogout,
  onReplayGuide,
  embedded = false,
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    setCreating(false);
  };

  return (
    <div className={`flex flex-col ${embedded ? '' : 'h-full'}`}>
      {!embedded && (
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <Brand />
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      )}

      <div className={`mx-3 mb-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 glass-soft ${embedded ? 'mt-1' : ''}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-milk-200 to-milk-400 text-sm font-bold text-charcoal">
          {(user.name || 'G').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="truncate text-[11px] muted">{user.isGuest ? 'Guest profile · this device' : user.email}</div>
          {syncStatus && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider muted" aria-live="polite">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  syncStatus === 'offline' ? 'bg-amber-500' : syncStatus === 'saving' ? 'animate-pulse bg-sky-500' : 'bg-emerald-500'
                }`}
              />
              {syncStatus === 'offline' ? 'Offline · will sync later' : syncStatus === 'saving' ? 'Syncing…' : 'Synced'}
            </div>
          )}
        </div>
      </div>

      <div data-tour="shelves" className={`mx-2 flex flex-col rounded-2xl p-1 ${embedded ? '' : 'min-h-0 flex-1'}`}>
        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          <span className="label">Music shelves</span>
          <button
            className="icon-btn h-8 w-8"
            onClick={() => setCreating((v) => !v)}
            aria-label="Create a new shelf"
            title="New shelf"
          >
            <IconFolderPlus size={18} />
          </button>
        </div>

        {creating && (
          <form onSubmit={submit} className="mb-1.5 flex animate-rise gap-1.5 px-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
              placeholder="Late-night jazz…"
              className="field py-2"
              maxLength={40}
            />
            <button type="submit" className="btn-primary px-3 py-2" disabled={!name.trim()}>
              Add
            </button>
          </form>
        )}

        <nav className={`space-y-0.5 ${embedded ? '' : 'scroll-thin min-h-0 flex-1 overflow-y-auto'}`} aria-label="Shelves">
          {folders.map((f) => (
            <FolderRow
              key={f.id}
              folder={f}
              active={f.id === activeId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              canDelete={folders.length > 1}
            />
          ))}
        </nav>
      </div>

      <div className="mx-3 mb-3 mt-2 grid grid-cols-1 gap-0.5 border-t border-black/5 pt-2 text-sm dark:border-white/5">
        <button onClick={onOpenApi} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <IconKey size={17} className="opacity-60" />
          <span className="flex-1">API Credentials</span>
          <span className={`h-2 w-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-400'}`} title={hasApiKey ? 'Key saved' : 'No key'} />
        </button>
        <button onClick={onOpenYouTube} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <IconYouTube size={17} className="opacity-60" />
          <span className="flex-1">{ytConnected ? 'YouTube connected' : 'Connect YouTube'}</span>
          {ytConnected && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />}
        </button>
        <button onClick={onReplayGuide} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <IconCompass size={17} className="opacity-60" />
          App guide
        </button>
        {embedded && (
          <button onClick={onToggleTheme} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
            {dark ? <IconSun size={17} className="opacity-60" /> : <IconMoon size={17} className="opacity-60" />}
            {dark ? 'Editorial light' : 'Obsidian dark'}
          </button>
        )}
        <button onClick={onLogout} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <IconLogout size={17} className="opacity-60" />
          Log out
        </button>
      </div>
    </div>
  );
}
