// The 17 reading lessons, in the order and difficulty of Al-Qaida An-Nouraniyah.
// Drill rows are generated from the letters and marks; word rows use real Quran
// words (Quran.com text) that contain only what has been taught so far.

import { getVerses } from '../quran';
import {
  DAGGER_ALIF,
  DAMMA,
  DAMMATAN,
  FATHA,
  FATHATAN,
  KASRA,
  KASRATAN,
  LETTERS,
  QALQALAH,
  SHADDA,
  SHORT,
  SMALL_WAW,
  SMALL_YA,
  SUKUN,
  TANWEEN,
  TATWEEL,
  VOWEL_LETTERS,
  classify,
  cleanWord,
  hasLetters,
  syl,
  type WordInfo,
} from './arabic';
import type { Item, Page, ReadingOptions, Row } from './types';

export interface LessonMeta {
  n: number;
  ar: string;
  en: string;
  learns: string;
  practice: boolean;
  pages: number; // fixed page count (practice lessons: pages keep coming)
  passRule: string;
  /** What to look for in a known surah on the "Spot it" page. */
  spot?: { what: string; test: (w: string, info: WordInfo) => boolean };
}

const PRACTICE_RULE = 'Two pages in a row approved at the first attempt';

export const LESSONS: LessonMeta[] = [
  { n: 1, ar: 'حروف الهجاء المفردة', en: 'Single letters', learns: 'The 28 letters and hamza, by name and sound', practice: false, pages: 6, passRule: 'Reads every row without mixing up the look-alike pairs' },
  { n: 2, ar: 'حروف الهجاء المركبة', en: 'Joined letters', learns: "Each letter's start, middle and end shapes", practice: false, pages: 4, passRule: 'Names each letter in a joined group' },
  { n: 3, ar: 'الحروف المقطعة', en: 'Disconnected letters', learns: 'The 14 openings of 29 surahs, read by letter names', practice: false, pages: 4, passRule: 'Reads all 14 with the right names and lengths' },
  { n: 4, ar: 'الحروف المتحركة', en: 'Short vowels', learns: 'Fatḥa, kasra and ḍamma on every letter', practice: false, pages: 6, passRule: 'Even pace, no vowel swaps', spot: { what: 'words with a ḍamma ( ُ )', test: (w) => w.includes(DAMMA) } },
  { n: 5, ar: 'الحروف المنونة', en: 'Tanween', learns: 'The -an, -in, -un endings', practice: false, pages: 6, passRule: 'Clear final -n', spot: { what: 'words ending in tanween', test: (_w, i) => i.tanween } },
  { n: 6, ar: 'تدريبات على الحركات والتنوين', en: 'Practice: vowels and tanween', learns: 'Lessons 4–5 mixed', practice: true, pages: 2, passRule: PRACTICE_RULE },
  { n: 7, ar: 'الألف والياء والواو الصغيرة', en: 'Small alif, ya and waw', learns: 'Small letters that are read long', practice: false, pages: 4, passRule: 'Stretches them two counts', spot: { what: 'words with a small alif, waw or ya', test: (_w, i) => i.small } },
  { n: 8, ar: 'حروف المد واللين', en: 'Long vowels and soft sounds', learns: 'ا و ي as long vowels (two counts); the soft aw / ay', practice: false, pages: 6, passRule: 'Long vowels two counts, soft sounds short', spot: { what: 'words with a long vowel', test: (_w, i) => i.madd } },
  { n: 9, ar: 'تدريبات', en: 'Practice: lessons 4–8', learns: 'Everything so far', practice: true, pages: 2, passRule: PRACTICE_RULE },
  { n: 10, ar: 'السكون', en: 'Sukun', learns: 'Closed syllables; the bounce (qalqalah) on ق ط ب ج د', practice: false, pages: 6, passRule: 'Clean stop on the silent letter; bounce where needed', spot: { what: 'words with a sukun', test: (_w, i) => i.sukun } },
  { n: 11, ar: 'تدريبات على السكون', en: 'Practice: sukun', learns: 'Sukun in words', practice: true, pages: 2, passRule: PRACTICE_RULE },
  { n: 12, ar: 'الشدة', en: 'Shadda', learns: 'Doubled letters; the nasal hum (ghunna) on نّ and مّ', practice: false, pages: 5, passRule: 'Clear doubling; ghunna held two counts', spot: { what: 'words with a shadda ( ّ )', test: (_w, i) => i.shaddas > 0 } },
  { n: 13, ar: 'تدريبات على الشدة', en: 'Practice: shadda', learns: 'Shadda in words', practice: true, pages: 2, passRule: PRACTICE_RULE },
  { n: 14, ar: 'الشدة والسكون', en: 'Shadda and sukun', learns: 'Both in the same word', practice: false, pages: 4, passRule: 'Reads them without slowing down', spot: { what: 'words with both a shadda and a sukun', test: (_w, i) => i.shaddas > 0 && i.sukun } },
  { n: 15, ar: 'الشدتان في كلمة', en: 'Two shaddas in a word', learns: 'Two doubled letters in one word', practice: false, pages: 3, passRule: 'Both doublings heard', spot: { what: 'words with two shaddas', test: (_w, i) => i.shaddas >= 2 } },
  { n: 16, ar: 'الشدة والسكون مع المد', en: 'With long vowels', learns: 'Shadda and sukun next to long vowels', practice: false, pages: 4, passRule: 'Right lengths throughout', spot: { what: 'words with the long-stretch sign ( ٓ )', test: (w) => w.includes('ٓ') } },
  { n: 17, ar: 'تدريبات عامة', en: 'Reading verses', learns: 'Everything together, on verses not memorized', practice: true, pages: 2, passRule: 'Two pages of new verses in a row read correctly at the first attempt' },
];

export const lessonMeta = (n: number) => LESSONS[n - 1];

// ── deterministic randomness ───────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: T[], seed: number): T[] {
  const r = rng(seed);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function pick<T>(list: T[], seed: number): T {
  return list[Math.floor(rng(seed)() * list.length)];
}
function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const items = (list: string[]): Item[] => list.map((t) => ({ t }));
const rowsOf = (list: string[], size: number, label?: string): Row[] =>
  chunk(list, size).map((c, i) => ({ kind: 'items', items: items(c), label: i === 0 ? label : undefined }));

// ── Quran word pool ────────────────────────────────────────

export interface PoolWord {
  t: string;
  w?: [number, number, number];
  info: WordInfo;
  letters: number;
}
export interface PoolVerse {
  surah: number;
  ayah: number;
  words: Item[];
  infos: WordInfo[];
}
export interface Pool {
  words: PoolWord[];
  verses: PoolVerse[];
}

/** Al-Fatiha, then juz 29 and 30: short words and verses Adam will meet first. */
export const POOL_CHAPTERS = [1, ...Array.from({ length: 48 }, (_, i) => 67 + i)];

let poolPromise: Promise<Pool> | null = null;

export function loadPool(): Promise<Pool> {
  if (poolPromise) return poolPromise;
  poolPromise = (async () => {
    const seen = new Set<string>();
    const words: PoolWord[] = [];
    const verses: PoolVerse[] = [];
    // A few at a time, so a slow connection isn't flooded.
    const chapters = POOL_CHAPTERS.slice();
    const results = new Map<number, Awaited<ReturnType<typeof getVerses>>>();
    for (const group of chunk(chapters, 8)) {
      const got = await Promise.all(group.map((s) => getVerses(s).catch(() => null)));
      group.forEach((s, i) => got[i] && results.set(s, got[i]!));
    }
    for (const s of chapters) {
      const vs = results.get(s);
      if (!vs) continue;
      for (const v of vs) {
        const tokens = v.text.split(/\s+/).filter(Boolean);
        let pos = 0;
        let positionsSafe = true; // a waqf sign written as its own token makes positions uncertain
        const vWords: Item[] = [];
        const vInfos: WordInfo[] = [];
        for (const tok of tokens) {
          if (!hasLetters(tok)) {
            positionsSafe = false;
            continue;
          }
          pos++;
          const t = cleanWord(tok);
          const info = classify(t);
          const ref: [number, number, number] | undefined = positionsSafe ? [s, v.n, pos] : undefined;
          vWords.push({ t, w: ref });
          vInfos.push(info);
          if (info.level < 99 && !seen.has(t)) {
            seen.add(t);
            words.push({ t, w: ref, info, letters: t.replace(/[^ء-يٱ]/g, '').length });
          }
        }
        verses.push({ surah: s, ayah: v.n, words: vWords, infos: vInfos });
      }
    }
    if (!words.length) throw new Error('Could not load Quran words');
    return { words, verses };
  })();
  poolPromise.catch(() => {
    poolPromise = null;
  });
  return poolPromise;
}

/** Words for a lesson page: a slice of the filtered pool, different on every page. */
function wordsFor(pool: Pool, lesson: number, page: number, count: number, test: (w: PoolWord) => boolean): Item[] {
  const list = shuffle(pool.words.filter(test), lesson * 7349);
  if (!list.length) return [];
  const start = ((page - 1) * count) % list.length;
  const out: PoolWord[] = [];
  for (let i = 0; i < Math.min(count, list.length); i++) out.push(list[(start + i) % list.length]);
  return out.map((w) => ({ t: w.t, w: w.w }));
}

const wordRows = (list: Item[], size = 4, label = 'Quran words'): Row[] =>
  chunk(list, size).map((c, i) => ({ kind: 'items', items: c, label: i === 0 ? label : undefined }));

// ── the 14 disconnected-letter openings ────────────────────

const OPENINGS: { ref: [number, number]; say: string; whole?: boolean }[] = [
  { ref: [2, 1], say: 'Alif · Lām · Mīm', whole: true },
  { ref: [7, 1], say: 'Alif · Lām · Mīm · Ṣād', whole: true },
  { ref: [10, 1], say: 'Alif · Lām · Rā' },
  { ref: [13, 1], say: 'Alif · Lām · Mīm · Rā' },
  { ref: [19, 1], say: 'Kāf · Hā · Yā · ʿAyn · Ṣād', whole: true },
  { ref: [20, 1], say: 'Ṭā · Hā', whole: true },
  { ref: [26, 1], say: 'Ṭā · Sīn · Mīm', whole: true },
  { ref: [27, 1], say: 'Ṭā · Sīn' },
  { ref: [36, 1], say: 'Yā · Sīn', whole: true },
  { ref: [38, 1], say: 'Ṣād' },
  { ref: [40, 1], say: 'Ḥā · Mīm', whole: true },
  { ref: [42, 2], say: 'ʿAyn · Sīn · Qāf', whole: true },
  { ref: [50, 1], say: 'Qāf' },
  { ref: [68, 1], say: 'Nūn' },
];

let openingsPromise: Promise<Item[]> | null = null;
export function loadOpenings(): Promise<Item[]> {
  openingsPromise ??= openingItems();
  return openingsPromise;
}
async function openingItems(): Promise<Item[]> {
  const out: Item[] = [];
  for (const o of OPENINGS) {
    const [s, a] = o.ref;
    try {
      const vs = await getVerses(s);
      const v = vs.find((x) => x.n === a);
      if (!v) continue;
      const first = v.text.split(/\s+/).filter(hasLetters)[0];
      out.push({ t: o.whole ? v.text.trim() : first, say: o.say, w: [s, a, 1] });
    } catch {
      /* skip if it can't load */
    }
  }
  return out;
}

// ── page builders ─────────────────────────────────────────

const L1_GROUPS = [
  ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
  ['د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص'],
  ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق'],
  ['ك', 'ل', 'م', 'ن', 'و', 'ه', 'ء', 'ي'],
];
const LOOK_ALIKE = ['ب ت ث', 'ج ح خ', 'د ذ', 'ر ز', 'س ش', 'ص ض', 'ط ظ', 'ع غ', 'ف ق'];
const SOUND_ALIKE = ['ء ع', 'ح ه', 'س ص', 'ت ط', 'ذ ز ظ', 'ك ق', 'د ض'];
const NON_JOINING = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ء']);

function forms(ch: string): string[] {
  if (ch === 'ء') return ['ء'];
  if (NON_JOINING.has(ch)) return [ch, TATWEEL + ch];
  return [ch, ch + TATWEEL, TATWEEL + ch + TATWEEL, TATWEEL + ch];
}

const JOINERS = LETTERS.map((l) => l.ch).filter((c) => !NON_JOINING.has(c));
const ALL_LETTERS = LETTERS.map((l) => l.ch).filter((c) => c !== 'ء');

function randomGroup(seed: number, n: number): string {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    // keep most letters joining so the shapes change
    const from = i < n - 1 && r() < 0.8 ? JOINERS : ALL_LETTERS;
    s += from[Math.floor(r() * from.length)];
  }
  return s;
}

function chain(seed: number, n: number, marks: string[], last?: string[]): string {
  const r = rng(seed);
  let s = '';
  const letters = VOWEL_LETTERS.filter((c) => c !== 'أ');
  for (let i = 0; i < n; i++) {
    const L = i === 0 && r() < 0.3 ? 'أ' : letters[Math.floor(r() * letters.length)];
    const m = i === n - 1 && last ? last[Math.floor(r() * last.length)] : marks[Math.floor(r() * marks.length)];
    s += syl(L, m);
  }
  return s;
}

const vowelRow = (letters: string[], mark: string) => letters.map((c) => syl(c, mark));
const SUKUN_LETTERS = VOWEL_LETTERS.filter((c) => c !== 'أ');

export interface BuildContext {
  pool: Pool | null; // null for lessons 1–3, which need no Quran words
  openings?: Item[];
  /** Verses of surahs Adam knows, for "Spot it". */
  known: PoolVerse[];
  /** Surahs Adam knows (not used for lesson 17). */
  knownSurahs: Set<number>;
  options: ReadingOptions;
  /** Past mistakes not yet cleared, newest first. */
  tricky: string[];
}

function spotLessonHasPage(lesson: number, options: ReadingOptions, hasKnown: boolean): boolean {
  return !!lessonMeta(lesson).spot && options.spotIt && hasKnown;
}

/** True when Adam knows at least one surah that the word pool covers (needed for "Spot it"). */
export function knowsPoolSurah(knownSurahs: Iterable<number>): boolean {
  for (const s of knownSurahs) if (POOL_CHAPTERS.includes(s)) return true;
  return false;
}

/** Number of pages in a lesson (practice lessons: the minimum; more keep coming). */
export function pageCount(lesson: number, options: ReadingOptions, hasKnown: boolean): number {
  const m = lessonMeta(lesson);
  return m.pages + (spotLessonHasPage(lesson, options, hasKnown) ? 1 : 0);
}

function basePage(lesson: number, page: number, ctx: BuildContext): Omit<Page, 'lesson' | 'page'> {
  const seed = lesson * 1009 + page * 7919;
  const pool = ctx.pool;
  const meta = lessonMeta(lesson);

  // Last page of a lesson with "Spot it": a verse from a surah Adam knows.
  if (!meta.practice && page === meta.pages + 1 && spotLessonHasPage(lesson, ctx.options, knowsPoolSurah(ctx.knownSurahs))) {
    const spot = meta.spot!;
    const fits = ctx.known.filter((v) => {
      const n = v.words.filter((w, i) => spot.test(w.t, v.infos[i])).length;
      return n >= 1 && n <= 5 && v.words.length <= 14;
    });
    const v = fits.length ? pick(fits, seed) : null;
    if (v) {
      const count = v.words.filter((w, i) => spot.test(w.t, v.infos[i])).length;
      return {
        title: 'Spot it in your surah',
        hint: `Find the ${spot.what} in this verse you know, point to each one, then read the verse.`,
        size: 'md',
        rows: [{ kind: 'verse', tag: 'spot', items: v.words, ref: { surah: v.surah, ayah: v.ayah }, find: { what: spot.what, count } }],
      };
    }
  }

  switch (lesson) {
    case 1: {
      if (page <= 4) {
        const g = L1_GROUPS[page - 1];
        const rows: Row[] = [...rowsOf(g, 4, 'New letters'), ...rowsOf(shuffle(g, seed), 4, 'Mixed')];
        if (page > 1) rows.push(...rowsOf(shuffle(L1_GROUPS.slice(0, page - 1).flat(), seed + 1).slice(0, 6), 6, 'Earlier letters'));
        return { title: `Letters ${g[0]} to ${g[g.length - 1]}`, hint: 'Say the name of each letter, right to left.', size: 'xl', rows };
      }
      if (page === 5) {
        return {
          title: 'Look-alike and sound-alike letters',
          hint: 'Look at the dots, and listen for the difference.',
          size: 'xl',
          rows: [
            ...chunk(LOOK_ALIKE, 3).map((c, i) => ({ kind: 'items' as const, items: items(c), label: i === 0 ? 'Same shape, different dots' : undefined })),
            ...chunk(SOUND_ALIKE, 4).map((c, i) => ({ kind: 'items' as const, items: items(c), label: i === 0 ? 'Similar sounds' : undefined })),
          ],
        };
      }
      return { title: 'All the letters, mixed', hint: 'Say the name of each letter.', size: 'xl', rows: rowsOf(shuffle(L1_GROUPS.flat(), seed), 6, 'Mixed') };
    }

    case 2: {
      if (page === 1) {
        const ls = ['ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض'];
        return {
          title: 'Letter shapes (1)',
          hint: 'Each letter changes shape at the start, middle and end of a word. Say its name each time.',
          size: 'lg',
          rows: ls.map((c, i) => ({ kind: 'items', items: items(forms(c)), label: i === 0 ? 'Alone · start · middle · end' : undefined })),
        };
      }
      if (page === 2) {
        const ls = ['ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي'];
        const nj = ['ا', 'د', 'ذ', 'ر', 'ز', 'و'];
        return {
          title: 'Letter shapes (2)',
          hint: 'Six letters never join to the next one: ا د ذ ر ز و.',
          size: 'lg',
          rows: [
            ...ls.map((c, i) => ({ kind: 'items' as const, items: items(forms(c)), label: i === 0 ? 'Alone · start · middle · end' : undefined })),
            ...chunk(nj.flatMap(forms), 6).map((c, i) => ({ kind: 'items' as const, items: items(c), label: i === 0 ? 'Letters that don’t join forward' : undefined })),
          ],
        };
      }
      if (page === 3) {
        const pairs = ALL_LETTERS.slice(0, -1).map((c, i) => c + ALL_LETTERS[i + 1]);
        return { title: 'Two letters joined', hint: 'Name both letters in each group.', size: 'xl', rows: [...rowsOf(pairs, 6), { kind: 'items', items: items(['لا', 'لأ', 'لإ', 'لآ']), label: 'Lām–alif' }] };
      }
      const triples = Array.from({ length: 18 }, (_, i) => randomGroup(seed + i, 3));
      return { title: 'Three letters joined', hint: 'Name every letter in each group, right to left.', size: 'xl', rows: rowsOf(triples, 6) };
    }

    case 3: {
      const all = ctx.openings ?? [];
      const slices: Record<number, [number, number]> = { 1: [0, 4], 2: [4, 8], 3: [8, 12], 4: [12, 14] };
      const [a, b] = slices[page] ?? [0, 4];
      const rows: Row[] = all.slice(a, b).map((it, i) => ({ kind: 'items', items: [it], label: i === 0 ? 'Read by letter names' : undefined }));
      if (page === 4) rows.push(...chunk(shuffle(all, seed), 4).map((c, i) => ({ kind: 'items' as const, items: c, label: i === 0 ? 'All 14, mixed' : undefined })));
      return {
        title: 'Opening letters of the surahs',
        hint: 'These letters are read by their names. Letters with the ( ٓ ) sign are stretched long.',
        size: 'lg',
        rows: rows.length ? rows : [{ kind: 'items', items: [{ t: '…' }], label: 'Could not load the openings. Check the connection.' }],
      };
    }

    case 4: {
      const half = page === 4 ? VOWEL_LETTERS.slice(0, 14) : VOWEL_LETTERS.slice(14);
      if (page <= 3) {
        const mark = [FATHA, KASRA, DAMMA][page - 1];
        const name = ['Fatḥa: “a”', 'Kasra: “i”', 'Ḍamma: “u”'][page - 1];
        return { title: name, hint: 'Spell, then read: “Bā fatḥa: ba”.', size: 'xl', rows: rowsOf(vowelRow(VOWEL_LETTERS, mark), 7) };
      }
      if (page <= 5) {
        return { title: 'Three vowels on each letter', hint: 'Read across: ba · bi · bu.', size: 'xl', rows: half.map((c) => ({ kind: 'items', items: items(SHORT.map((m) => syl(c, m))) })) };
      }
      const chains = Array.from({ length: 8 }, (_, i) => chain(seed + i, 3, SHORT));
      const words = pool ? wordsFor(pool, 4, 1, 8, (w) => w.info.level === 4 && w.letters <= 5) : [];
      return { title: 'Syllables together', hint: 'Read each group smoothly, without stopping between letters.', size: 'lg', rows: [...rowsOf(chains, 4, 'Practice'), ...wordRows(words)] };
    }

    case 5: {
      if (page <= 3) {
        const mark = [FATHATAN, KASRATAN, DAMMATAN][page - 1];
        const name = ['Tanween fatḥ: “-an”', 'Tanween kasr: “-in”', 'Tanween ḍamm: “-un”'][page - 1];
        return { title: name, hint: 'Two marks: say the vowel with a clear “n” at the end.', size: 'xl', rows: rowsOf(vowelRow(VOWEL_LETTERS, mark), 7) };
      }
      if (page <= 5) {
        const half = page === 4 ? VOWEL_LETTERS.slice(0, 14) : VOWEL_LETTERS.slice(14);
        const rows: Row[] = half.map((c) => ({ kind: 'items', items: items(TANWEEN.map((m) => syl(c, m))) }));
        if (page === 5) {
          rows.push({ kind: 'items', items: items(['ةً', 'ةٍ', 'ةٌ', 'ءً', 'بًا', 'تًا', 'كًا']), label: 'With tā marbūṭa, hamza, and the silent alif' });
        }
        return { title: 'Three tanween on each letter', hint: 'Read across: ban · bin · bun.', size: 'xl', rows };
      }
      const chains = Array.from({ length: 8 }, (_, i) => chain(seed + i, 3, SHORT, TANWEEN));
      const words = pool ? wordsFor(pool, 5, 1, 8, (w) => w.info.level === 5 && w.letters <= 6) : [];
      return { title: 'Words ending in tanween', hint: 'Read smoothly; finish with a clear “n”.', size: 'lg', rows: [...rowsOf(chains, 4, 'Practice'), ...wordRows(words)] };
    }

    case 6: {
      const chains = Array.from({ length: 4 }, (_, i) => chain(seed + i, 3, SHORT, [...SHORT, ...TANWEEN]));
      const words = pool ? wordsFor(pool, 6, page, 12, (w) => w.info.level <= 6 && w.info.level >= 4 && w.letters <= 7) : [];
      return { title: `Practice ${page}`, hint: 'Short vowels and tanween in real Quran words.', size: 'lg', rows: [...rowsOf(chains, 4, 'Warm-up'), ...wordRows(words)] };
    }

    case 7: {
      if (page === 1) return { title: 'The small alif ( ٰ )', hint: 'Read it like a long “ā”, two counts.', size: 'xl', rows: rowsOf(VOWEL_LETTERS.filter((c) => c !== 'أ').map((c) => c + FATHA + DAGGER_ALIF), 7) };
      if (page === 2)
        return {
          title: 'The small ya ( ۦ ) and small waw ( ۥ )',
          hint: 'Small ya after kasra: long “ī”. Small waw after ḍamma: long “ū”.',
          size: 'xl',
          rows: [
            ...rowsOf(['ه', 'ب', 'ت', 'ك', 'ل', 'م', 'ن'].map((c) => c + KASRA + SMALL_YA), 7, 'Small ya'),
            ...rowsOf(['ه', 'ب', 'ت', 'ك', 'ل', 'م', 'ن'].map((c) => c + DAMMA + SMALL_WAW), 7, 'Small waw'),
            { kind: 'items', items: items(['بِهِۦ', 'لَهُۥ']), label: 'As in the Quran' },
          ],
        };
      const words = pool ? wordsFor(pool, 7, page - 2, 12, (w) => w.info.level <= 7 && w.info.small) : [];
      return { title: 'Small letters in Quran words', hint: 'Stretch the small letters two counts.', size: 'lg', rows: wordRows(words) };
    }

    case 8: {
      if (page <= 3) {
        const [mark, long, name] = [
          [FATHA, 'ا', 'Alif after fatḥa: “ā”'],
          [KASRA, 'ي', 'Ya after kasra: “ī”'],
          [DAMMA, 'و', 'Waw after ḍamma: “ū”'],
        ][page - 1];
        return { title: name, hint: 'Hold the long vowel for two counts.', size: 'xl', rows: rowsOf(VOWEL_LETTERS.map((c) => syl(c, mark) + long), 7) };
      }
      if (page === 4) {
        const ls = shuffle(VOWEL_LETTERS, seed).slice(0, 10);
        return { title: 'The three long vowels', hint: 'Read across: bā · bī · bū.', size: 'xl', rows: ls.map((c) => ({ kind: 'items', items: items([syl(c, FATHA) + 'ا', syl(c, KASRA) + 'ي', syl(c, DAMMA) + 'و']) })) };
      }
      if (page === 5) {
        const ls = VOWEL_LETTERS.filter((c) => c !== 'أ' && c !== 'و' && c !== 'ي');
        return {
          title: 'Soft sounds: aw and ay',
          hint: 'Waw or ya with a sukun after a fatḥa: a short, soft “aw” or “ay”.',
          size: 'xl',
          rows: [...rowsOf(ls.slice(0, 14).map((c) => c + FATHA + 'و' + SUKUN), 7, 'aw'), ...rowsOf(ls.slice(0, 14).map((c) => c + FATHA + 'ي' + SUKUN), 7, 'ay')],
        };
      }
      const words = pool ? wordsFor(pool, 8, 1, 16, (w) => w.info.level === 8 && w.letters <= 7) : [];
      return { title: 'Long vowels in Quran words', hint: 'Two counts on every long vowel.', size: 'lg', rows: wordRows(words) };
    }

    case 9: {
      const words = pool ? wordsFor(pool, 9, page, 16, (w) => w.info.level <= 8 && w.info.level >= 5 && w.letters <= 8) : [];
      return { title: `Practice ${page}`, hint: 'Everything from lessons 4 to 8.', size: 'lg', rows: wordRows(words) };
    }

    case 10: {
      if (page <= 3) {
        const part = chunk(SUKUN_LETTERS, 9)[page - 1];
        return {
          title: 'Sukun ( ْ ): a closed sound',
          hint: 'Join the silent letter to the vowel before it: “ab · ib · ub”.',
          size: 'xl',
          rows: part.map((c) => ({ kind: 'items', items: items(SHORT.map((m) => syl('أ', m) + c + SUKUN)) })),
        };
      }
      if (page === 4) {
        return {
          title: 'The bounce: qalqalah',
          hint: 'ق ط ب ج د with a sukun get a small bounce.',
          size: 'xl',
          rows: QALQALAH.map((c, i) => ({ kind: 'items', items: items(SHORT.map((m) => syl('أ', m) + c + SUKUN)), label: i === 0 ? 'ق ط ب ج د' : undefined })),
        };
      }
      if (page === 5) {
        const closed = Array.from({ length: 12 }, (_, i) => {
          const r = rng(seed + i);
          const a = VOWEL_LETTERS[1 + Math.floor(r() * (VOWEL_LETTERS.length - 1))];
          const b = SUKUN_LETTERS[Math.floor(r() * SUKUN_LETTERS.length)];
          return a + SHORT[Math.floor(r() * 3)] + b + SUKUN;
        });
        const words = pool ? wordsFor(pool, 10, 1, 8, (w) => w.info.level === 10 && w.letters <= 4) : [];
        return { title: 'Short closed words', hint: 'Stop cleanly on the silent letter.', size: 'lg', rows: [...rowsOf(closed, 6, 'Practice'), ...wordRows(words)] };
      }
      const words = pool ? wordsFor(pool, 10, 2, 16, (w) => w.info.level === 10 && w.letters <= 7) : [];
      return { title: 'Sukun in Quran words', hint: 'Clean stops, and a bounce on ق ط ب ج د.', size: 'lg', rows: wordRows(words) };
    }

    case 11: {
      const words = pool ? wordsFor(pool, 11, page, 16, (w) => w.info.level === 10 || (w.info.level <= 10 && w.info.sukun)) : [];
      return { title: `Practice ${page}`, hint: 'Words with one or two sukuns.', size: 'lg', rows: wordRows(words) };
    }

    case 12: {
      if (page <= 3) {
        const part = chunk(SUKUN_LETTERS, 9)[page - 1];
        return {
          title: 'Shadda ( ّ ): a doubled letter',
          hint: 'Say the letter twice: once closed, once with its vowel. “ab-ba”.',
          size: 'xl',
          rows: part.map((c) => ({ kind: 'items', items: items(SHORT.map((m) => syl('أ', FATHA) + c + SHADDA + m)) })),
        };
      }
      if (page === 4) {
        const words = pool ? wordsFor(pool, 12, 1, 8, (w) => w.info.level <= 12 && /[نم]ّ/.test(w.t) && w.info.shaddas === 1 && !w.info.sukun) : [];
        return {
          title: 'Ghunna: the hum in نّ and مّ',
          hint: 'Hold the hum in the nose for two counts.',
          size: 'xl',
          rows: [
            { kind: 'items', items: items(SHORT.map((m) => syl('أ', m) + 'ن' + SHADDA + FATHA)), label: 'نّ' },
            { kind: 'items', items: items(SHORT.map((m) => syl('أ', m) + 'م' + SHADDA + FATHA)), label: 'مّ' },
            ...wordRows(words),
          ],
        };
      }
      const words = pool ? wordsFor(pool, 12, 2, 16, (w) => w.info.level === 12 && w.info.shaddas === 1) : [];
      return { title: 'Shadda in Quran words', hint: 'Make every doubling heard.', size: 'lg', rows: wordRows(words) };
    }

    case 13: {
      const words = pool ? wordsFor(pool, 13, page, 16, (w) => w.info.level <= 12 && w.info.shaddas >= 1) : [];
      return { title: `Practice ${page}`, hint: 'Shadda in words.', size: 'lg', rows: wordRows(words) };
    }

    case 14: {
      const words = pool ? wordsFor(pool, 14, page, 16, (w) => w.info.level === 14 && w.info.shaddas === 1) : [];
      return { title: page === 1 ? 'Shadda and sukun together' : `Shadda and sukun (${page})`, hint: 'Keep an even pace through both.', size: 'lg', rows: wordRows(words) };
    }

    case 15: {
      const words = pool ? wordsFor(pool, 15, page, 12, (w) => w.info.level <= 15 && w.info.shaddas >= 2) : [];
      return { title: 'Two shaddas in one word', hint: 'Both doublings must be heard.', size: 'lg', rows: wordRows(words, 3) };
    }

    case 16: {
      const words = pool ? wordsFor(pool, 16, page, 16, (w) => w.info.level === 16) : [];
      return { title: page === 1 ? 'Long vowels with shadda and sukun' : `Long vowels with shadda and sukun (${page})`, hint: 'The ( ٓ ) sign is stretched long: four to six counts.', size: 'lg', rows: wordRows(words, 3) };
    }

    default: {
      // Lesson 17: verses Adam has not memorized.
      const vs = (pool?.verses ?? []).filter(
        (v) => v.surah !== 1 && !ctx.knownSurahs.has(v.surah) && v.words.length >= 3 && v.words.length <= 12 && v.infos.every((i) => i.level < 99),
      );
      const start = vs.length ? ((page - 1) * 3) % vs.length : 0;
      const pickV = vs.slice(start, start + 3);
      return {
        title: `Reading verses ${page}`,
        hint: 'Verses you have not memorized: read slowly and carefully, word by word.',
        size: 'md',
        rows: pickV.map((v) => ({ kind: 'verse', items: v.words, ref: { surah: v.surah, ayah: v.ayah } })),
      };
    }
  }
}

/** The page as the parent previews it (no review row or past mistakes yet). */
export function buildBasePage(lesson: number, page: number, ctx: BuildContext): Page {
  const p = basePage(lesson, page, ctx);
  if (!ctx.options.wordAudio) {
    for (const r of p.rows) if (r.kind === 'items') r.items = r.items.map((it) => ({ ...it, w: undefined }));
  }
  return { lesson, page, ...p };
}

/** True when an item uses only what lesson n has taught. */
export function fitsLesson(item: string, lesson: number): boolean {
  const marked = /[ً-ٰ۟-ࣰۭ-ࣲ]/.test(item);
  if (!marked) return lesson <= 3 || item.length <= 3;
  if (lesson < 4) return false;
  return classify(item).level <= lesson;
}

/** The page as Adam gets it: the base page, plus a review row and his tricky items. */
export function buildPage(lesson: number, page: number, ctx: BuildContext): Page {
  const p = buildBasePage(lesson, page, ctx);
  const seed = lesson * 1009 + page * 7919;
  const isSpot = p.rows.some((r) => r.tag === 'spot');

  if (ctx.options.tricky && ctx.tricky.length && !isSpot) {
    const t = Array.from(new Set(ctx.tricky)).filter((x) => fitsLesson(x, lesson)).slice(0, 6);
    if (t.length) p.rows.push({ kind: 'items', tag: 'tricky', label: 'Your tricky ones', items: items(t) });
  }
  if (ctx.options.reviewRow && lesson >= 2 && !isSpot) {
    const earlier = Array.from({ length: Math.min(lesson - 1, 16) }, (_, i) => i + 1);
    const l = pick(earlier, seed + 3);
    const lp = 1 + Math.floor(rng(seed + 5)() * lessonMeta(l).pages);
    const from = basePage(l, lp, { ...ctx, options: { ...ctx.options, spotIt: false } });
    const rows = from.rows.filter((r) => r.kind === 'items' && r.items.length && r.items[0].t !== '…');
    if (rows.length) {
      const r = pick(rows, seed + 7);
      p.rows.push({ kind: 'items', tag: 'review', label: `Review · lesson ${l}`, items: r.items.slice(0, 6) });
    }
  }
  return p;
}

/** What a page needs loaded before it can be built. */
export function needsPool(lesson: number): boolean {
  return lesson >= 4;
}
