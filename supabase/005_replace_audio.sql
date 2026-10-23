-- FaLaQ — let the student's app swap a pending recording's file for a
-- converted copy (WebM → WAV, so it plays on iPhone). Safe to re-run.

create or replace function public.replace_recording_audio(p_recording uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'Not allowed';
  end if;
  update public.recordings
     set audio_path = p_path
   where id = p_recording and child_id = auth.uid() and review = 'pending';
  if not found then
    raise exception 'Recording not found or already reviewed';
  end if;
end;
$$;

grant execute on function public.replace_recording_audio(uuid, text) to authenticated;

notify pgrst, 'reload schema';
