import type { Assignment } from '../types';
import { LESSONS, lessonMeta, pageCount } from './lessons';
import type { ReadingOptions } from './types';

export interface LessonState {
  lesson: number;
  passed: boolean;
  approved: number; // pages approved
  total: number; // pages needed (practice: the minimum)
}

export interface Progress {
  lessons: LessonState[];
  passedCount: number;
  /** The next page to give, when no page is open. */
  next: { lesson: number; page: number };
}

const firstTry = (a: Assignment) => (a.crystals ?? 0) >= 3;

/**
 * Where Adam is in the 17 lessons, from his approved reading pages.
 * A lesson passes when all its pages are approved; a practice lesson passes
 * when two pages in a row were approved at the first attempt.
 */
export function computeProgress(tasks: Assignment[], options: ReadingOptions, hasKnown: boolean): Progress {
  const approved = tasks.filter((t) => t.track === 'reading' && t.status === 'approved' && t.reading_lesson && t.reading_page);
  const lessons: LessonState[] = LESSONS.map((m) => {
    const mine = approved.filter((t) => t.reading_lesson === m.n);
    const pages = new Map<number, Assignment>();
    for (const t of mine) pages.set(t.reading_page!, t);
    const total = pageCount(m.n, options, hasKnown);
    let passed: boolean;
    if (m.practice) {
      passed = false;
      for (const [p, t] of pages) {
        const nextT = pages.get(p + 1);
        if (nextT && firstTry(t) && firstTry(nextT)) passed = true;
      }
    } else {
      passed = Array.from({ length: total }, (_, i) => i + 1).every((p) => pages.has(p));
    }
    return { lesson: m.n, passed, approved: pages.size, total };
  });

  const passedCount = lessons.filter((l) => l.passed).length;
  const cur = lessons.find((l) => !l.passed)?.lesson ?? 17;
  const doneHere = new Set(approved.filter((t) => t.reading_lesson === cur).map((t) => t.reading_page!));
  let page: number;
  if (lessonMeta(cur).practice || lessons[cur - 1].passed) {
    page = doneHere.size ? Math.max(...doneHere) + 1 : 1;
  } else {
    page = 1;
    while (doneHere.has(page)) page++;
  }
  return { lessons, passedCount, next: { lesson: cur, page } };
}
