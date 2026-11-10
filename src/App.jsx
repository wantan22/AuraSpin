import { useState } from 'react';
import { currentSession, signOut } from './lib/auth.js';
import { createUserStore } from './lib/storage.js';
import { DEFAULT_PALETTE } from './lib/color.js';
import { useAppliedTheme } from './hooks/misc.js';
import AuthOverlay from './components/AuthOverlay.jsx';
import AuraBackground from './components/AuraBackground.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(currentSession);
  // Theme preference: null = follow OS. Signed-in users persist theirs under their own key.
  const [themePref, setThemePref] = useState(() => (user ? createUserStore(user.uid).get('theme', null) : null));
  const dark = useAppliedTheme(themePref);

  const toggleTheme = () => {
    const nextPref = dark ? 'light' : 'dark';
    setThemePref(nextPref);
    if (user) createUserStore(user.uid).set('theme', nextPref);
  };

  const handleAuthed = (u) => {
    setThemePref(createUserStore(u.uid).get('theme', null));
    setUser(u);
  };

  const handleLogout = () => {
    signOut();
    setUser(null);
    setThemePref(null); // back to OS preference; never leak the previous user's theme
  };

  if (!user) {
    return (
      <>
        <AuraBackground palette={DEFAULT_PALETTE} dark={dark} active={false} />
        <AuthOverlay onAuthed={handleAuthed} dark={dark} onToggleTheme={() => setThemePref(dark ? 'light' : 'dark')} />
      </>
    );
  }

  // key={uid} guarantees a full remount per profile: no state can carry across accounts.
  return <Dashboard key={user.uid} user={user} dark={dark} onToggleTheme={toggleTheme} onLogout={handleLogout} />;
}
