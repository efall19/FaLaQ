-- FaLaQ — automatic clean-up of old audio, with "keep" for milestone recordings.
-- Run once in Supabase → SQL Editor, after 003_spaceship.sql. Safe to re-run.
--
-- Rule: once a task's day is more than one day old (today and yesterday are kept),
-- its reviewed recordings and all its voice notes are removed from storage,
-- except recordings marked keep = true. Recordings still waiting for review are
-- never removed. The database rows (approvals, stars, crystals) always stay.
-- The parent's app runs the clean-up when it opens.

alter table public.recordings add column if not exists keep boolean not null default false;
alter table public.recordings add column if not exists audio_removed_at timestamptz;
alter table public.recordings add column if not exists note_removed_at timestamptz;

-- Files that can go: (recording id, which file, storage path).
create or replace function public.cleanup_candidates(p_today date)
returns table (recording_id uuid, kind text, path text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, 'audio', r.audio_path
  from public.recordings r
  join public.assignments a on a.id = r.assignment_id
  where public.is_parent()
    and a.due_date < p_today - 1
    and r.review <> 'pending'
    and not r.keep
    and r.audio_removed_at is null
  union all
  select r.id, 'note', r.note_path
  from public.recordings r
  join public.assignments a on a.id = r.assignment_id
  where public.is_parent()
    and a.due_date < p_today - 1
    and r.note_path is not null
    and r.note_removed_at is null
  limit 500;
$$;

-- After the app removed the files, record that they are gone.
create or replace function public.mark_files_removed(p_audio uuid[], p_notes uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_parent() then raise exception 'Not allowed'; end if;
  update public.recordings set audio_removed_at = now()
   where id = any (coalesce(p_audio, '{}')) and not keep and audio_removed_at is null;
  update public.recordings set note_removed_at = now()
   where id = any (coalesce(p_notes, '{}')) and note_removed_at is null;
end;
$$;

grant execute on function public.cleanup_candidates(date) to authenticated;
grant execute on function public.mark_files_removed(uuid[], uuid[]) to authenticated;

-- The parent may remove files from the audio bucket.
do $$ begin
  create policy "audio: parent can remove" on storage.objects
    for delete to authenticated
    using (bucket_id = 'audio' and public.is_parent());
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
