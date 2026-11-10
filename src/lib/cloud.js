// Cloud accounts + cross-device sync (Supabase).
//
// Model: localStorage stays the app's working copy (fast, works offline). For signed-in
// cloud users every write to a synced bucket is also pushed to `public.user_state`
// (one row per user+bucket, protected by row-level security). On sign-in we pull every
// row down; while the app is open, Realtime pushes changes made on other devices.
// Conflicts resolve per bucket: whichever side changed last wins.
//
// If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing, the app falls back to the
// original browser-only accounts.
import { createClient } from '@supabase/supabase-js';
import { createUserStore, readJSON, removeKey, scopedKey, writeJSON } from './storage.js';
import { uidForEmail } from './auth.js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(URL_ && KEY);
export const supabase = cloudEnabled
  ? createClient(URL_, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'auraspin-cloud-auth' },
    })
  : null;

/** Buckets that follow the user across devices ('recs' is a local cache, so it stays local). */
export const SYNCED = ['library', 'history', 'player', 'theme', 'onboarded', 'apikey', 'oauth'];
// Playback position changes every few seconds; batch it so we don't spam the database.
const DELAY = { player: 15000 };
const DEFAULT_DELAY = 800;

// ---------------------------------------------------------------- auth

export const toAppUser = (u) => ({
  uid: u.id,
  email: u.email,
  name: u.user_metadata?.name || (u.email || '').split('@')[0],
  isGuest: false,
  cloud: true,
});

const friendly = (error) => {
  const m = error?.message || String(error);
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox for the link.';
  if (/already registered|already been registered/i.test(m)) return 'An account with this email already exists. Try logging in.';
  if (/password should be at least/i.test(m)) return 'Password must be at least 6 characters.';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
  if (/failed to fetch|network/i.test(m)) return 'Can’t reach the sync server. Check your connection.';
  return m;
};

export async function cloudSignUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(friendly(error));
  // Supabase returns a fake user with no identities when the email is already taken.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    throw new Error('An account with this email already exists. Try logging in.');
  if (!data.session) return { needsConfirm: true };
  return { user: toAppUser(data.user) };
}

export async function cloudSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error));
  return toAppUser(data.user);
}

export async function cloudResetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw new Error(friendly(error));
}

export async function cloudUpdatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
}

export async function cloudCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? toAppUser(data.session.user) : null;
}

// ---------------------------------------------------------------- sync state

// JSON of the last value we know the server holds, per bucket. Used to skip
// redundant pushes and to ignore Realtime echoes of our own writes.
const known = new Map();
const timers = new Map();
const pending = new Map();
let statusListener = () => {};
let inflight = 0;

export const onSyncStatus = (fn) => {
  statusListener = fn;
  return () => {
    statusListener = () => {};
  };
};
const setStatus = (s) => statusListener(s);

const dirtyKey = (uid) => `auraspin-sync-dirty-${uid}`;
const markDirty = (uid, bucket) => writeJSON(dirtyKey(uid), { ...readJSON(dirtyKey(uid), {}), [bucket]: Date.now() });
const clearDirty = (uid, bucket) => {
  const d = readJSON(dirtyKey(uid), {});
  delete d[bucket];
  writeJSON(dirtyKey(uid), d);
};

async function upsert(uid, bucket, value) {
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: uid, bucket, data: value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function flushOne(uid, bucket) {
  const k = `${uid}|${bucket}`;
  clearTimeout(timers.get(k));
  timers.delete(k);
  if (!pending.has(k)) return;
  const value = pending.get(k);
  pending.delete(k);
  inflight += 1;
  setStatus('saving');
  try {
    await upsert(uid, bucket, value);
    known.set(k, JSON.stringify(value));
    clearDirty(uid, bucket);
    setStatus(pending.size ? 'saving' : 'synced');
  } catch {
    setStatus('offline'); // stays dirty; pushed again on next sign-in or focus
  } finally {
    inflight -= 1;
  }
}

export function queuePush(uid, bucket, value) {
  if (!SYNCED.includes(bucket)) return;
  const k = `${uid}|${bucket}`;
  const json = JSON.stringify(value ?? null);
  if (known.get(k) === json && !pending.has(k)) return; // nothing new
  markDirty(uid, bucket);
  pending.set(k, value ?? null);
  clearTimeout(timers.get(k));
  timers.set(k, setTimeout(() => flushOne(uid, bucket), DELAY[bucket] ?? DEFAULT_DELAY));
  setStatus('saving');
}

export async function flushAll(uid) {
  const keys = [...pending.keys()].filter((k) => k.startsWith(`${uid}|`));
  await Promise.all(keys.map((k) => flushOne(uid, k.split('|')[1])));
}

/** A user store whose writes also sync, when the user is a cloud account. */
export function getUserStore(user) {
  if (!user?.cloud || !cloudEnabled) return createUserStore(user.uid);
  return createUserStore(user.uid, { onWrite: (bucket, value) => queuePush(user.uid, bucket, value) });
}

// ---------------------------------------------------------------- pull / hydrate

async function fetchRows(uid) {
  const { data, error } = await supabase.from('user_state').select('bucket, data, updated_at').eq('user_id', uid);
  if (error) throw error;
  return data || [];
}

/**
 * Runs once at sign-in, before the dashboard mounts:
 *  • cloud value newer than any unsynced local edit → written into local storage
 *  • local edit made while offline (newer)          → pushed up
 *  • nothing in the cloud yet                        → local data (including data from the
 *    old browser-only account with the same email) is uploaded as the starting point
 */
export async function hydrate(user) {
  const uid = user.uid;
  setStatus('saving');
  const rows = await fetchRows(uid);
  const byBucket = new Map(rows.map((r) => [r.bucket, r]));
  const dirty = readJSON(dirtyKey(uid), {});
  const legacyUid = user.email ? await uidForEmail(user.email) : null;

  const uploads = [];
  for (const bucket of SYNCED) {
    const k = `${uid}|${bucket}`;
    const row = byBucket.get(bucket);
    const local = readJSON(scopedKey(bucket, uid), undefined);
    if (row) {
      const localNewer = dirty[bucket] && dirty[bucket] > Date.parse(row.updated_at) && local !== undefined;
      if (localNewer) {
        uploads.push([bucket, local]);
      } else {
        row.data == null ? removeKey(scopedKey(bucket, uid)) : writeJSON(scopedKey(bucket, uid), row.data);
        known.set(k, JSON.stringify(row.data));
        clearDirty(uid, bucket);
      }
    } else {
      let seed = local;
      if (seed === undefined && legacyUid) {
        seed = readJSON(scopedKey(bucket, legacyUid), undefined);
        if (seed !== undefined) writeJSON(scopedKey(bucket, uid), seed);
      }
      if (seed !== undefined) uploads.push([bucket, seed]);
    }
  }
  await Promise.all(
    uploads.map(async ([bucket, value]) => {
      await upsert(uid, bucket, value);
      known.set(`${uid}|${bucket}`, JSON.stringify(value));
      clearDirty(uid, bucket);
    })
  );
  setStatus('synced');
  return { migrated: uploads.length };
}

/**
 * Calls onChange(bucket, data) whenever another device changes a bucket.
 * Uses Realtime, plus a re-check whenever the tab regains focus (covers sleeps / dropped sockets).
 */
export function subscribeRemote(uid, onChange) {
  const apply = (bucket, data) => {
    const k = `${uid}|${bucket}`;
    const json = JSON.stringify(data ?? null);
    if (known.get(k) === json || pending.has(k)) return; // our own echo, or we have newer unsent edits
    known.set(k, json);
    data == null ? removeKey(scopedKey(bucket, uid)) : writeJSON(scopedKey(bucket, uid), data);
    onChange(bucket, data);
  };

  const channel = supabase
    .channel(`user_state:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${uid}` }, (p) => {
      const row = p.new && p.new.bucket ? p.new : null;
      if (row && SYNCED.includes(row.bucket)) apply(row.bucket, row.data);
    })
    .subscribe();

  const recheck = async () => {
    if (document.visibilityState !== 'visible') {
      flushAll(uid); // leaving the tab: push anything still queued
      return;
    }
    try {
      const rows = await fetchRows(uid);
      rows.forEach((r) => SYNCED.includes(r.bucket) && apply(r.bucket, r.data));
      // retry anything that failed to push earlier
      const dirty = readJSON(dirtyKey(uid), {});
      Object.keys(dirty).forEach((b) => {
        const v = readJSON(scopedKey(b, uid), null);
        known.delete(`${uid}|${b}`);
        queuePush(uid, b, v);
      });
      setStatus('synced');
    } catch {
      setStatus('offline');
    }
  };
  document.addEventListener('visibilitychange', recheck);
  window.addEventListener('online', recheck);

  return () => {
    supabase.removeChannel(channel);
    document.removeEventListener('visibilitychange', recheck);
    window.removeEventListener('online', recheck);
  };
}

/** Pushes pending edits, signs out, and clears this user's cached copy from the device. */
export async function cloudSignOut(uid) {
  try {
    await flushAll(uid);
  } catch {
    /* best effort */
  }
  await supabase.auth.signOut();
  // The cloud holds the data now, so leave nothing readable on a shared device.
  ['library', 'apikey', 'theme', 'onboarded', 'player', 'history', 'recs', 'oauth'].forEach((b) =>
    removeKey(scopedKey(b, uid))
  );
  removeKey(dirtyKey(uid));
  [...known.keys()].filter((k) => k.startsWith(`${uid}|`)).forEach((k) => known.delete(k));
}
