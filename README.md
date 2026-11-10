# AuraSpin

A vinyl-style music player built with React, Vite and Tailwind CSS. Audio comes from a hidden
YouTube IFrame player.

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # static output in dist/
```

## Features

- **Accounts.** Email/password or Guest Profile. Passwords are stored as PBKDF2-SHA256 hashes
  with a per-account salt. The uid is a SHA-256 hash of the email.
- **Per-user storage.** Each user's data is saved under its own key (`src/lib/storage.js`):
  `auraspin-library-<uid>`, `auraspin-apikey-<uid>`, `auraspin-theme-<uid>`,
  `auraspin-onboarded-<uid>` and `auraspin-player-<uid>`. The dashboard is mounted with
  `key={uid}`. Logging out unmounts it, which destroys the YouTube player, the aura, the library
  and the Media Session metadata.
- **First-run guide.** A 3-step spotlight guide covers shelves, search and the platter. It also
  opens the drawer or bottom sheet on tablets and phones. Replay it from **App guide**.
- **Turntable.** The translucent grooved disc spins with CSS and freezes in place on pause. A
  glossy reflection sits on top and does not rotate. An SVG tonearm swings onto the record and
  back.
- **Colour engine.** `src/lib/color.js` draws the cover art onto a 64×64 canvas, groups the
  pixels into colour buckets and picks 3 distinct dominant colours. These tint the vinyl, the
  glow behind it and the full-screen aura: pastel in light mode, smoky in dark mode.
- **Layouts.** Desktop shows a 3-column grid with the shelf nav, the library and the player.
  Tablets get a side drawer and phones get a bottom sheet.
- **Search.** Title search uses the YouTube Data API v3 with your own key, entered under
  **API Credentials**. Pasting a YouTube or YouTube Music link works without a key. Playlist
  links need a key.
- **Media Session.** Shows the title, artist and artwork on the OS media controls. Supports
  play, pause, next, previous, seek and lock-screen scrubbing.

## Limitations

- **Accounts are local to the browser.** There is no server. An account made on one device
  does not exist on another. On a shared browser, each profile's data is in its own keys, but
  `localStorage` is not encrypted. Anyone using that browser profile could read it with
  devtools, including a saved API key. Cross-device accounts need a backend such as Supabase or
  Firebase Auth.
- **Background playback is controlled by YouTube's embed.** It works in desktop browsers.
  iOS Safari usually pauses embedded YouTube when the screen locks or the tab goes to the
  background. Some Android browsers also show YouTube's own media session instead of
  AuraSpin's.
- **The YouTube player is hidden.** Check that this fits YouTube's API Terms of Service for your
  use before you deploy it publicly.
