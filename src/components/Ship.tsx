import { useId } from 'react';
import type { ShipConfig } from '../lib/ship';

// Original vector art for the spaceship. Everything is drawn on a 400×400 canvas,
// in layers: space scene → trail → engine flames → wings → body → decal → window → nose → companion.

const INK = '#1B2B44';
const ACCENT = '#C24A35';
const METAL = '#5B6670';
const GLASS = '#7CC6E0';
const GOLD = '#E0A43A';

const PAINT: Record<string, string> = {
  'paint-white': '#EEF2F5',
  'paint-teal': '#2E8B7E',
  'paint-orange': '#E07A3F',
  'paint-blue': '#3A5BA0',
  'paint-gold': '#D9A441',
};

const STARS: [number, number, number][] = [
  [30, 40, 1.6], [80, 90, 1.1], [120, 30, 1.4], [170, 60, 0.9], [260, 40, 1.5], [310, 70, 1.0], [360, 30, 1.7],
  [380, 120, 1.0], [340, 180, 1.4], [370, 250, 1.1], [330, 330, 1.6], [370, 380, 1.0], [40, 160, 1.3], [20, 240, 1.0],
  [60, 300, 1.5], [30, 370, 1.1], [110, 350, 0.9], [280, 370, 1.2], [90, 210, 0.8], [300, 250, 0.9], [250, 110, 0.8],
];

export function Ship({
  config,
  size = 400,
  float = false,
  label = 'Your spaceship',
}: {
  config: ShipConfig;
  size?: number;
  float?: boolean;
  label?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const paint = PAINT[config.paint ?? 'paint-white'] ?? PAINT['paint-white'];
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} role="img" aria-label={label} className="ship-svg">
      <Scene id={config.scene} uid={uid} />
      <g transform="translate(200 230) scale(1.18) translate(-200 -230)">
      <g className={float ? 'ship-float' : undefined}>
        <g transform="translate(0 -18) scale(1 0.9) translate(0 36)">
          <Trail id={config.trail} />
        </g>
        <Engine id={config.engine} />
        <Wings id={config.wings} />
        <Body paint={paint} gold={config.paint === 'paint-gold'} uid={uid} />
        <Decal id={config.decal} uid={uid} />
        <Window id={config.window} />
        <Nose id={config.nose} uid={uid} />
      </g>
      </g>
      <Companion id={config.companion} />
    </svg>
  );
}

// ── space scenes ───────────────────────────────────────────
function Scene({ id, uid }: { id?: string; uid: string }) {
  return (
    <g>
      <rect width="400" height="400" fill="#14213D" />
      {id === 'scene-nebula' && (
        <>
          <defs>
            <radialGradient id={`n1${uid}`}>
              <stop offset="0" stopColor="#8E6CC9" stopOpacity=".7" />
              <stop offset="1" stopColor="#8E6CC9" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`n2${uid}`}>
              <stop offset="0" stopColor="#2E8B7E" stopOpacity=".65" />
              <stop offset="1" stopColor="#2E8B7E" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`n3${uid}`}>
              <stop offset="0" stopColor="#E07A3F" stopOpacity=".5" />
              <stop offset="1" stopColor="#E07A3F" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="120" r="150" fill={`url(#n1${uid})`} />
          <circle cx="330" cy="300" r="160" fill={`url(#n2${uid})`} />
          <circle cx="310" cy="70" r="110" fill={`url(#n3${uid})`} />
        </>
      )}
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.55 + (i % 3) * 0.15} />
      ))}
      {id === 'scene-moon' && (
        <g>
          <path d="M0 338 Q200 296 400 338 V400 H0 Z" fill="#9A9DB0" />
          <path d="M0 352 Q200 316 400 352 V400 H0 Z" fill="#8C8FA3" />
          <ellipse cx="70" cy="370" rx="22" ry="7" fill="#7A7D92" />
          <ellipse cx="300" cy="362" rx="30" ry="8" fill="#7A7D92" />
          <ellipse cx="190" cy="384" rx="16" ry="5" fill="#7A7D92" />
          <rect x="330" y="300" width="34" height="22" rx="4" fill="#CFD8DE" stroke={INK} strokeWidth="2" />
          <path d="M326 300 Q347 278 368 300 Z" fill="#E9EEF2" stroke={INK} strokeWidth="2" />
          <rect x="342" y="308" width="10" height="14" fill={GLASS} />
        </g>
      )}
      {id === 'scene-saturn' && (
        <g>
          <ellipse cx="72" cy="96" rx="64" ry="15" fill="none" stroke="#F1D9A6" strokeWidth="6" transform="rotate(-18 72 96)" opacity=".9" />
          <circle cx="72" cy="96" r="34" fill="#E3B26B" />
          <path d="M40 88 Q72 80 104 88" stroke="#C99449" strokeWidth="5" fill="none" />
          <path d="M42 106 Q72 100 102 106" stroke="#C99449" strokeWidth="4" fill="none" />
          <path d="M10 112 A64 15 0 0 0 134 112" stroke="#F1D9A6" strokeWidth="6" fill="none" transform="rotate(-18 72 96)" opacity=".95" />
        </g>
      )}
      {id === 'scene-earth' && (
        <g>
          <circle cx="40" cy="390" r="130" fill="#9FD3E6" opacity=".35" />
          <circle cx="40" cy="390" r="120" fill="#2F6FB3" />
          <path d="M-20 300 C20 280 60 300 70 330 C80 360 40 370 20 350 C0 330 -30 340 -20 300 Z" fill="#3E9B5B" />
          <path d="M90 340 C120 330 150 350 140 380 C130 400 100 395 95 375 Z" fill="#3E9B5B" />
          <path d="M20 280 C40 270 70 272 90 285" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity=".6" fill="none" />
        </g>
      )}
    </g>
  );
}

// ── trails ─────────────────────────────────────────────────
function Trail({ id }: { id?: string }) {
  if (id === 'trail-rainbow') {
    const colors = ['#C24A35', '#E0A43A', '#2E8B7E', '#3A5BA0'];
    return (
      <g opacity=".85">
        {colors.map((c, i) => (
          <path
            key={c}
            d={`M${182 + i * 12} 330 C${172 + i * 12} 350 ${196 + i * 12} 370 ${184 + i * 12} 400`}
            stroke={c}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>
    );
  }
  if (id === 'trail-sparkle') {
    const pts: [number, number, number][] = [[176, 352, 7], [222, 362, 6], [196, 384, 8], [160, 380, 5], [236, 390, 5], [212, 340, 4]];
    return (
      <g fill="#FFE08A">
        {pts.map(([x, y, r], i) => (
          <path key={i} d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`} />
        ))}
      </g>
    );
  }
  return null;
}

// ── engines ────────────────────────────────────────────────
function Nozzle({ cx, w }: { cx: number; w: number }) {
  return (
    <path
      d={`M${cx - w / 2} 298 H${cx + w / 2} L${cx + w / 2 - 6} 318 H${cx - w / 2 + 6} Z`}
      fill={METAL}
      stroke={INK}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}
function Flame({ cx, w, len, outer = '#F2A33A', inner = '#FFE08A' }: { cx: number; w: number; len: number; outer?: string; inner?: string }) {
  return (
    <g className="flame">
      <path d={`M${cx - w / 2} 316 Q${cx} ${316 + len} ${cx + w / 2} 316 Z`} fill={outer} />
      <path d={`M${cx - w / 4} 316 Q${cx} ${316 + len * 0.6} ${cx + w / 4} 316 Z`} fill={inner} />
    </g>
  );
}
function Engine({ id }: { id?: string }) {
  switch (id) {
    case 'engine-twin':
      return (
        <g>
          <Flame cx={178} w={24} len={56} />
          <Flame cx={222} w={24} len={56} />
          <Nozzle cx={178} w={30} />
          <Nozzle cx={222} w={30} />
        </g>
      );
    case 'engine-plasma':
      return (
        <g>
          <Flame cx={200} w={44} len={92} outer="#5EC8F2" inner="#E6FBFF" />
          <Nozzle cx={200} w={52} />
        </g>
      );
    case 'engine-triple':
      return (
        <g>
          <Flame cx={168} w={22} len={58} />
          <Flame cx={200} w={26} len={72} />
          <Flame cx={232} w={22} len={58} />
          <Nozzle cx={168} w={26} />
          <Nozzle cx={200} w={30} />
          <Nozzle cx={232} w={26} />
        </g>
      );
    default:
      return (
        <g>
          <Flame cx={200} w={34} len={56} />
          <Nozzle cx={200} w={46} />
        </g>
      );
  }
}

// ── wings ──────────────────────────────────────────────────
function Pair({ d }: { d: string }) {
  return (
    <g fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d={d} />
      <path d={d} transform="translate(400 0) scale(-1 1)" />
    </g>
  );
}
function Wings({ id }: { id?: string }) {
  switch (id) {
    case 'wings-swept':
      return <Pair d="M154 196 L88 290 L94 312 L154 296 Z" />;
    case 'wings-twin':
      return (
        <g>
          <Pair d="M154 186 L114 222 L114 236 L154 230 Z" />
          <Pair d="M154 244 L104 296 L106 312 L154 300 Z" />
        </g>
      );
    case 'wings-solar':
      return (
        <g>
          <Pair d="M154 252 L118 296 L118 306 L154 300 Z" />
          {[0, 1].map((side) => (
            <g key={side} transform={side ? 'translate(400 0) scale(-1 1)' : undefined}>
              <path d="M154 204 H100" stroke={METAL} strokeWidth="5" />
              <rect x="40" y="184" width="62" height="40" rx="3" fill="#2F4F8F" stroke={INK} strokeWidth="3" />
              <path d="M61 184 V224 M82 184 V224 M40 204 H102" stroke="#9FB8E0" strokeWidth="2" />
            </g>
          ))}
        </g>
      );
    default:
      return <Pair d="M154 248 L116 296 L116 308 L154 300 Z" />;
  }
}

// ── body ───────────────────────────────────────────────────
function Body({ paint, gold, uid }: { paint: string; gold: boolean; uid: string }) {
  const d = 'M152 300 V178 C152 142 172 120 200 112 C228 120 248 142 248 178 V300 Z';
  return (
    <g>
      {gold && (
        <defs>
          <linearGradient id={`g${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor="#F3D27A" />
            <stop offset=".5" stopColor="#D9A441" />
            <stop offset="1" stopColor="#B98326" />
          </linearGradient>
        </defs>
      )}
      <path d={d} fill={gold ? `url(#g${uid})` : paint} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M226 128 C240 140 248 158 248 178 V300 H230 V180 C230 160 228 142 226 128 Z" fill="#000000" opacity=".08" />
      <rect x="152" y="284" width="96" height="16" fill="#D5DDD6" stroke={INK} strokeWidth="3" />
      <circle cx="166" cy="292" r="2.5" fill={METAL} />
      <circle cx="234" cy="292" r="2.5" fill={METAL} />
    </g>
  );
}

// ── decals ─────────────────────────────────────────────────
function Decal({ id, uid }: { id?: string; uid: string }) {
  switch (id) {
    case 'decal-stripes':
      return (
        <g fill={ACCENT}>
          <rect x="153.5" y="232" width="93" height="10" />
          <rect x="153.5" y="248" width="93" height="6" />
        </g>
      );
    case 'decal-number':
      return (
        <text x="200" y="266" textAnchor="middle" fontFamily="Lexend, system-ui, sans-serif" fontWeight="700" fontSize="26" fill={ACCENT}>
          114
        </text>
      );
    case 'decal-crescent':
      return (
        <g>
          <defs>
            <mask id={`c${uid}`}>
              <rect width="400" height="400" fill="#FFFFFF" />
              <circle cx="206" cy="244" r="14" fill="#000000" />
            </mask>
          </defs>
          <circle cx="198" cy="250" r="17" fill={GOLD} mask={`url(#c${uid})`} />
          <path
            d="M214 242 L216.4 247.6 L222.5 248.1 L217.9 252.1 L219.3 258 L214 254.9 L208.7 258 L210.1 252.1 L205.5 248.1 L211.6 247.6 Z"
            fill={GOLD}
            stroke={INK}
            strokeWidth="1.2"
            transform="translate(4 -2)"
          />
        </g>
      );
    default:
      return null;
  }
}

// ── windows ────────────────────────────────────────────────
function Porthole({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#CFD8DE" stroke={INK} strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.72} fill={GLASS} />
      <path d={`M${cx - r * 0.45} ${cy - r * 0.15} A${r * 0.5} ${r * 0.5} 0 0 1 ${cx - r * 0.05} ${cy - r * 0.48}`} stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}
function Window({ id }: { id?: string }) {
  switch (id) {
    case 'window-dome':
      return (
        <g>
          <ellipse cx="200" cy="176" rx="34" ry="30" fill="#CFD8DE" stroke={INK} strokeWidth="3" />
          <ellipse cx="200" cy="176" rx="26" ry="23" fill={GLASS} />
          <path d="M184 168 Q188 156 200 154" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'window-twin':
      return (
        <g>
          <Porthole cx={200} cy={162} r={17} />
          <Porthole cx={200} cy={206} r={13} />
        </g>
      );
    case 'window-hex':
      return (
        <g>
          <path d="M200 148 L224 162 L224 190 L200 204 L176 190 L176 162 Z" fill="#CFD8DE" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M200 156 L217 166 L217 186 L200 196 L183 186 L183 166 Z" fill={GLASS} />
          <path d="M190 168 L199 162" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    default:
      return <Porthole cx={200} cy={176} r={24} />;
  }
}

// ── noses ──────────────────────────────────────────────────
const CAP = 'M166 138 C170 114 184 102 200 99 C216 102 230 114 234 138 C214 130 186 130 166 138 Z';
function Nose({ id, uid }: { id?: string; uid: string }) {
  switch (id) {
    case 'nose-cone':
      return <path d="M164 142 L200 56 L236 142 C214 132 186 132 164 142 Z" fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case 'nose-antenna':
      return (
        <g>
          <path d="M200 100 V64" stroke={METAL} strokeWidth="4" />
          <path d="M182 60 Q200 82 218 60" stroke={INK} strokeWidth="3" fill="#CFD8DE" />
          <circle cx="200" cy="58" r="4" fill={GOLD} />
          <path d={CAP} fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
    case 'nose-beacon':
      return (
        <g>
          <defs>
            <radialGradient id={`b${uid}`}>
              <stop offset="0" stopColor="#FFE08A" stopOpacity=".9" />
              <stop offset="1" stopColor="#FFE08A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="80" r="34" fill={`url(#b${uid})`} className="beacon-glow" />
          <path d="M200 101 V92" stroke={METAL} strokeWidth="4" />
          <path
            d="M200 62 L204.7 73.5 L217 74.3 L207.6 82.3 L210.6 94.3 L200 87.8 L189.4 94.3 L192.4 82.3 L183 74.3 L195.3 73.5 Z"
            fill="#FFE08A"
            stroke={GOLD}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d={CAP} fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
    default:
      return <path d={CAP} fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
  }
}

// ── companions ─────────────────────────────────────────────
function Companion({ id }: { id?: string }) {
  switch (id) {
    case 'companion-satellite':
      return (
        <g className="orbit">
          <path d="M310 118 H284 M334 118 H360" stroke={METAL} strokeWidth="3" />
          <rect x="262" y="108" width="24" height="20" rx="2" fill="#2F4F8F" stroke={INK} strokeWidth="2.5" />
          <rect x="358" y="108" width="24" height="20" rx="2" fill="#2F4F8F" stroke={INK} strokeWidth="2.5" />
          <rect x="308" y="104" width="28" height="28" rx="5" fill="#CFD8DE" stroke={INK} strokeWidth="2.5" />
          <path d="M322 104 V92 M314 88 Q322 98 330 88" stroke={INK} strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'companion-drone':
      return (
        <g className="orbit">
          <path d="M300 104 H344" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M322 104 V112" stroke={INK} strokeWidth="3" />
          <ellipse cx="322" cy="128" rx="20" ry="16" fill="#EEF2F5" stroke={INK} strokeWidth="3" />
          <path d="M304 130 H340" stroke="#C5D0C8" strokeWidth="3" />
          <circle cx="322" cy="140" r="3.5" fill="#5EC8F2" className="blink" />
        </g>
      );
    case 'companion-moon':
      return (
        <g>
          <ellipse cx="200" cy="210" rx="176" ry="44" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 7" opacity=".35" transform="rotate(-14 200 210)" />
          <g className="orbit">
            <circle cx="334" cy="150" r="22" fill="#C9CCD8" stroke={INK} strokeWidth="2.5" />
            <circle cx="326" cy="144" r="5" fill="#A9ADBD" />
            <circle cx="341" cy="158" r="3.5" fill="#A9ADBD" />
            <circle cx="338" cy="140" r="2.5" fill="#A9ADBD" />
          </g>
        </g>
      );
    default:
      return null;
  }
}
