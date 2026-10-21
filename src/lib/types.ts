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
}

export interface RecordingWithAssignment extends Recording {
  assignment: Assignment;
}
