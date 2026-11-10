const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const make = (paths) =>
  function Icon({ size = 20, className = '', ...rest }) {
    return (
      <svg {...base} width={size} height={size} className={className} {...rest}>
        {paths}
      </svg>
    );
  };

export const IconPlay = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.4 0-1.8l-10-6.4C8.9 4.3 8 4.8 8 5.6Z" />
  </svg>
);
export const IconPause = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <rect x="6" y="5" width="4.2" height="14" rx="1.3" />
    <rect x="13.8" y="5" width="4.2" height="14" rx="1.3" />
  </svg>
);
export const IconNext = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M5 6.6v10.8c0 .8.9 1.3 1.6.8l7.6-5.4c.6-.4.6-1.2 0-1.6L6.6 5.8C5.9 5.3 5 5.8 5 6.6Z" />
    <rect x="16" y="5.5" width="3" height="13" rx="1.2" />
  </svg>
);
export const IconPrev = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M19 6.6v10.8c0 .8-.9 1.3-1.6.8l-7.6-5.4c-.6-.4-.6-1.2 0-1.6l7.6-5.4c.7-.5 1.6 0 1.6.8Z" />
    <rect x="5" y="5.5" width="3" height="13" rx="1.2" />
  </svg>
);
export const IconShuffle = make(
  <>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </>
);
export const IconRepeat = make(
  <>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </>
);
export const IconVolume = make(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 5a10 10 0 0 1 0 14" />
  </>
);
export const IconMute = make(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </>
);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
);
export const IconPlus = make(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);
export const IconCheck = make(<path d="M20 6 9 17l-5-5" />);
export const IconX = make(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);
export const IconFolder = make(
  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6c.7 0 1.3.3 1.8.8l1 1.1c.4.4 1 .6 1.6.6h5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
);
export const IconFolderPlus = make(
  <>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6c.7 0 1.3.3 1.8.8l1 1.1c.4.4 1 .6 1.6.6h5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
    <path d="M12 11v5" />
    <path d="M9.5 13.5h5" />
  </>
);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);
export const IconMoon = make(<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />);
export const IconKey = make(
  <>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.8-9.8" />
    <path d="m16 7 3 3" />
    <path d="m18.5 4.5 2 2" />
  </>
);
export const IconLogout = make(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>
);
export const IconMenu = make(
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h10" />
  </>
);
export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4h6v3" />
  </>
);
export const IconPencil = make(
  <>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </>
);
export const IconLink = make(
  <>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </>
);
export const IconChevronUp = make(<path d="m18 15-6-6-6 6" />);
export const IconChevron = make(<path d="m9 6 6 6-6 6" />);
export const IconCompass = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </>
);
export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>
);
export const IconDisc = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
  </>
);
export const IconExpand = make(
  <>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="m21 3-7 7" />
    <path d="m3 21 7-7" />
  </>
);
export const IconShrink = make(
  <>
    <path d="M4 14h6v6" />
    <path d="M20 10h-6V4" />
    <path d="m14 10 7-7" />
    <path d="m3 21 7-7" />
  </>
);
export const IconYouTube = make(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="4" />
    <path d="m10 9.2 5 2.8-5 2.8Z" fill="currentColor" />
  </>
);
export const IconQueue = make(
  <>
    <path d="M3 6h13M3 12h13M3 18h8" />
    <path d="M17 15v6l4-3-4-3Z" />
  </>
);
