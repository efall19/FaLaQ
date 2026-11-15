-- FaLaQ — Reading lessons (Nouraniya-style), one page a day.
-- Run once in Supabase → SQL Editor, after 005_replace_audio.sql. Safe to re-run.
--
-- A reading page is stored as an assignment with track = 'reading', so it gets
-- the same recorder, review, stars, crystals, streak and clean-up as surahs.
-- For these rows the surah / verse columns hold placeholders (1, 1–1) and the
-- real content is in reading_lesson, reading_page and reading_content.

alter table public.assignments add column if not exists track text not null default 'quran'
  check (track in ('quran', 'reading'));
alter table public.assignments add column if not exists reading_lesson int;
alter table public.assignments add column if not exists reading_page int;
alter table public.assignments add column if not exists reading_content jsonb;
create index if not exists assignments_reading on public.assignments (child_id, track);
-- One open reading page at a time, and at most one reading page per day
-- (also protects against two devices starting a page at the same moment).
create unique index if not exists assignments_one_open_reading
  on public.assignments (child_id) where track = 'reading' and status <> 'approved';
create unique index if not exists assignments_one_reading_per_day
  on public.assignments (child_id, due_date) where track = 'reading';

-- ─────────────────────────────────────────────────────────────
-- Settings per child: on/off, which lessons the parent has opened,
-- and the method switches (spelling, review row, tricky items, …).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reading_settings (
  child_id    uuid primary key references public.profiles (id),
  active      boolean not null default false,
  opened      int[] not null default '{1}',
  options     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- The parent's model reading for a page.
create table if not exists public.reading_audio (
  child_id      uuid not null references public.profiles (id),
  lesson        int not null check (lesson between 1 and 17),
  page          int not null check (page >= 1),
  path          text not null,
  duration_sec  numeric,
  updated_at    timestamptz not null default now(),
  primary key (child_id, lesson, page)
);

-- Syllables or words the parent marked as mistakes. They come back on later
-- pages until a page that contains them is approved at the first attempt.
create table if not exists public.reading_mistakes (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.profiles (id),
  assignment_id  uuid,
  lesson         int not null,
  page           int not null,
  item           text not null,
  created_at     timestamptz not null default now(),
  cleared_at     timestamptz
);
create index if not exists reading_mistakes_child on public.reading_mistakes (child_id, cleared_at);

alter table public.reading_settings enable row level security;
alter table public.reading_audio enable row level security;
alter table public.reading_mistakes enable row level security;

do $$ begin
  create policy "reading_settings: parent full access" on public.reading_settings for all to authenticated using (public.is_parent()) with check (public.is_parent());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_settings: child reads own" on public.reading_settings for select to authenticated using (child_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_audio: parent full access" on public.reading_audio for all to authenticated using (public.is_parent()) with check (public.is_parent());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_audio: child reads own" on public.reading_audio for select to authenticated using (child_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_mistakes: parent full access" on public.reading_mistakes for all to authenticated using (public.is_parent()) with check (public.is_parent());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_mistakes: child reads own" on public.reading_mistakes for select to authenticated using (child_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- The student's app starts today's page (the page content is built
-- by the app, so the parent reviews exactly what was shown).
-- ─────────────────────────────────────────────────────────────
create or replace function public.start_reading_page(
  p_today   date,
  p_lesson  int,
  p_page    int,
  p_content jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  s public.reading_settings;
  new_id uuid;
begin
  if me is null or not exists (select 1 from public.profiles where id = me and role = 'child') then
    raise exception 'Not allowed';
  end if;
  if p_lesson not between 1 and 17 or p_page < 1 then
    raise exception 'Unknown page';
  end if;
  select * into s from public.reading_settings where child_id = me;
  if not found or not s.active then
    raise exception 'Reading is switched off';
  end if;
  if not (p_lesson = any (s.opened)) then
    raise exception 'This lesson is not open yet';
  end if;
  -- One page at a time, one page a day.
  if exists (select 1 from public.assignments
              where child_id = me and track = 'reading' and status <> 'approved') then
    raise exception 'A reading page is already open';
  end if;
  if exists (select 1 from public.assignments
              where child_id = me and track = 'reading' and due_date = p_today) then
    raise exception 'Today''s reading page is done';
  end if;
  insert into public.assignments (child_id, due_date, kind, surah, verse_from, verse_to, position, source,
                                  track, reading_lesson, reading_page, reading_content)
  values (me, p_today, 'revision', 1, 1, 1, 99, 'manual',
          'reading', p_lesson, p_page, p_content)
  returning id into new_id;
  return new_id;
end;
$$;

-- An unfinished page from an earlier day moves to today, so it is never lost.
create or replace function public.carry_reading_page(p_assignment uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.assignments
     set due_date = p_today
   where id = p_assignment
     and child_id = auth.uid()
     and track = 'reading'
     and status <> 'approved'
     and due_date < p_today;
end;
$$;

grant execute on function public.start_reading_page(date, int, int, jsonb) to authenticated;
grant execute on function public.carry_reading_page(uuid, date) to authenticated;

notify pgrst, 'reload schema';
