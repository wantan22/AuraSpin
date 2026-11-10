import { useEffect, useState } from 'react';
import { currentSession, signOut } from './lib/auth.js';
import { DEFAULT_PALETTE } from './lib/color.js';
import { cloudCurrentUser, cloudEnabled, cloudSignOut, getUserStore, hydrate, supabase } from './lib/cloud.js';
import { useAppliedTheme } from './hooks/misc.js';
import AuthOverlay from './components/AuthOverlay.jsx';
import AuraBackground from './components/AuraBackground.jsx';
import Dashboard from './components/Dashboard.jsx';
import { SetPasswordModal } from './components/Overlays.jsx';

export default function App() {
  // Cloud mode restores the Supabase session asynchronously; guests (and local-only mode)
  // restore synchronously from this browser.
  const [user, setUser] = useState(() => {
    const local = currentSession();
    if (!local) return null;
    return !cloudEnabled || local.isGuest ? local : null;
  });
  const [booting, setBooting] = useState(cloudEnabled && !user);
  const [recovery, setRecovery] = useState(false);

  // Theme preference: null = follow OS. Signed-in users persist (and sync) theirs.
  const [themePref, setThemePref] = useState(() => (user ? getUserStore(user).get('theme', null) : null));
  const dark = useAppliedTheme(themePref);

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    let alive = true;
    if (!user) {
      cloudCurrentUser()
        .then(async (u) => {
          if (!u || !alive) return;
          await hydrate(u).catch(() => {}); // offline: fall back to this device's cached copy
          if (!alive) return;
          setThemePref(getUserStore(u).get('theme', null));
          setUser(u);
        })
        .finally(() => alive && setBooting(false));
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const nextPref = dark ? 'light' : 'dark';
    setThemePref(nextPref);
    if (user) getUserStore(user).set('theme', nextPref);
  };

  // Cloud users: pull their synced data down before the dashboard reads local storage.
  const handleAuthed = async (u) => {
    if (u.cloud) await hydrate(u);
    setThemePref(getUserStore(u).get('theme', null));
    setUser(u);
  };

  const handleLogout = async () => {
    const u = user;
    signOut();
    setUser(null);
    setThemePref(null); // back to OS preference; never leak the previous user's theme
    if (u?.cloud) await cloudSignOut(u.uid).catch(() => {});
  };

  const remoteTheme = (pref) => setThemePref(pref || null);

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <AuraBackground palette={DEFAULT_PALETTE} dark={dark} active={false} />
        <div className="h-14 w-14 animate-spin-record rounded-full border-[6px] border-charcoal/15 border-t-charcoal/60 dark:border-warm/15 dark:border-t-warm/60" />
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <>
          <AuraBackground palette={DEFAULT_PALETTE} dark={dark} active={false} />
          <AuthOverlay onAuthed={handleAuthed} dark={dark} onToggleTheme={() => setThemePref(dark ? 'light' : 'dark')} />
        </>
      ) : (
        // key={uid} guarantees a full remount per profile: no state can carry across accounts.
        <Dashboard
          key={user.uid}
          user={user}
          dark={dark}
          onToggleTheme={toggleTheme}
          onRemoteTheme={remoteTheme}
          onLogout={handleLogout}
        />
      )}
      {recovery && <SetPasswordModal onDone={() => setRecovery(false)} />}
    </>
  );
}
