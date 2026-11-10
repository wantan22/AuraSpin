import { useState } from 'react';
import { signIn, signInGuest, signUp } from '../lib/auth.js';
import { IconUser } from './Icons.jsx';
import { Brand, ThemeToggle } from './NavShelf.jsx';

export default function AuthOverlay({ onAuthed, dark, onToggleTheme }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = mode === 'login' ? await signIn(email, password) : await signUp(email, password, name);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      <ThemeToggle dark={dark} onToggle={onToggleTheme} className="absolute right-4 top-4" />

      {/* decorative record behind the card */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[min(120vw,760px)] w-[min(120vw,760px)] -translate-x-1/2 -translate-y-1/2 animate-spin-record rounded-full opacity-[0.22] dark:opacity-30" style={{ animationDuration: '24s', background: 'repeating-radial-gradient(circle, transparent 0 3px, rgba(30,30,36,0.18) 3px 4px)', WebkitMaskImage: 'radial-gradient(circle, transparent 0 18%, #000 19% 70%, transparent 71%)', maskImage: 'radial-gradient(circle, transparent 0 18%, #000 19% 70%, transparent 71%)' }} />

      <div className="glass relative w-full max-w-[400px] animate-rise rounded-[28px] p-7 sm:p-8">
        <Brand className="mb-6" />
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
          {mode === 'login' ? 'Welcome back to the listening room.' : 'Set up your listening room.'}
        </h1>
        <p className="mt-1.5 text-sm muted">
          {mode === 'login' ? 'Your shelves, queue and aura — right where you left them.' : 'Each profile keeps its own private shelves and settings.'}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-black/[0.04] p-1 text-sm font-semibold dark:bg-white/[0.05]" role="tablist">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={`rounded-lg py-2 transition ${mode === m ? 'bg-white shadow-sm dark:bg-white/10' : 'opacity-55 hover:opacity-80'}`}
            >
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === 'signup' && (
            <input className="field" placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={40} />
          )}
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <input
            className="field"
            type="password"
            placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'signup' ? 6 : undefined}
          />
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] muted">
          <span className="h-px flex-1 bg-current opacity-20" /> or <span className="h-px flex-1 bg-current opacity-20" />
        </div>
        <button className="btn-ghost w-full py-3" onClick={() => onAuthed(signInGuest())}>
          <IconUser size={17} /> Continue as Guest Profile
        </button>
        <p className="mt-4 text-center text-[11px] muted">
          Accounts live in this browser only. Passwords are salted and hashed; nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}
