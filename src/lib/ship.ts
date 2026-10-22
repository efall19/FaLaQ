// Spaceship parts and prices.
// The SQL seed in supabase/003_spaceship.sql is generated from this list
// (scripts/gen-shop-sql.mjs), so prices here and in the database always match.

export type Slot = 'paint' | 'nose' | 'window' | 'wings' | 'engine' | 'decal' | 'companion' | 'trail' | 'scene';

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number; // 0 = free starting part
}

export const SLOTS: { slot: Slot; label: string; optional: boolean }[] = [
  { slot: 'paint', label: 'Paint', optional: false },
  { slot: 'nose', label: 'Nose', optional: false },
  { slot: 'window', label: 'Window', optional: false },
  { slot: 'wings', label: 'Wings', optional: false },
  { slot: 'engine', label: 'Engine', optional: false },
  { slot: 'decal', label: 'Decals', optional: true },
  { slot: 'companion', label: 'Companion', optional: true },
  { slot: 'trail', label: 'Trail', optional: true },
  { slot: 'scene', label: 'Space', optional: false },
];

export const CATALOG: ShopItem[] = [
  { id: 'paint-white', slot: 'paint', name: 'Classic white', price: 0 },
  { id: 'paint-teal', slot: 'paint', name: 'Ocean teal', price: 20 },
  { id: 'paint-orange', slot: 'paint', name: 'Sunset orange', price: 20 },
  { id: 'paint-blue', slot: 'paint', name: 'Royal blue', price: 30 },
  { id: 'paint-gold', slot: 'paint', name: 'Pure gold', price: 150 },

  { id: 'nose-cap', slot: 'nose', name: 'Round cap', price: 0 },
  { id: 'nose-cone', slot: 'nose', name: 'Pointed cone', price: 25 },
  { id: 'nose-antenna', slot: 'nose', name: 'Antenna dish', price: 45 },
  { id: 'nose-beacon', slot: 'nose', name: 'Star beacon', price: 70 },

  { id: 'window-round', slot: 'window', name: 'Round window', price: 0 },
  { id: 'window-dome', slot: 'window', name: 'Big dome', price: 30 },
  { id: 'window-twin', slot: 'window', name: 'Twin portholes', price: 40 },
  { id: 'window-hex', slot: 'window', name: 'Hexagon window', price: 60 },

  { id: 'wings-fins', slot: 'wings', name: 'Small fins', price: 0 },
  { id: 'wings-swept', slot: 'wings', name: 'Swept wings', price: 50 },
  { id: 'wings-solar', slot: 'wings', name: 'Solar panels', price: 80 },
  { id: 'wings-twin', slot: 'wings', name: 'Double wings', price: 100 },

  { id: 'engine-single', slot: 'engine', name: 'Single thruster', price: 0 },
  { id: 'engine-twin', slot: 'engine', name: 'Twin boosters', price: 60 },
  { id: 'engine-plasma', slot: 'engine', name: 'Blue plasma', price: 90 },
  { id: 'engine-triple', slot: 'engine', name: 'Triple thrusters', price: 140 },

  { id: 'decal-stripes', slot: 'decal', name: 'Racing stripes', price: 15 },
  { id: 'decal-number', slot: 'decal', name: 'Number 114', price: 25 },
  { id: 'decal-crescent', slot: 'decal', name: 'Crescent & star', price: 35 },

  { id: 'companion-satellite', slot: 'companion', name: 'Satellite', price: 80 },
  { id: 'companion-drone', slot: 'companion', name: 'Helper drone', price: 120 },
  { id: 'companion-moon', slot: 'companion', name: 'Little moon', price: 160 },

  { id: 'trail-sparkle', slot: 'trail', name: 'Sparkle trail', price: 40 },
  { id: 'trail-rainbow', slot: 'trail', name: 'Rainbow trail', price: 110 },

  { id: 'scene-stars', slot: 'scene', name: 'Starry sky', price: 0 },
  { id: 'scene-moon', slot: 'scene', name: 'Moon base', price: 70 },
  { id: 'scene-saturn', slot: 'scene', name: 'Ringed planet', price: 90 },
  { id: 'scene-nebula', slot: 'scene', name: 'Nebula', price: 120 },
  { id: 'scene-earth', slot: 'scene', name: 'Earth view', price: 200 },
];

export type ShipConfig = Partial<Record<Slot, string>>;

export const DEFAULT_SHIP: ShipConfig = {
  paint: 'paint-white',
  nose: 'nose-cap',
  window: 'window-round',
  wings: 'wings-fins',
  engine: 'engine-single',
  scene: 'scene-stars',
};

export const itemById = (id: string | undefined) => CATALOG.find((i) => i.id === id);

/** Equipped parts on top of the free defaults. A null value means "nothing" for optional slots. */
export function resolveShip(equipped: Record<string, string | null> | null | undefined): ShipConfig {
  const out: ShipConfig = { ...DEFAULT_SHIP };
  for (const [slot, id] of Object.entries(equipped ?? {})) {
    if (id === null) delete out[slot as Slot];
    else if (itemById(id)?.slot === slot) out[slot as Slot] = id;
  }
  return out;
}

// Rewards, mirrored from the database rules (supabase/003_spaceship.sql).
export const CRYSTALS_BY_ATTEMPT = (attempt: number) => (attempt <= 1 ? 3 : attempt === 2 ? 2 : 1);
export const DAY_BONUS = 5;
