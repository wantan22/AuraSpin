// User-scoped localStorage engine.
// Every piece of per-user data lives under `auraspin-<bucket>-<uid>`, where uid is a
// one-way hash of the account email (or a random guest id). Nothing user-specific is
// ever written under a shared key, so two profiles in the same browser cannot see or
// mix each other's shelves, queues, API keys or theme.

const BUCKETS = ['library', 'apikey', 'theme', 'onboarded', 'player', 'history', 'recs'];

export const scopedKey = (bucket, uid) => {
  if (!uid) throw new Error('scopedKey: a user id is required');
  if (!BUCKETS.includes(bucket)) throw new Error(`scopedKey: unknown bucket "${bucket}"`);
  return `auraspin-${bucket}-${uid}`;
};

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** A store bound to a single user. All reads/writes are forced through that user's keys. */
export function createUserStore(uid) {
  return Object.freeze({
    uid,
    get: (bucket, fallback = null) => readJSON(scopedKey(bucket, uid), fallback),
    set: (bucket, value) => writeJSON(scopedKey(bucket, uid), value),
    remove: (bucket) => removeKey(scopedKey(bucket, uid)),
  });
}

export const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
