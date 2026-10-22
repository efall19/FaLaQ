-- FaLaQ — automatic revision plan.
-- Run once in Supabase → SQL Editor, after schema.sql. Safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- What the student already knows (whole surah or a verse range).
-- weight = amount of text (Arabic letters), used to balance the days.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.memorized (
  child_id    uuid not null references public.profiles (id) on delete cascade,
  surah       int  not null check (surah between 1 and 114),
  verse_from  int  not null default 1 check (verse_from >= 1),
  verse_to    int  not null,
  weight      int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (child_id, surah),
  check (verse_to >= verse_from)
);

-- How often to cycle through everything, and which weekdays have no revision.
-- rest_weekdays uses 0 = Sunday … 6 = Saturday.
create table if not exists public.revision_settings (
  child_id       uuid primary key references public.profiles (id) on delete cascade,
  cycle_days     int  not null default 7 check (cycle_days between 1 and 60),
  rest_weekdays  int[] not null default '{}',
  start_date     date not null default current_date,
  active         boolean not null default true,
  updated_at     timestamptz not null default now()
);

-- Tasks created by the plan are marked 'auto'; tasks you add by hand stay 'manual'.
alter table public.assignments add column if not exists source text not null default 'manual';
do $$ begin
  alter table public.assignments add constraint assignments_source_check check (source in ('manual', 'auto'));
exception when duplicate_object then null; end $$;

alter table public.memorized enable row level security;
alter table public.revision_settings enable row level security;

drop policy if exists "memorized: parent full access" on public.memorized;
create policy "memorized: parent full access" on public.memorized
  for all to authenticated using (public.is_parent()) with check (public.is_parent());
drop policy if exists "memorized: child reads own" on public.memorized;
create policy "memorized: child reads own" on public.memorized
  for select to authenticated using (child_id = auth.uid());

drop policy if exists "revision_settings: parent full access" on public.revision_settings;
create policy "revision_settings: parent full access" on public.revision_settings
  for all to authenticated using (public.is_parent()) with check (public.is_parent());
drop policy if exists "revision_settings: child reads own" on public.revision_settings;
create policy "revision_settings: child reads own" on public.revision_settings
  for select to authenticated using (child_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Split the known material into p_cycle days of roughly equal text.
-- Order: from the end of the Quran backwards (An-Nas first).
-- A surah much longer than one day's share is cut into verse chunks.
-- ─────────────────────────────────────────────────────────────
create or replace function public.revision_units_raw(p_child uuid, p_cycle int)
returns table (bucket int, surah int, verse_from int, verse_to int, ord int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total   numeric;
  target  numeric;
  cum     numeric := 0;
  m       record;
  n       int;
  len     int;
  chunk   int;
  f       int;
  t       int;
  w       numeric;
  o       int := 0;
begin
  if p_cycle is null or p_cycle < 1 then return; end if;
  select coalesce(sum(greatest(mm.weight, 1)), 0) into total from public.memorized mm where mm.child_id = p_child;
  if total = 0 then return; end if;
  target := total / p_cycle;

  for m in
    select mm.surah as s, mm.verse_from as vf, mm.verse_to as vt, greatest(mm.weight, 1) as wt
    from public.memorized mm where mm.child_id = p_child order by mm.surah desc
  loop
    len := m.vt - m.vf + 1;
    n := 1;
    -- Only long surahs (more than ~2 mushaf pages) are ever split, into
    -- pieces of about one day's share (and never less than ~1 page).
    if m.wt > greatest(target * 1.5, 1600) then
      n := least(greatest(round(m.wt / greatest(target, 800))::int, 1), len);
    end if;
    chunk := ceil(len::numeric / n)::int;
    f := m.vf;
    while f <= m.vt loop
      t := least(m.vt, f + chunk - 1);
      w := m.wt * (t - f + 1)::numeric / len;
      bucket := least(p_cycle - 1, floor((cum + w / 2) / total * p_cycle)::int);
      surah := m.s;
      verse_from := f;
      verse_to := t;
      ord := o;
      return next;
      cum := cum + w;
      o := o + 1;
      f := t + 1;
    end loop;
  end loop;
end;
$$;

-- Same, with day numbers made consecutive: when there is too little material
-- to fill every day of the cycle, the cycle simply becomes shorter.
create or replace function public.revision_units(p_child uuid, p_cycle int)
returns table (bucket int, surah int, verse_from int, verse_to int, ord int)
language sql
stable
security definer
set search_path = public
as $$
  select (dense_rank() over (order by r.bucket) - 1)::int, r.surah, r.verse_from, r.verse_to, r.ord
  from public.revision_units_raw(p_child, p_cycle) r;
$$;

-- ─────────────────────────────────────────────────────────────
-- The schedule for p_days days from p_from, for given settings.
-- Used both for the preview (unsaved settings) and to create tasks.
-- ─────────────────────────────────────────────────────────────
create or replace function public.revision_schedule(
  p_child  uuid,
  p_cycle  int,
  p_rest   int[],
  p_start  date,
  p_from   date,
  p_days   int
) returns table (day date, surah int, verse_from int, verse_to int, ord int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d    date;
  idx  int;
  k    int;
  u    record;
begin
  if not (public.is_parent() or auth.uid() = p_child) then
    raise exception 'Not allowed';
  end if;
  p_rest := coalesce(p_rest, '{}');
  select coalesce(max(ru.bucket) + 1, 0) into k from public.revision_units(p_child, p_cycle) ru;
  if k = 0 then return; end if;
  -- revision days already elapsed between start and the first requested day
  select count(*) into idx
  from generate_series(p_start, p_from - 1, interval '1 day') g(x)
  where not (extract(dow from g.x)::int = any (p_rest));

  for d in select g.x::date from generate_series(p_from, p_from + p_days - 1, interval '1 day') g(x) loop
    if extract(dow from d)::int = any (p_rest) or d < p_start then
      continue;
    end if;
    for u in select * from public.revision_units(p_child, p_cycle) ru where ru.bucket = idx % k order by ru.ord loop
      day := d;
      surah := u.surah;
      verse_from := u.verse_from;
      verse_to := u.verse_to;
      ord := u.ord;
      return next;
    end loop;
    idx := idx + 1;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Create the automatic revision tasks for the coming days.
-- Called by both apps when they open. A day that already has
-- automatic tasks is left alone. p_today is the device's local date.
-- ─────────────────────────────────────────────────────────────
create or replace function public.ensure_revision_plan(p_child uuid, p_today date, p_days int default 7)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.revision_settings;
  n int;
begin
  if not (public.is_parent() or auth.uid() = p_child) then
    raise exception 'Not allowed';
  end if;
  select * into s from public.revision_settings where child_id = p_child;
  if not found or not s.active then
    return 0;
  end if;

  insert into public.assignments (child_id, due_date, kind, surah, verse_from, verse_to, position, source)
  select p_child, r.day, 'revision', r.surah, r.verse_from, r.verse_to, r.ord, 'auto'
  from public.revision_schedule(p_child, s.cycle_days, s.rest_weekdays, s.start_date, p_today, greatest(1, least(p_days, 31))) r
  where not exists (
      select 1 from public.assignments a
      where a.child_id = p_child and a.due_date = r.day and a.source = 'auto')
    and not exists (
      select 1 from public.assignments a
      where a.child_id = p_child and a.due_date = r.day and a.kind = 'revision'
        and a.surah = r.surah and a.verse_from = r.verse_from and a.verse_to = r.verse_to);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Recalculate after the settings or the known surahs change.
-- Removes automatic tasks not started yet (tomorrow onwards, and today
-- too if nothing of today's automatic plan was started), then refills.
-- p_restart = true when the cycle or rest days changed: the cycle then
-- starts again today, or tomorrow if today's plan was already started.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.rebuild_revision_plan(uuid, date, int);
create or replace function public.rebuild_revision_plan(
  p_child   uuid,
  p_today   date,
  p_restart boolean default false,
  p_days    int default 7
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today_started boolean;
begin
  if not public.is_parent() then
    raise exception 'Not allowed';
  end if;
  select exists (
    select 1 from public.assignments b
    where b.child_id = p_child and b.due_date = p_today and b.source = 'auto' and b.status <> 'todo'
  ) into today_started;

  if p_restart then
    update public.revision_settings
       set start_date = case when today_started then p_today + 1 else p_today end,
           updated_at = now()
     where child_id = p_child;
  end if;

  delete from public.assignments a
  where a.child_id = p_child and a.source = 'auto' and a.status = 'todo'
    and (a.due_date > p_today or (a.due_date = p_today and not today_started));
  return public.ensure_revision_plan(p_child, p_today, p_days);
end;
$$;

revoke all on function public.revision_units_raw(uuid, int) from public, anon, authenticated;
revoke all on function public.revision_units(uuid, int) from public, anon, authenticated;
revoke all on function public.revision_schedule(uuid, int, int[], date, date, int) from public, anon;
revoke all on function public.ensure_revision_plan(uuid, date, int) from public, anon;
revoke all on function public.rebuild_revision_plan(uuid, date, boolean, int) from public, anon;
grant execute on function public.revision_schedule(uuid, int, int[], date, date, int) to authenticated;
grant execute on function public.ensure_revision_plan(uuid, date, int) to authenticated;
grant execute on function public.rebuild_revision_plan(uuid, date, boolean, int) to authenticated;

-- Tell the API about the new tables right away.
notify pgrst, 'reload schema';
