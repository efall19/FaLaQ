export type Role = 'parent' | 'child';

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
}

export type Status = 'todo' | 'submitted' | 'redo' | 'approved';
export type Kind = 'revision' | 'memorization';

export interface Assignment {
  id: string;
  child_id: string;
  due_date: string; // YYYY-MM-DD
  kind: Kind;
  surah: number;
  verse_from: number;
  verse_to: number;
  status: Status;
  position: number;
  created_at: string;
  source?: 'manual' | 'auto';
  crystals?: number;
  /** 'reading' = a reading-lesson page; surah/verse then hold placeholders. */
  track?: 'quran' | 'reading';
  reading_lesson?: number | null;
  reading_page?: number | null;
  reading_content?: import('./reading/types').Page | null;
}

export const isReading = (a: Pick<Assignment, 'track'>) => a.track === 'reading';

export interface Memorized {
  child_id: string;
  surah: number;
  verse_from: number;
  verse_to: number;
  weight: number;
}

export interface RevisionSettings {
  child_id: string;
  cycle_days: number;
  rest_weekdays: number[]; // 0 = Sunday … 6 = Saturday
  start_date: string;
  active: boolean;
}

export interface ScheduleRow {
  day: string;
  surah: number;
  verse_from: number;
  verse_to: number;
  ord: number;
}

export interface Recording {
  id: string;
  assignment_id: string;
  child_id: string;
  audio_path: string;
  duration_sec: number | null;
  attempt: number;
  review: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  note_path: string | null;
  note_duration_sec: number | null;
  reviewed_at: string | null;
  created_at: string;
  keep?: boolean;
  audio_removed_at?: string | null;
  note_removed_at?: string | null;
}

export interface RecordingWithAssignment extends Recording {
  assignment: Assignment;
}
