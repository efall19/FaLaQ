import { supabase } from './supabase';
import type {
  Assignment,
  Kind,
  Memorized,
  Profile,
  Recording,
  RecordingWithAssignment,
  RevisionSettings,
  ScheduleRow,
} from './types';
import { addDays, isoDate } from './dates';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const res = await supabase.from('profiles').select('id, role, display_name').eq('id', id).maybeSingle();
  return check(res) as Profile | null;
}

export async function fetchChildren(): Promise<Profile[]> {
  const res = await supabase.from('profiles').select('id, role, display_name').eq('role', 'child').order('created_at');
  return check(res) as Profile[];
}

export async function fetchAssignments(childId: string, from: string, to: string): Promise<Assignment[]> {
  const res = await supabase
    .from('assignments')
    .select('*')
    .eq('child_id', childId)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date')
    .order('kind', { ascending: false }) // revision before memorization
    .order('position')
    .order('created_at');
  return check(res) as Assignment[];
}

export async function fetchRecordingsFor(assignmentIds: string[]): Promise<Recording[]> {
  if (!assignmentIds.length) return [];
  const res = await supabase
    .from('recordings')
    .select('*')
    .in('assignment_id', assignmentIds)
    .order('created_at', { ascending: false });
  return check(res) as Recording[];
}

export async function fetchPending(childId: string): Promise<RecordingWithAssignment[]> {
  const res = await supabase
    .from('recordings')
    .select('*, assignment:assignments(*)')
    .eq('child_id', childId)
    .eq('review', 'pending')
    .order('created_at');
  return check(res) as RecordingWithAssignment[];
}

export async function fetchRecentlyReviewed(childId: string, limit = 8): Promise<RecordingWithAssignment[]> {
  const res = await supabase
    .from('recordings')
    .select('*, assignment:assignments(*)')
    .eq('child_id', childId)
    .neq('review', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(limit);
  return check(res) as RecordingWithAssignment[];
}

export async function fetchRecording(id: string): Promise<RecordingWithAssignment | null> {
  const res = await supabase.from('recordings').select('*, assignment:assignments(*)').eq('id', id).maybeSingle();
  return check(res) as RecordingWithAssignment | null;
}

export async function countStars(childId: string): Promise<number> {
  const res = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('status', 'approved');
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

/**
 * Streak = consecutive days on which every task was approved.
 * Days with no tasks (rest days) are skipped rather than breaking it.
 * Today counts only once it is complete; an unfinished today doesn't break it.
 */
export function computeStreak(assignments: Assignment[], today = isoDate()): number {
  const byDay = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const list = byDay.get(a.due_date) ?? [];
    list.push(a);
    byDay.set(a.due_date, list);
  }
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = addDays(today, -i);
    const list = byDay.get(day);
    if (!list || !list.length) {
      if (day < (assignments[0]?.due_date ?? today)) break;
      continue;
    }
    const complete = list.every((a) => a.status === 'approved');
    if (complete) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export async function fetchStreak(childId: string): Promise<number> {
  const today = isoDate();
  const list = await fetchAssignments(childId, addDays(today, -120), today);
  return computeStreak(list, today);
}

// ── audio storage ───────────────────────────────────────────
export async function uploadAudio(path: string, blob: Blob): Promise<void> {
  const res = await supabase.storage.from('audio').upload(path, blob, {
    contentType: blob.type || 'audio/webm',
    upsert: false,
  });
  if (res.error) throw new Error(res.error.message);
}

const urlCache = new Map<string, { url: string; until: number }>();
export async function audioUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const res = await supabase.storage.from('audio').createSignedUrl(path, 60 * 60);
  if (res.error || !res.data) throw new Error(res.error?.message ?? 'No URL');
  urlCache.set(path, { url: res.data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return res.data.signedUrl;
}

// ── actions ─────────────────────────────────────────────────
export async function submitRecording(assignmentId: string, path: string, duration: number) {
  const res = await supabase.rpc('submit_recording', {
    p_assignment: assignmentId,
    p_audio_path: path,
    p_duration: Math.round(duration),
  });
  if (res.error) throw new Error(res.error.message);
}

export async function reviewRecording(
  recordingId: string,
  approve: boolean,
  comment: string,
  notePath: string | null,
  noteDuration: number | null,
) {
  const res = await supabase.rpc('review_recording', {
    p_recording: recordingId,
    p_approve: approve,
    p_comment: comment,
    p_note_path: notePath,
    p_note_duration: noteDuration === null ? null : Math.round(noteDuration),
  });
  if (res.error) throw new Error(res.error.message);
}

export async function addAssignment(a: {
  child_id: string;
  due_date: string;
  kind: Kind;
  surah: number;
  verse_from: number;
  verse_to: number;
  position: number;
}) {
  const res = await supabase.from('assignments').insert(a);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteAssignment(id: string) {
  const res = await supabase.from('assignments').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── known surahs & automatic revision ───────────────────────
export async function fetchMemorized(childId: string): Promise<Memorized[]> {
  const res = await supabase.from('memorized').select('*').eq('child_id', childId).order('surah', { ascending: false });
  return check(res) as Memorized[];
}

export async function saveMemorized(rows: Memorized[]) {
  if (!rows.length) return;
  const res = await supabase
    .from('memorized')
    .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'child_id,surah' });
  if (res.error) throw new Error(res.error.message);
}

export async function removeMemorized(childId: string, surahs: number[]) {
  if (!surahs.length) return;
  const res = await supabase.from('memorized').delete().eq('child_id', childId).in('surah', surahs);
  if (res.error) throw new Error(res.error.message);
}

export async function fetchRevisionSettings(childId: string): Promise<RevisionSettings | null> {
  const res = await supabase.from('revision_settings').select('*').eq('child_id', childId).maybeSingle();
  return check(res) as RevisionSettings | null;
}

export async function saveRevisionSettings(s: Omit<RevisionSettings, 'start_date'>, today: string) {
  const res = await supabase
    .from('revision_settings')
    .upsert({ ...s, start_date: today, updated_at: new Date().toISOString() }, { onConflict: 'child_id' });
  if (res.error) throw new Error(res.error.message);
}

/** Preview the plan for settings that may not be saved yet. */
export async function previewSchedule(
  childId: string,
  cycle: number,
  rest: number[],
  start: string, // the day the cycle began (or would begin)
  from: string, // first day to show
  days: number,
): Promise<ScheduleRow[]> {
  const res = await supabase.rpc('revision_schedule', {
    p_child: childId,
    p_cycle: cycle,
    p_rest: rest,
    p_start: start,
    p_from: from,
    p_days: days,
  });
  return check(res) as ScheduleRow[];
}

/** Create the automatic revision tasks for the coming days (no-op if already there). */
export async function ensurePlan(childId: string, today = isoDate(), days = 7) {
  const res = await supabase.rpc('ensure_revision_plan', { p_child: childId, p_today: today, p_days: days });
  if (res.error) throw new Error(res.error.message);
}

/** Recalculate future automatic tasks. restart = the cycle or rest days changed. */
export async function rebuildPlan(childId: string, restart: boolean, today = isoDate(), days = 7) {
  const res = await supabase.rpc('rebuild_revision_plan', {
    p_child: childId,
    p_today: today,
    p_restart: restart,
    p_days: days,
  });
  if (res.error) throw new Error(res.error.message);
}

// ── crystals & spaceship ────────────────────────────────────
export interface Wallet {
  earned: number;
  day_bonus: number;
  spent: number;
  balance: number;
  today_earned: number;
  today_complete: boolean;
}

export async function fetchWallet(childId: string, today = isoDate()): Promise<Wallet | null> {
  const res = await supabase.rpc('crystal_balance', { p_child: childId, p_today: today });
  if (res.error) throw new Error(res.error.message);
  const rows = res.data as Wallet[] | null;
  return rows?.[0] ?? null;
}

export async function fetchShipState(childId: string): Promise<{ equipped: Record<string, string | null>; owned: string[] }> {
  const [ship, bought] = await Promise.all([
    supabase.from('ships').select('equipped').eq('child_id', childId).maybeSingle(),
    supabase.from('purchases').select('item_id').eq('child_id', childId),
  ]);
  if (ship.error) throw new Error(ship.error.message);
  if (bought.error) throw new Error(bought.error.message);
  return {
    equipped: ((ship.data as { equipped: Record<string, string | null> } | null)?.equipped ?? {}) as Record<string, string | null>,
    owned: ((bought.data ?? []) as { item_id: string }[]).map((r) => r.item_id),
  };
}

export async function buyItem(itemId: string): Promise<number> {
  const res = await supabase.rpc('buy_item', { p_item: itemId });
  if (res.error) throw new Error(res.error.message);
  return res.data as number;
}

export async function equipItem(slot: string, itemId: string | null) {
  const res = await supabase.rpc('equip_item', { p_slot: slot, p_item: itemId });
  if (res.error) throw new Error(res.error.message);
}
