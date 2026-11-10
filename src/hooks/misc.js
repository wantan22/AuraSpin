import { useEffect, useState } from 'react';
import { DEFAULT_PALETTE, extractPalette } from '../lib/color.js';

export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export function useBreakpoint() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const tablet = useMediaQuery('(min-width: 768px)');
  return desktop ? 'desktop' : tablet ? 'tablet' : 'mobile';
}

/** Applies the effective theme to <html>. `pref` is 'light' | 'dark' | null (null = follow OS). */
export function useAppliedTheme(pref) {
  const osDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = pref ? pref === 'dark' : osDark;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  return dark;
}

export function usePalette(src, seed) {
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  useEffect(() => {
    let alive = true;
    if (!src) {
      setPalette(DEFAULT_PALETTE);
      return undefined;
    }
    extractPalette(src, seed).then((p) => alive && setPalette(p));
    return () => {
      alive = false;
    };
  }, [src, seed]);
  return palette;
}

export const fmtTime = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};
