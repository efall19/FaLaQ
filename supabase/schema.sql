-- FaLaQ database schema.
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: it only creates what is missing and replaces functions/policies.

-- ─────────────────────────────────────────────────────────────
-- Profiles: one row per login, with its role.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('parent', 'child')),
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- True when the signed-in user is a parent/teacher.
create or replace function public.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'parent');
$$;

-- ─────────────────────────────────────────────────────────────
-- Assignments: what the child must do on a given day.
-- kind = revision (whole surah or range) | memorization (new verses)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.profiles (id) on delete cascade,
  due_date    date not null,
  kind        text not null check (kind in ('revision', 'memorization')),
  surah       int  not null check (surah between 1 and 114),
  verse_from  int  not null check (verse_from >= 1),
  verse_to    int  not null,
  status      text not null default 'todo' check (status in ('todo', 'submitted', 'redo', 'approved')),
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  check (verse_to >= verse_from)
);
create index if not exists assignments_child_date on public.assignments (child_id, due_date);

-- ─────────────────────────────────────────────────────────────
-- Recordings: each attempt the child submits, and the parent's review.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.recordings (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null references public.assignments (id) on delete cascade,
  child_id           uuid not null references public.profiles (id) on delete cascade,
  audio_path         text not null,
  duration_sec       numeric,
  attempt            int  not null default 1,
  review             text not null default 'pending' check (review in ('pending', 'approved', 'rejected')),
  comment            text,
  note_path          text,
  note_duration_sec  numeric,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists recordings_assignment on public.recordings (assignment_id);
create index if not exists recordings_pending on public.recordings (child_id, review);

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- Parent: full access. Child: read their own rows only; all writes
-- go through the two functions below.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.assignments enable row level security;
alter table public.recordings  enable row level security;

drop policy if exists "profiles: signed-in users can read" on public.profiles;
create policy "profiles: signed-in users can read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "assignments: parent full access" on public.assignments;
create policy "assignments: parent full access" on public.assignments
  for all to authenticated using (public.is_parent()) with check (public.is_parent());

drop policy if exists "assignments: child reads own" on public.assignments;
create policy "assignments: child reads own" on public.assignments
  for select to authenticated using (child_id = auth.uid());

drop policy if exists "recordings: parent full access" on public.recordings;
create policy "recordings: parent full access" on public.recordings
  for all to authenticated using (public.is_parent()) with check (public.is_parent());

drop policy if exists "recordings: child reads own" on public.recordings;
create policy "recordings: child reads own" on public.recordings
  for select to authenticated using (child_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Child submits a recording (after uploading the audio file).
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_recording(
  p_assignment uuid,
  p_audio_path text,
  p_duration   numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.assignments;
  n int;
begin
  select * into a from public.assignments where id = p_assignment;
  if not found or a.child_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;
  if a.status not in ('todo', 'redo') then
    raise exception 'This task was already sent';
  end if;
  select count(*) + 1 into n from public.recordings where assignment_id = p_assignment;
  insert into public.recordings (assignment_id, child_id, audio_path, duration_sec, attempt)
  values (p_assignment, a.child_id, p_audio_path, p_duration, n);
  update public.assignments set status = 'submitted' where id = p_assignment;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Parent approves or asks for a redo (optionally with a voice note).
-- ─────────────────────────────────────────────────────────────
create or replace function public.review_recording(
  p_recording     uuid,
  p_approve       boolean,
  p_comment       text,
  p_note_path     text,
  p_note_duration numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recordings;
begin
  if not public.is_parent() then
    raise exception 'Not allowed';
  end if;
  select * into r from public.recordings where id = p_recording;
  if not found then
    raise exception 'Recording not found';
  end if;
  update public.recordings
     set review = case when p_approve then 'approved' else 'rejected' end,
         comment = nullif(trim(coalesce(p_comment, '')), ''),
         note_path = p_note_path,
         note_duration_sec = p_note_duration,
         reviewed_at = now()
   where id = p_recording;
  update public.assignments
     set status = case when p_approve then 'approved' else 'redo' end
   where id = r.assignment_id;
end;
$$;

revoke all on function public.submit_recording(uuid, text, numeric) from public, anon;
revoke all on function public.review_recording(uuid, boolean, text, text, numeric) from public, anon;
grant execute on function public.submit_recording(uuid, text, numeric) to authenticated;
grant execute on function public.review_recording(uuid, boolean, text, text, numeric) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Audio storage: private bucket. Each user uploads into a folder named
-- after their own user id. Parent can listen to everything; the child
-- can listen to their own recordings and the parent's voice notes.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

drop policy if exists "audio: upload into own folder" on storage.objects;
create policy "audio: upload into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audio: read" on storage.objects;
create policy "audio: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio' and (
      public.is_parent()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select id::text from public.profiles where role = 'parent')
    )
  );

-- Tell the API about the new tables right away.
notify pgrst, 'reload schema';
