/** One readable item: a letter, syllable, word or the opening letters of a surah. */
export interface Item {
  t: string; // Arabic text
  /** Quran word position (surah, ayah, word), for word-by-word audio. */
  w?: [number, number, number];
  /** How to say it, for the disconnected letters (e.g. "Alif · Lām · Mīm"). */
  say?: string;
}

export interface Row {
  kind: 'items' | 'verse';
  label?: string;
  /** 'review' = a row from an earlier lesson, 'tricky' = past mistakes, 'spot' = find-it in a known surah. */
  tag?: 'review' | 'tricky' | 'spot';
  items: Item[];
  /** For verses: the reference, so the reciter's audio can be played. */
  ref?: { surah: number; ayah: number };
  /** Spot-it rows: what to look for and how many there are. */
  find?: { what: string; count: number };
}

export interface Page {
  lesson: number;
  page: number;
  title: string;
  hint: string;
  rows: Row[];
  /** Large letters (lessons 1–3) or normal text size. */
  size: 'xl' | 'lg' | 'md';
}

export interface ReadingOptions {
  spell: boolean; // 1. listen, spell, read, record
  todayCard: boolean; // 2. the page appears on Today
  reviewRow: boolean; // 4. one row from an earlier lesson
  tricky: boolean; // 5. past mistakes come back
  spotIt: boolean; // 6. spot it in a known surah
  wordAudio: boolean; // Quran.com word-by-word audio on Quran words
  shipLights: boolean; // 8. ship reward per lesson
}

export const DEFAULT_OPTIONS: ReadingOptions = {
  spell: true,
  todayCard: true,
  reviewRow: true,
  tricky: true,
  spotIt: true,
  wordAudio: true,
  shipLights: true,
};

export interface ReadingSettings {
  child_id: string;
  active: boolean;
  opened: number[];
  options: Partial<ReadingOptions>;
}
