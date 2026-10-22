import type { ReactNode } from 'react';

type P = { size?: number; className?: string };

function Svg({ size = 22, className, children, fill = 'none' }: P & { children: ReactNode; fill?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconHeadphones = (p: P) => (
  <Svg {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </Svg>
);
export const IconMic = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Svg>
);
export const IconMicOff = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 11.5 5.4" />
    <path d="M12 18v3" />
    <path d="M3 3l18 18" />
  </Svg>
);
export const IconPlay = (p: P) => (
  <Svg {...p} fill="currentColor">
    <path d="M8 5v14l11-7z" stroke="none" />
  </Svg>
);
export const IconPause = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconStop = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconPrev = (p: P) => (
  <Svg {...p}>
    <path d="M18 6l-8 6 8 6z" fill="currentColor" />
    <path d="M6 6v12" />
  </Svg>
);
export const IconNext = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l8 6-8 6z" fill="currentColor" />
    <path d="M18 6v12" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconRedo = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4v4h4" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IconCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
  </Svg>
);
export const IconStar = (p: P & { filled?: boolean }) => (
  <svg aria-hidden="true" width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" className={p.className}>
    <path
      d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
      fill={p.filled === false ? 'none' : '#E0A43A'}
      stroke="#B7832B"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </svg>
);
export const IconFlame = (p: P) => (
  <Svg {...p}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.4-5 3.5-7.5.6 1.6 1.4 2.5 2.6 3 .2-2.8 1.4-5.3 3.4-7 .4 3.3 3.5 5.6 3.5 10.5 0 3.9-2.6 7-6.5 7z" />
  </Svg>
);
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z" />
    <path d="M12 6v14" />
  </Svg>
);
export const IconRepeat = (p: P) => (
  <Svg {...p}>
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11V9a3 3 0 0 1 3-3h13" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 13v2a3 3 0 0 1-3 3H4" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconForward = (p: P) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4l16 16" />
  </Svg>
);
export const IconSend = (p: P) => (
  <Svg {...p}>
    <path d="M4 12l16-8-6 16-2.5-6.5z" />
  </Svg>
);
export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v10h12V10" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconWifiOff = (p: P) => (
  <Svg {...p}>
    <path d="M2 8.5a15 15 0 0 1 20 0" />
    <path d="M5.5 12a10 10 0 0 1 13 0" />
    <path d="M9 15.5a5 5 0 0 1 6 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
    <path d="M3 3l18 18" />
  </Svg>
);
export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M15 4h4v16h-4" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h10" />
  </Svg>
);
export const IconTodayCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
  </Svg>
);
export const IconInbox = (p: P) => (
  <Svg {...p}>
    <path d="M4 13l2.5-8h11L20 13v6H4z" />
    <path d="M4 13h5l1 2h4l1-2h5" />
  </Svg>
);
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </Svg>
);

/** The eight-point star medallion with a number inside. */
export function Medallion({ n, tone = 'teal', size = 50 }: { n: number | string; tone?: 'teal' | 'gold' | 'plum'; size?: number }) {
  const fill = tone === 'gold' ? '#F2E6CF' : tone === 'plum' ? '#EAE3F4' : '#DCEBE5';
  const fg = tone === 'gold' ? '#6B4A12' : tone === 'plum' ? '#5A3E8A' : '#1E5E54';
  return (
    <span className="medallion" style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 50 50">
        <rect x="10" y="10" width="30" height="30" rx="4" fill={fill} />
        <rect x="10" y="10" width="30" height="30" rx="4" fill={fill} transform="rotate(45 25 25)" />
      </svg>
      <span style={{ color: fg }}>{n}</span>
    </span>
  );
}

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span className="medallion" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect x="10" y="10" width="28" height="28" rx="4" fill="#1E5E54" />
        <rect x="10" y="10" width="28" height="28" rx="4" fill="#1E5E54" transform="rotate(45 24 24)" />
      </svg>
      <span style={{ color: '#fff', display: 'flex' }}>
        <IconBook size={size * 0.42} />
      </span>
    </span>
  );
}

export const IconRocket = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.5c3 2 4.5 5.2 4.5 9.2V16h-9v-4.3c0-4 1.5-7.2 4.5-9.2z" />
    <circle cx="12" cy="9.5" r="1.8" />
    <path d="M7.5 13l-3 3.5V19l3-1.5M16.5 13l3 3.5V19l-3-1.5" />
    <path d="M10 18.5c.5 1.5 1.2 2.5 2 3 .8-.5 1.5-1.5 2-3" />
  </Svg>
);

/** A crystal: the spending money for the spaceship (colored, not a stroke icon). */
export function IconGem({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path d="M7 3.5h10l4 5-9 12.5-9-12.5z" fill="#5EC8F2" stroke="#2F6FB3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 8.5h18M9.5 3.5 8 8.5l4 12.5 4-12.5-1.5-5" fill="none" stroke="#2F6FB3" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8.2 5.2 7 7.6" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
