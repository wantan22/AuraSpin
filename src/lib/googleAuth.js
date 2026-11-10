// Google Identity Services (token model) — browser-only OAuth, no server needed.
// We only ever ask for read-only YouTube access. The access token lives in memory
// for the session (≈1 hour) and is never written to storage.

export const YT_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

let gisPromise;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Could not load Google sign-in. Check your connection or ad blocker.'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** Preload so the popup can open synchronously inside the click (avoids popup blockers). */
export const preloadGoogleSignIn = () => loadGis().catch(() => {});

const clients = new Map();

/**
 * Opens Google's consent popup. Must be called from a user gesture.
 * Resolves with { token, expiresAt, scope }.
 */
export function connectYouTube(clientId) {
  return new Promise((resolve, reject) => {
    const google = window.google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google sign-in is still loading. Try again in a second.'));
      return;
    }
    let client = clients.get(clientId);
    const handlers = {};
    if (!client) {
      client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: YT_READONLY_SCOPE,
        prompt: '',
        callback: (resp) => handlers.ok?.(resp),
        error_callback: (err) => handlers.fail?.(err),
      });
      client.__handlers = handlers;
      clients.set(clientId, client);
    }
    const h = client.__handlers;
    h.ok = (resp) => {
      if (resp.error) {
        reject(
          new Error(
            resp.error === 'access_denied'
              ? 'Access was denied. If this app is in testing mode, add your Google account as a test user.'
              : `Google sign-in failed: ${resp.error_description || resp.error}`
          )
        );
        return;
      }
      if (!google.accounts.oauth2.hasGrantedAllScopes(resp, YT_READONLY_SCOPE)) {
        reject(new Error('YouTube access was not granted. Tick the YouTube permission and try again.'));
        return;
      }
      resolve({ token: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000 });
    };
    h.fail = (err) => {
      const map = {
        popup_closed: 'The Google window was closed. If it said “access blocked”, add your account as a test user in Google Cloud.',
        popup_failed_to_open: 'Your browser blocked the Google sign-in popup. Allow popups for this site.',
      };
      reject(new Error(map[err?.type] || 'Google sign-in did not complete.'));
    };
    try {
      client.requestAccessToken();
    } catch (e) {
      reject(new Error(`Google sign-in failed: ${e.message}`));
    }
  });
}

export function disconnectYouTube(token) {
  try {
    if (token) window.google?.accounts?.oauth2?.revoke(token, () => {});
  } catch {
    /* ignore */
  }
}

/** Basic shape check so obvious paste mistakes are caught before Google's popup errors. */
export const looksLikeClientId = (id) => /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(id.trim());
