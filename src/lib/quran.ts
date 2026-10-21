// Quran text and reciter audio.
//
// Text is never typed by hand: it is loaded from Quran.com (Uthmani script),
// with AlQuran.cloud (Tanzil Uthmani) as a backup, and cached on the device.
// Audio is verse-by-verse from EveryAyah.

export interface Chapter {
  id: number;
  name: string; // e.g. "Al-Ikhlas"
  arabic: string; // e.g. "الإخلاص"
  verses: number;
  meaning: string;
}

export interface Verse {
  n: number;
  text: string;
}

export const RECITER = {
  name: 'Mahmoud Khalil Al-Husary',
  style: 'Teaching style (muallim)',
  // Swap the folder to change reciter, e.g. 'Husary_128kbps' or 'Alafasy_128kbps'.
  base: 'https://everyayah.com/data/Husary_Muallim_128kbps/',
};

const pad3 = (n: number) => String(n).padStart(3, '0');

export function verseAudioUrl(surah: number, verse: number): string {
  return `${RECITER.base}${pad3(surah)}${pad3(verse)}.mp3`;
}

/** Surahs that start with a recited Basmala before verse 1 (all but 1 and 9). */
export function hasBasmala(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function arabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}
/** End-of-ayah sign with the verse number inside it. */
export function verseMark(n: number): string {
  return '۝' + arabicNumber(n);
}

// ── small localStorage cache ────────────────────────────────
function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: fine, we just refetch next time */
  }
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// ── chapters ────────────────────────────────────────────────
let chaptersPromise: Promise<Chapter[]> | null = null;

export function getChapters(): Promise<Chapter[]> {
  if (chaptersPromise) return chaptersPromise;
  chaptersPromise = (async () => {
    const key = 'falaq.chapters.v1';
    const cached = readCache<Chapter[]>(key);
    if (cached && cached.length === 114) return cached;
    let list: Chapter[];
    try {
      const j = await getJson('https://api.quran.com/api/v4/chapters?language=en');
      list = j.chapters.map((c: any) => ({
        id: c.id,
        name: c.name_simple,
        arabic: c.name_arabic,
        verses: c.verses_count,
        meaning: c.translated_name?.name ?? '',
      }));
    } catch {
      const j = await getJson('https://api.alquran.cloud/v1/surah');
      list = j.data.map((c: any) => ({
        id: c.number,
        name: c.englishName,
        arabic: String(c.name).replace(/^سُورَةُ\s*/, ''),
        verses: c.numberOfAyahs,
        meaning: c.englishNameTranslation ?? '',
      }));
    }
    if (list.length !== 114) throw new Error('Unexpected chapter list');
    writeCache(key, list);
    return list;
  })();
  chaptersPromise.catch(() => {
    chaptersPromise = null;
  });
  return chaptersPromise;
}

// ── verses ──────────────────────────────────────────────────
const versePromises = new Map<number, Promise<Verse[]>>();

export function getVerses(surah: number): Promise<Verse[]> {
  const existing = versePromises.get(surah);
  if (existing) return existing;
  const p = (async () => {
    const key = `falaq.verses.v1.${surah}`;
    const cached = readCache<Verse[]>(key);
    if (cached && cached.length) return cached;
    let verses: Verse[];
    try {
      const j = await getJson(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`);
      verses = j.verses.map((v: any) => ({
        n: Number(String(v.verse_key).split(':')[1]),
        text: v.text_uthmani as string,
      }));
    } catch {
      const j = await getJson(`https://api.alquran.cloud/v1/surah/${surah}/quran-uthmani`);
      verses = j.data.ayahs.map((a: any) => ({ n: a.numberInSurah, text: a.text as string }));
      // Tanzil's text puts the Basmala inside verse 1; show it separately instead.
      if (hasBasmala(surah) && verses[0]?.text.startsWith('بِسْمِ')) {
        verses[0] = { ...verses[0], text: verses[0].text.split(' ').slice(4).join(' ') };
      }
    }
    if (!verses.length) throw new Error('No verses');
    writeCache(key, verses);
    return verses;
  })();
  versePromises.set(surah, p);
  p.catch(() => versePromises.delete(surah));
  return p;
}

/** The Basmala line, taken from Al-Fatiha verse 1 so it is never hand-typed. */
export async function getBasmala(): Promise<string> {
  const fatiha = await getVerses(1);
  return fatiha[0]?.text ?? '';
}
