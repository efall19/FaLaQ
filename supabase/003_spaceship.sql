-- FaLaQ — crystals and the spaceship shop.
-- Run once in Supabase → SQL Editor, after 002_auto_revision.sql. Safe to re-run.
--
-- Rules:
--   Stars    = 1 per approved task, lifetime, never spent (unchanged).
--   Crystals = spending money: 3 for an approval on the first attempt, 2 on the
--              second, 1 after that, plus 5 when every task of a day is approved.

-- Crystals earned by each task (set when the parent approves).
alter table public.assignments add column if not exists crystals int not null default 0;

-- ─────────────────────────────────────────────────────────────
-- Shop catalog, purchases, and what is fitted on the ship
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shop_items (
  id     text primary key,
  slot   text not null,
  name   text not null,
  price  int  not null check (price >= 0)
);

create table if not exists public.purchases (
  child_id   uuid not null references public.profiles (id) on delete cascade,
  item_id    text not null references public.shop_items (id),
  price      int  not null,
  bought_at  timestamptz not null default now(),
  primary key (child_id, item_id)
);

create table if not exists public.ships (
  child_id    uuid primary key references public.profiles (id) on delete cascade,
  equipped    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;
alter table public.ships enable row level security;

do $$ begin
  create policy "shop_items: signed-in users can read" on public.shop_items for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "purchases: parent full access" on public.purchases for all to authenticated using (public.is_parent()) with check (public.is_parent());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "purchases: child reads own" on public.purchases for select to authenticated using (child_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ships: parent full access" on public.ships for all to authenticated using (public.is_parent()) with check (public.is_parent());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ships: child reads own" on public.ships for select to authenticated using (child_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- Catalog (generated from src/lib/ship.ts by scripts/gen-shop-sql.mjs)
-- ─────────────────────────────────────────────────────────────
insert into public.shop_items (id, slot, name, price) values
  ('paint-white', 'paint', 'Classic white', 0),
  ('paint-teal', 'paint', 'Ocean teal', 20),
  ('paint-orange', 'paint', 'Sunset orange', 20),
  ('paint-blue', 'paint', 'Royal blue', 30),
  ('paint-gold', 'paint', 'Pure gold', 150),
  ('nose-cap', 'nose', 'Round cap', 0),
  ('nose-cone', 'nose', 'Pointed cone', 25),
  ('nose-antenna', 'nose', 'Antenna dish', 45),
  ('nose-beacon', 'nose', 'Star beacon', 70),
  ('window-round', 'window', 'Round window', 0),
  ('window-dome', 'window', 'Big dome', 30),
  ('window-twin', 'window', 'Twin portholes', 40),
  ('window-hex', 'window', 'Hexagon window', 60),
  ('wings-fins', 'wings', 'Small fins', 0),
  ('wings-swept', 'wings', 'Swept wings', 50),
  ('wings-solar', 'wings', 'Solar panels', 80),
  ('wings-twin', 'wings', 'Double wings', 100),
  ('engine-single', 'engine', 'Single thruster', 0),
  ('engine-twin', 'engine', 'Twin boosters', 60),
  ('engine-plasma', 'engine', 'Blue plasma', 90),
  ('engine-triple', 'engine', 'Triple thrusters', 140),
  ('decal-stripes', 'decal', 'Racing stripes', 15),
  ('decal-number', 'decal', 'Number 114', 25),
  ('decal-crescent', 'decal', 'Crescent & star', 35),
  ('companion-satellite', 'companion', 'Satellite', 80),
  ('companion-drone', 'companion', 'Helper drone', 120),
  ('companion-moon', 'companion', 'Little moon', 160),
  ('trail-sparkle', 'trail', 'Sparkle trail', 40),
  ('trail-rainbow', 'trail', 'Rainbow trail', 110),
  ('scene-stars', 'scene', 'Starry sky', 0),
  ('scene-moon', 'scene', 'Moon base', 70),
  ('scene-saturn', 'scene', 'Ringed planet', 90),
  ('scene-nebula', 'scene', 'Nebula', 120),
  ('scene-earth', 'scene', 'Earth view', 200)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price;

-- ─────────────────────────────────────────────────────────────
-- Approving now also sets the task's crystals (3 / 2 / 1 by attempt).
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
     set status = case when p_approve then 'approved' else 'redo' end,
         crystals = case
           when not p_approve then 0
           when r.attempt <= 1 then 3
           when r.attempt = 2 then 2
           else 1
         end
   where id = r.assignment_id;
end;
$$;

-- Give crystals for everything approved before this feature existed.
update public.assignments a
   set crystals = case when r.attempt <= 1 then 3 when r.attempt = 2 then 2 else 1 end
  from public.recordings r
 where r.assignment_id = a.id and r.review = 'approved' and a.status = 'approved' and a.crystals = 0;

-- ─────────────────────────────────────────────────────────────
-- Wallet: earned + full-day bonuses − spent. p_today = the device's date.
-- ─────────────────────────────────────────────────────────────
create or replace function public.crystal_balance(p_child uuid, p_today date)
returns table (earned int, day_bonus int, spent int, balance int, today_earned int, today_complete boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  full_days int;
begin
  if not (public.is_parent() or auth.uid() = p_child) then
    raise exception 'Not allowed';
  end if;
  select coalesce(sum(a.crystals), 0) into earned from public.assignments a where a.child_id = p_child;
  select count(*) into full_days from (
    select a.due_date from public.assignments a where a.child_id = p_child
    group by a.due_date having bool_and(a.status = 'approved')
  ) d;
  day_bonus := full_days * 5;
  select coalesce(sum(p.price), 0) into spent from public.purchases p where p.child_id = p_child;
  balance := earned + day_bonus - spent;
  select coalesce(sum(a.crystals), 0), coalesce(bool_and(a.status = 'approved'), false)
    into today_earned, today_complete
    from public.assignments a where a.child_id = p_child and a.due_date = p_today;
  if today_complete then today_earned := today_earned + 5; end if;
  return next;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- The child buys a part (it is fitted straight away).
-- ─────────────────────────────────────────────────────────────
create or replace function public.buy_item(p_item text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  item  public.shop_items;
  money int;
begin
  if not exists (select 1 from public.profiles where id = me and role = 'child') then
    raise exception 'Only the student can buy parts';
  end if;
  perform pg_advisory_xact_lock(hashtext(me::text));
  select * into item from public.shop_items where id = p_item;
  if not found then raise exception 'Unknown part'; end if;
  if item.price = 0 or exists (select 1 from public.purchases where child_id = me and item_id = p_item) then
    raise exception 'Already yours';
  end if;
  select b.balance into money from public.crystal_balance(me, current_date) b;
  if money < item.price then raise exception 'Not enough crystals'; end if;
  insert into public.purchases (child_id, item_id, price) values (me, p_item, item.price);
  insert into public.ships (child_id, equipped) values (me, jsonb_build_object(item.slot, item.id))
  on conflict (child_id) do update set equipped = public.ships.equipped || jsonb_build_object(item.slot, item.id), updated_at = now();
  return money - item.price;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- The child fits a part they own (or a free one). p_item = null takes
-- an optional part off (decal, companion, trail).
-- ─────────────────────────────────────────────────────────────
create or replace function public.equip_item(p_slot text, p_item text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = me and role = 'child') then
    raise exception 'Only the student can change the ship';
  end if;
  if p_item is null then
    if p_slot not in ('decal', 'companion', 'trail') then raise exception 'This part is needed'; end if;
  elsif not exists (
    select 1 from public.shop_items s
    where s.id = p_item and s.slot = p_slot
      and (s.price = 0 or exists (select 1 from public.purchases p where p.child_id = me and p.item_id = s.id))
  ) then
    raise exception 'Not yours yet';
  end if;
  insert into public.ships (child_id, equipped) values (me, jsonb_build_object(p_slot, p_item))
  on conflict (child_id) do update set equipped = public.ships.equipped || jsonb_build_object(p_slot, p_item), updated_at = now();
end;
$$;

grant execute on function public.crystal_balance(uuid, date) to authenticated;
grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.equip_item(text, text) to authenticated;

notify pgrst, 'reload schema';
