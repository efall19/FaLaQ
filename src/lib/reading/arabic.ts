// Arabic letters and marks for the reading lessons, and a classifier that says
// which lesson a Quran word belongs to (the first lesson after which every
// letter and mark in it has been taught).

export interface Letter {
  ch: string; // the letter as written alone
  name: string; // its name, e.g. "Bā"
  sound: string; // consonant sound used for spelling hints, e.g. "b"
}

/** The 28 letters and hamza, in the order of the first lesson. */
export const LETTERS: Letter[] = [
  { ch: 'ا', name: 'Alif', sound: 'ʾ' },
  { ch: 'ب', name: 'Bā', sound: 'b' },
  { ch: 'ت', name: 'Tā', sound: 't' },
  { ch: 'ث', name: 'Thā', sound: 'th' },
  { ch: 'ج', name: 'Jīm', sound: 'j' },
  { ch: 'ح', name: 'Ḥā', sound: 'ḥ' },
  { ch: 'خ', name: 'Khā', sound: 'kh' },
  { ch: 'د', name: 'Dāl', sound: 'd' },
  { ch: 'ذ', name: 'Dhāl', sound: 'dh' },
  { ch: 'ر', name: 'Rā', sound: 'r' },
  { ch: 'ز', name: 'Zāy', sound: 'z' },
  { ch: 'س', name: 'Sīn', sound: 's' },
  { ch: 'ش', name: 'Shīn', sound: 'sh' },
  { ch: 'ص', name: 'Ṣād', sound: 'ṣ' },
  { ch: 'ض', name: 'Ḍād', sound: 'ḍ' },
  { ch: 'ط', name: 'Ṭā', sound: 'ṭ' },
  { ch: 'ظ', name: 'Ẓā', sound: 'ẓ' },
  { ch: 'ع', name: 'ʿAyn', sound: 'ʿ' },
  { ch: 'غ', name: 'Ghayn', sound: 'gh' },
  { ch: 'ف', name: 'Fā', sound: 'f' },
  { ch: 'ق', name: 'Qāf', sound: 'q' },
  { ch: 'ك', name: 'Kāf', sound: 'k' },
  { ch: 'ل', name: 'Lām', sound: 'l' },
  { ch: 'م', name: 'Mīm', sound: 'm' },
  { ch: 'ن', name: 'Nūn', sound: 'n' },
  { ch: 'و', name: 'Wāw', sound: 'w' },
  { ch: 'ه', name: 'Hā', sound: 'h' },
  { ch: 'ء', name: 'Hamza', sound: 'ʾ' },
  { ch: 'ي', name: 'Yā', sound: 'y' },
];

/**
 * Letters that carry a vowel in the drills (lessons 4 onwards). Alif cannot
 * carry a vowel, so, as in the Nouraniya, it is written with its hamza (أ).
 */
export const VOWEL_LETTERS: string[] = ['أ', ...LETTERS.map((l) => l.ch).filter((c) => c !== 'ا' && c !== 'ء')];

export const QALQALAH = ['ق', 'ط', 'ب', 'ج', 'د'];

export const FATHA = 'َ';
export const DAMMA = 'ُ';
export const KASRA = 'ِ';
export const FATHATAN = 'ً';
export const DAMMATAN = 'ٌ';
export const KASRATAN = 'ٍ';
export const SHADDA = 'ّ';
export const SUKUN = 'ْ';
export const DAGGER_ALIF = 'ٰ';
export const SMALL_WAW = 'ۥ';
export const SMALL_YA = 'ۦ';
export const TATWEEL = 'ـ';

export const SHORT = [FATHA, KASRA, DAMMA];
export const TANWEEN = [FATHATAN, KASRATAN, DAMMATAN];

/** A letter with a mark, using إ for alif with kasra. */
export function syl(letter: string, ...marks: string[]): string {
  const base = letter === 'أ' && (marks[0] === KASRA || marks[0] === KASRATAN) ? 'إ' : letter;
  return base + marks.join('');
}

// ── classifier ──────────────────────────────────────────────

const PAUSE = /[ۖ-ۜ۞۩۝]/g;
const ARABIC_LETTER = /[ء-غف-يٱ]/;

/** Waqf signs removed, spaces trimmed. */
export function cleanWord(w: string): string {
  return w.replace(PAUSE, '').replace(/\s+/g, '').trim();
}

export function hasLetters(w: string): boolean {
  return ARABIC_LETTER.test(w);
}

interface Unit {
  ch: string;
  marks: string[];
}

function units(word: string): Unit[] | null {
  const out: Unit[] = [];
  for (const c of cleanWord(word)) {
    if (ARABIC_LETTER.test(c) || c === 'آ' || c === 'أ' || c === 'إ' || c === 'ؤ' || c === 'ئ') {
      out.push({ ch: c, marks: [] });
    } else if (c === TATWEEL) {
      // carrier for a small letter: keep with the previous letter
      continue;
    } else if (/[ً-ٰٕ۟-ࣰۭ-ࣲ]/.test(c)) {
      if (!out.length) return null;
      out[out.length - 1].marks.push(c);
    } else {
      return null; // something we don't know: never show it in a drill
    }
  }
  return out.length ? out : null;
}

export interface WordInfo {
  level: number; // first lesson where it can appear (4–17), or 99 if unknown
  shaddas: number;
  sukun: boolean; // a closed syllable (sukun other than the soft aw/ay)
  madd: boolean; // a long vowel of any kind
  small: boolean; // small alif / waw / ya
  tanween: boolean;
}

/** Which lesson a word belongs to. Unknown signs give level 99 (never used). */
export function classify(word: string): WordInfo {
  const info: WordInfo = { level: 4, shaddas: 0, sukun: false, madd: false, small: false, tanween: false };
  const us = units(word);
  if (!us) return { ...info, level: 99 };
  let level = 4;
  const bump = (n: number) => {
    if (n > level) level = n;
  };
  const has = (u: Unit, m: string) => u.marks.includes(m);
  const vowelOf = (u?: Unit) => (u ? u.marks.find((m) => SHORT.includes(m) || TANWEEN.includes(m) || m >= 'ࣰ') : undefined);

  us.forEach((u, i) => {
    const prev = us[i - 1];
    const pv = vowelOf(prev);
    for (const m of u.marks) {
      if (SHORT.includes(m)) continue;
      if (TANWEEN.includes(m)) {
        info.tanween = true;
        bump(5);
      } else if (m >= 'ࣰ' && m <= 'ࣲ') {
        info.tanween = true;
        bump(6);
      } else if (m === SHADDA) {
        info.shaddas++;
      } else if (m === SUKUN || m === 'ۡ') {
        const leen = (u.ch === 'و' || u.ch === 'ي') && pv === FATHA && !has(prev!, SHADDA);
        if (leen) {
          info.madd = true;
          bump(8);
        } else {
          info.sukun = true;
        }
      } else if (m === DAGGER_ALIF || m === SMALL_WAW || m === SMALL_YA || m === 'ۧ') {
        info.small = true;
        bump(7);
      } else if (m === 'ٓ' || m === 'ۤ') {
        info.madd = true;
        bump(16);
      } else if (m === '۟' || m === '۠') {
        bump(14); // a letter that is written but not read
      } else if (m === 'ٔ' || m === 'ٕ') {
        // hamza written above/below a carrier: read as hamza
      } else {
        bump(17); // iqlab meem, small seen/noon, imala/ishmam signs, …
      }
    }
    if (u.ch === 'آ') {
      info.madd = true;
      bump(16);
    }
    if (u.ch === 'ٱ') {
      bump(10); // hamzat al-wasl in "al-"
      return;
    }
    if (u.marks.length === 0) {
      // A letter without any mark: a long vowel, the alif after fathatan, or silent.
      if ((u.ch === 'ا' || u.ch === 'ى') && pv === FATHA) {
        info.madd = true;
        bump(8);
      } else if ((u.ch === 'ا' || u.ch === 'ى') && prev && (has(prev, FATHATAN) || has(prev, 'ࣰ'))) {
        // alif after -an: part of tanween
      } else if (u.ch === 'و' && pv === DAMMA) {
        info.madd = true;
        bump(8);
      } else if (u.ch === 'ي' && pv === KASRA) {
        info.madd = true;
        bump(8);
      } else if (u.ch === 'ل' && prev?.ch === 'ٱ') {
        bump(12); // the silent lam of "al-" before a sun letter (comes with a shadda)
      } else if (i === 0 && u.ch === 'ء') {
        bump(99);
      } else {
        bump(14); // written, not read
      }
    } else if (u.ch === 'ى' && u.marks.every((m) => m === DAGGER_ALIF)) {
      info.madd = true;
    }
    if (u.marks.some((m) => m === DAGGER_ALIF || m === SMALL_WAW || m === SMALL_YA)) info.madd = true;
  });

  if (info.sukun) bump(10);
  if (info.shaddas >= 1) bump(12);
  if (info.shaddas >= 1 && info.sukun) bump(14);
  if (info.shaddas >= 2) bump(15);
  if ((info.shaddas >= 1 || info.sukun) && info.madd && level >= 10) bump(16);
  info.level = level;
  return info;
}

// ── spelling hints ──────────────────────────────────────────

const VOWEL_SOUND: Record<string, string> = {
  [FATHA]: 'a',
  [KASRA]: 'i',
  [DAMMA]: 'u',
  [FATHATAN]: 'an',
  [KASRATAN]: 'in',
  [DAMMATAN]: 'un',
};
const MARK_NAME: Record<string, string> = {
  [FATHA]: 'fatḥa',
  [KASRA]: 'kasra',
  [DAMMA]: 'ḍamma',
  [FATHATAN]: 'tanwīn fatḥ',
  [KASRATAN]: 'tanwīn kasr',
  [DAMMATAN]: 'tanwīn ḍamm',
  [SUKUN]: 'sukūn',
  [SHADDA]: 'shadda',
};

const soundOf = (ch: string) => {
  if ('أإآٱؤئء'.includes(ch)) return 'ʾ';
  if (ch === 'ة') return 't';
  return LETTERS.find((l) => l.ch === ch)?.sound ?? '';
};
export const nameOf = (ch: string) => {
  if (ch === 'أ' || ch === 'إ') return 'Alif with hamza';
  if (ch === 'ة') return 'Tā marbūṭa';
  if (ch === 'ى') return 'Alif maqṣūra';
  if ('ؤئ'.includes(ch)) return 'Hamza';
  return LETTERS.find((l) => l.ch === ch)?.name ?? ch;
};

/**
 * How the Nouraniya spells an item out loud, e.g. "Bā + fatḥa → ba" for one
 * syllable, or "kha · la · qa" for a word. Approximate, for the child's eyes.
 */
export function spell(item: string): string {
  const us = units(item);
  if (!us) return '';
  if (us.length === 1) {
    const u = us[0];
    const parts = [nameOf(u.ch), ...u.marks.map((m) => MARK_NAME[m]).filter(Boolean)];
    const v = u.marks.map((m) => VOWEL_SOUND[m]).find(Boolean) ?? '';
    return `${parts.join(' + ')}${v ? ` → ${soundOf(u.ch)}${v}` : ''}`;
  }
  const out: string[] = [];
  us.forEach((u, i) => {
    const c = soundOf(u.ch);
    const v = u.marks.map((m) => VOWEL_SOUND[m]).find(Boolean);
    const doubled = u.marks.includes(SHADDA);
    const closed = u.marks.includes(SUKUN) || u.marks.includes('ۡ');
    const small = u.marks.includes(DAGGER_ALIF) ? 'ā' : u.marks.includes(SMALL_WAW) ? 'ū' : u.marks.includes(SMALL_YA) ? 'ī' : '';
    if (!u.marks.length || u.ch === 'ٱ') {
      // long vowel, silent letter or hamzat al-wasl: lengthen the previous syllable
      const prev = us[i - 1];
      const pv = prev?.marks.map((m) => VOWEL_SOUND[m]).find(Boolean);
      if (u.ch === 'ٱ') out.push('a');
      else if (out.length && pv && ((u.ch === 'ا' || u.ch === 'ى') && pv === 'a' || u.ch === 'و' && pv === 'u' || u.ch === 'ي' && pv === 'i')) {
        out[out.length - 1] = out[out.length - 1].replace(/[aiu]$/, (x) => ({ a: 'ā', i: 'ī', u: 'ū' })[x]!);
      }
      return;
    }
    if (closed && out.length) {
      out[out.length - 1] += c;
      return;
    }
    if (doubled && out.length) out[out.length - 1] += c;
    let s = c + (v ?? '');
    if (small && v) s = s.replace(/[aiu]$/, small);
    out.push(s);
  });
  return out.join(' · ');
}
