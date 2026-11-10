import { useEffect, useRef, useState } from 'react';
import { searchVideos } from '../lib/youtube.js';
import { IconKey, IconX } from './Icons.jsx';

/** Left side-sliding drawer sheet (tablet). Always mounted so it can animate. */
export function Drawer({ open, onClose, children, label = 'Library' }) {
  useEscape(open, onClose);
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label={label}
        inert={open ? undefined : ''}
        className={`glass scroll-thin absolute inset-y-0 left-0 w-[400px] max-w-[88vw] overflow-y-auto rounded-r-[28px] transition-transform duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </aside>
    </div>
  );
}

/** Bottom sheet tray (phones). Drag the grabber down to dismiss. */
export function BottomSheet({ open, onClose, children, label = 'Library' }) {
  useEscape(open, onClose);
  const [drag, setDrag] = useState(0);
  const start = useRef(null);

  const onDown = (e) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (start.current == null) return;
    setDrag(Math.max(0, e.clientY - start.current));
  };
  const onUp = () => {
    if (drag > 110) onClose();
    start.current = null;
    setDrag(0);
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <section
        role="dialog"
        aria-label={label}
        inert={open ? undefined : ''}
        className="glass absolute inset-x-0 bottom-0 flex h-[86dvh] flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: open ? `translateY(${drag}px)` : 'translateY(100%)',
          transition: start.current != null ? 'none' : 'transform 450ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="h-1.5 w-11 rounded-full bg-black/15 dark:bg-white/20" />
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    </div>
  );
}

function useEscape(active, fn) {
  useEffect(() => {
    if (!active) return undefined;
    const h = (e) => e.key === 'Escape' && fn();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, fn]);
}

export function Modal({ open, onClose, children, title }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="glass relative w-full max-w-md animate-rise rounded-3xl p-6">
        <button className="icon-btn absolute right-3 top-3" onClick={onClose} aria-label="Close">
          <IconX size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ApiKeyModal({ open, onClose, value, onSave }) {
  const [key, setKey] = useState(value);
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(value);
      setStatus(null);
    }
  }, [open, value]);

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await searchVideos('lofi', key.trim());
      setStatus({ ok: true, text: 'Key works — search is live.' });
    } catch (e) {
      setStatus({ ok: false, text: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="API Credentials">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-milk-100 text-milk-500 dark:bg-white/5">
          <IconKey size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">API Credentials</h2>
          <p className="text-xs muted">YouTube Data API v3 · saved to this profile only</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(key.trim());
          onClose();
        }}
      >
        <label className="label mb-1.5 block" htmlFor="apikey">
          Google Cloud API key
        </label>
        <input
          id="apikey"
          type="password"
          autoComplete="off"
          spellCheck="false"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          className="field font-mono"
        />
        {status && (
          <p className={`mt-2 text-xs ${status.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'}`}>
            {status.text}
          </p>
        )}
        <ol className="mt-4 list-decimal space-y-1 pl-4 text-xs muted">
          <li>Open console.cloud.google.com and create (or pick) a project.</li>
          <li>Enable “YouTube Data API v3” under APIs &amp; Services.</li>
          <li>Create an API key in Credentials. Restrict it to YouTube Data API v3 and this site’s URL.</li>
        </ol>
        <p className="mt-3 text-[11px] muted">
          The key is stored in this browser under your profile’s private storage key and is sent only to googleapis.com.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {value && (
            <button
              type="button"
              className="btn-ghost mr-auto text-red-600 dark:text-red-300"
              onClick={() => {
                onSave('');
                onClose();
              }}
            >
              Remove key
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={test} disabled={!key.trim() || testing}>
            {testing ? 'Testing…' : 'Test'}
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Toast({ message }) {
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 transition-all duration-300 ${
        message ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
      role="status"
    >
      <div className="glass rounded-full px-4 py-2 text-sm font-medium">{message}</div>
    </div>
  );
}
