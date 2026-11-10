// Client-side account engine. Passwords are never stored: only a PBKDF2-SHA256 hash with a
// per-account random salt. The uid is a SHA-256 digest of the normalised email, which is
// what every user-scoped storage key is built from.
import { readJSON, writeJSON, removeKey } from './storage.js';

const ACCOUNTS_KEY = 'auraspin-accounts';
const SESSION_KEY = 'auraspin-session';
const GUEST_KEY = 'auraspin-guest-uid';

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: 150000 },
    key,
    256
  );
  return toHex(bits);
}

const normEmail = (email) => email.trim().toLowerCase();
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function uidForEmail(email) {
  return 'u_' + (await sha256Hex('auraspin:' + normEmail(email))).slice(0, 24);
}

function persistSession(user) {
  writeJSON(SESSION_KEY, user);
  return user;
}

export async function signUp(email, password, displayName = '') {
  const e = normEmail(email);
  if (!validEmail(e)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  const accounts = readJSON(ACCOUNTS_KEY, {});
  if (accounts[e]) throw new Error('An account with this email already exists. Try logging in.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const uid = await uidForEmail(e);
  accounts[e] = {
    uid,
    salt,
    hash: await hashPassword(password, salt),
    name: displayName.trim(),
    createdAt: Date.now(),
  };
  writeJSON(ACCOUNTS_KEY, accounts);
  return persistSession({ uid, email: e, name: displayName.trim() || e.split('@')[0], isGuest: false });
}

export async function signIn(email, password) {
  const e = normEmail(email);
  const acct = readJSON(ACCOUNTS_KEY, {})[e];
  if (!acct) throw new Error('No account found for this email.');
  if ((await hashPassword(password, acct.salt)) !== acct.hash) throw new Error('Incorrect password.');
  return persistSession({ uid: acct.uid, email: e, name: acct.name || e.split('@')[0], isGuest: false });
}

export function signInGuest() {
  let guestUid = readJSON(GUEST_KEY);
  if (!guestUid) {
    guestUid = 'guest_' + toHex(crypto.getRandomValues(new Uint8Array(12)));
    writeJSON(GUEST_KEY, guestUid);
  }
  return persistSession({ uid: guestUid, email: null, name: 'Guest', isGuest: true });
}

export function currentSession() {
  const s = readJSON(SESSION_KEY);
  return s && typeof s.uid === 'string' ? s : null;
}

export function signOut() {
  removeKey(SESSION_KEY);
}
