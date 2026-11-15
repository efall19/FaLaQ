import { supabase } from '../supabase';
import type { Assignment } from '../types';
import { fetchMemorized } from '../data';
import { buildPage, knowsPoolSurah, loadOpenings, loadPool, needsPool, type BuildContext, type PoolVerse } from './lessons';
import { computeProgress, type Progress } from './progress';
import { DEFAULT_OPTIONS, type Page, type ReadingOptions, type ReadingSettings } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const optionsOf = (s: ReadingSettings | null): ReadingOptions => ({ ...DEFAULT_OPTIONS, ...(s?.options ?? {}) });

export async function fetchReadingSettings(childId: string): Promise<ReadingSettings | null> {
  const res = await supabase.from('reading_settings').select('*').eq('child_id', childId).maybeSingle();
  return check(res) as ReadingSettings | null;
}

export async function saveReadingSettings(s: ReadingSettings) {
  const res = await supabase
    .from('reading_settings')
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: 'child_id' });
  if (res.error) throw new Error(res.error.message);
}

export async function fetchReadingTasks(childId: string): Promise<Assignment[]> {
  const res = await supabase
    .from('assignments')
    .select('*')
    .eq('child_id', childId)
    .eq('track', 'reading')
    .order('created_at');
  return check(res) as Assignment[];
}

// ── model audio (the parent's reading of a page) ───────────
export interface ModelAudio {
  child_id: string;
  lesson: number;
  page: number;
  path: string;
  duration_sec: number | null;
}

export async function fetchModelAudio(childId: string): Promise<ModelAudio[]> {
  const res = await supabase.from('reading_audio').select('*').eq('child_id', childId);
  return check(res) as ModelAudio[];
}

export async function saveModelAudio(a: ModelAudio) {
  const res = await supabase
    .from('reading_audio')
    .upsert({ ...a, updated_at: new Date().toISOString() }, { onConflict: 'child_id,lesson,page' });
  if (res.error) throw new Error(res.error.message);
}

// ── mistakes ───────────────────────────────────────────────
export async function fetchOpenMistakes(childId: string): Promise<string[]> {
  const res = await supabase
    .from('reading_mistakes')
    .select('item, created_at')
    .eq('child_id', childId)
    .is('cleared_at', null)
    .order('created_at', { ascending: false })
    .limit(40);
  return (check(res) as { item: string }[]).map((r) => r.item);
}

export interface MistakeCount {
  item: string;
  n: number;
  open: boolean;
}

/** Every item ever marked, with how often, for the parent's overview. */
export async function fetchMistakeStats(childId: string): Promise<MistakeCount[]> {
  const res = await supabase.from('reading_mistakes').select('item, cleared_at').eq('child_id', childId).limit(1000);
  const rows = check(res) as { item: string; cleared_at: string | null }[];
  const map = new Map<string, MistakeCount>();
  for (const r of rows) {
    const m = map.get(r.item) ?? { item: r.item, n: 0, open: false };
    m.n++;
    if (!r.cleared_at) m.open = true;
    map.set(r.item, m);
  }
  return Array.from(map.values()).sort((a, b) => Number(b.open) - Number(a.open) || b.n - a.n);
}

export async function addMistakes(childId: string, task: Assignment, items: string[]) {
  if (!items.length) return;
  const res = await supabase.from('reading_mistakes').insert(
    items.map((item) => ({
      child_id: childId,
      assignment_id: task.id,
      lesson: task.reading_lesson ?? 0,
      page: task.reading_page ?? 0,
      item,
    })),
  );
  if (res.error) throw new Error(res.error.message);
}

/** Past mistakes that were on this page and read well at the first attempt. */
export async function clearMistakes(childId: string, items: string[]) {
  if (!items.length) return;
  const res = await supabase
    .from('reading_mistakes')
    .update({ cleared_at: new Date().toISOString() })
    .eq('child_id', childId)
    .is('cleared_at', null)
    .in('item', items);
  if (res.error) throw new Error(res.error.message);
}

// ── building pages ─────────────────────────────────────────

/** Everything needed to build pages for one child. Lessons 4+ load the Quran word pool. */
export async function buildContext(childId: string, options: ReadingOptions, lesson: number, withTricky: boolean): Promise<BuildContext> {
  const [memorized, tricky] = await Promise.all([
    fetchMemorized(childId).catch(() => []),
    withTricky && options.tricky ? fetchOpenMistakes(childId).catch(() => []) : Promise.resolve([] as string[]),
  ]);
  const knownSurahs = new Set(memorized.filter((m) => m.verse_from === 1).map((m) => m.surah));
  const pool = needsPool(lesson) || lesson === 0 ? await loadPool() : null;
  const known: PoolVerse[] = pool
    ? pool.verses.filter((v) => memorized.some((m) => m.surah === v.surah && v.ayah >= m.verse_from && v.ayah <= m.verse_to))
    : [];
  const openings = lesson === 3 || lesson === 0 ? await loadOpenings() : undefined;
  return { pool, known, knownSurahs, options, tricky, openings };
}

export interface ReadingState {
  settings: ReadingSettings | null;
  options: ReadingOptions;
  tasks: Assignment[];
  progress: Progress | null;
  /** Today's page (or the open one carried over from an earlier day). */
  current: Assignment | null;
  /** The next lesson is waiting for the parent to open it. */
  waitingFor: number | null;
  hasKnown: boolean;
}

/**
 * Student side, on every refresh: carry an unfinished page to today, or start
 * today's page if there is none. Pages are built here and stored with the task,
 * so the parent reviews exactly what was shown.
 */
const inFlight = new Map<string, Promise<ReadingState>>();

export function ensureReading(childId: string, today: string): Promise<ReadingState> {
  // Two refreshes at once must not both try to start a page.
  const key = `${childId}:${today}`;
  const running = inFlight.get(key);
  if (running) return running;
  const p = ensureReadingOnce(childId, today).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function ensureReadingOnce(childId: string, today: string): Promise<ReadingState> {
  const settings = await fetchReadingSettings(childId);
  const options = optionsOf(settings);
  const memorized = await fetchMemorized(childId).catch(() => []);
  const hasKnown = knowsPoolSurah(memorized.filter((m) => m.verse_from === 1).map((m) => m.surah));
  let tasks = await fetchReadingTasks(childId);
  const base = { settings, options, hasKnown };
  if (!settings?.active) {
    return { ...base, tasks, progress: tasks.length ? computeProgress(tasks, options, hasKnown) : null, current: null, waitingFor: null };
  }

  let open = tasks.find((t) => t.status !== 'approved') ?? null;
  if (open && open.due_date < today) {
    const res = await supabase.rpc('carry_reading_page', { p_assignment: open.id, p_today: today });
    if (!res.error) open = { ...open, due_date: today };
  }
  let progress = computeProgress(tasks, options, hasKnown);
  let waitingFor: number | null = null;
  const doneToday = tasks.find((t) => t.due_date === today && t.status === 'approved') ?? null;

  if (!open && !doneToday) {
    const { lesson, page } = progress.next;
    if (!settings.opened.includes(lesson)) {
      waitingFor = lesson;
    } else {
      const ctx = await buildContext(childId, options, lesson, true);
      const content: Page = buildPage(lesson, page, ctx);
      // If another device started it first, the database refuses this one: just reload.
      await supabase.rpc('start_reading_page', { p_today: today, p_lesson: lesson, p_page: page, p_content: content });
      tasks = await fetchReadingTasks(childId);
      open = tasks.find((t) => t.status !== 'approved') ?? null;
      progress = computeProgress(tasks, options, hasKnown);
    }
  }
  return { ...base, tasks, progress, current: open ?? doneToday, waitingFor };
}
