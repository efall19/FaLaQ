import type { Assignment } from './types';
import type { Chapter } from './quran';

/** "Al-Ikhlas · 1–4", or "Reading · Lesson 4, page 2" for a reading page. */
export function taskName(a: Assignment, chapters: Chapter[] | null, withRange = true): string {
  if (a.track === 'reading') return `Reading · Lesson ${a.reading_lesson}, page ${a.reading_page}`;
  const name = chapters?.[a.surah - 1]?.name ?? `Surah ${a.surah}`;
  return withRange ? `${name} · ${a.verse_from}–${a.verse_to}` : name;
}

export function taskKind(a: Assignment): string {
  if (a.track === 'reading') return 'Reading';
  return a.kind === 'memorization' ? 'New memorization' : 'Revision';
}
