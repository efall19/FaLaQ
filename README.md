# FaLaQ

A private web app for one student's Quran memorization (hifz) and revision (muraja'a), used by two people:
the child on a tablet and the parent/teacher on a phone.

**What version 0.1 does**

- **Child (tablet):** Today's checklist of revision and new-memorization tasks. Listen to Mahmoud Khalil
  Al-Husary (teaching style), verse by verse, with the current verse highlighted, repeat 1×/3×/5×, tap a
  verse to play it, and hide the text to test himself. Record, play back, redo or submit. A "needs redo"
  card shows the teacher's voice note and comment. Stars and a daily streak, with a short celebration
  when something is approved.
- **Parent (phone):** Dashboard with what's waiting for review, today's tasks, streak and stars. Review
  screen: listen, follow the text, record a voice note, add a comment, then Approve or Needs redo.
  Plan screen: add or remove tasks for any day, or copy the previous day.

Quran text comes from the Quran.com API (Uthmani script), with AlQuran.cloud as a backup. Nothing is
typed by hand. Audio comes verse by verse from EveryAyah.

**Not yet:** automatic memorization schedule (revision is automatic since v0.2), badges and progress screens, history
calendar, the 4-digit child login, offline recording queue, French. See the design canvas for where
these go.

---

## Setup (about 20 minutes, all in the browser)

You need three free accounts: GitHub (you have it), **Supabase** (database, logins, audio files) and
**Vercel** (hosting). Use "Continue with GitHub" for both.

### 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**. Name it `falaq`. Pick the region closest to
   you (e.g. *Middle East (Bahrain)* or *Central EU (Frankfurt)*). Save the database password somewhere safe.
2. Wait about a minute for it to start.

### 2. Create the tables

1. In the project: **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy everything, paste it into the editor, press **Run**.
   You should see "Success. No rows returned".

This creates the tables, the security rules (your son can only send his own recordings; only you can
review) and a private `audio` storage bucket.

### 2b. Add automatic revision (second SQL file)

Same place: **SQL Editor** → **New query** → paste everything from
[`supabase/002_auto_revision.sql`](supabase/002_auto_revision.sql) → **Run**.
(Already set up before this file existed? Just run this one. It doesn't touch your existing data.)

### 2c. Add crystals and the spaceship (third SQL file)

Same place again: paste everything from [`supabase/003_spaceship.sql`](supabase/003_spaceship.sql) → **Run**.

### 2d. Automatic clean-up of old audio (fourth SQL file)

Paste everything from [`supabase/004_cleanup.sql`](supabase/004_cleanup.sql) → **Run**.

### 3. Create the two logins

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Create yours: your email and a password. Tick **Auto Confirm User**.
3. Create your son's: any email you control (for example `yourname+adam@...` if your provider supports
   `+` addresses) and a password he can type. Tick **Auto Confirm User**.
4. Recommended: **Authentication → Sign In / Providers → Email** → turn off **Allow new users to sign up**,
   so nobody else can create an account.

### 4. Give each login its role

Back in **SQL Editor**, run this, replacing the two emails and names:

```sql
insert into public.profiles (id, role, display_name)
select id, 'parent', 'Baba' from auth.users where email = 'YOUR-EMAIL';

insert into public.profiles (id, role, display_name)
select id, 'child', 'Adam' from auth.users where email = 'SONS-EMAIL';
```

`display_name` is what the app shows ("Assalamu alaykum, Adam").

### 5. Copy the two keys

**Project Settings → API** (or **Data API**). Note:

- **Project URL**, like `https://abcdxyz.supabase.co`. Not the "RESTful endpoint" ending in `/rest/v1`
- **Publishable** key (`sb_publishable_...`) or the legacy **anon public** key (`eyJ...`). Either works

The anon key is meant to be public: the security rules from step 2 protect the data.
Never use the `service_role` key in this app.

### 6. Deploy on Vercel

1. <https://vercel.com/new> → import **efall19/FaLaQ**. Vercel detects Vite automatically.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
3. **Deploy**. After a minute you get an address like `https://falaq-xyz.vercel.app`.

Every push to `main` redeploys automatically.

### 7. Install on the tablet and the phone

Open the Vercel address on each device and sign in once (the app remembers you). Then:

- **iPad / iPhone (Safari):** Share button → **Add to Home Screen**.
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**.

Allow the microphone the first time your son records, and the first time you record a voice note.

### 8. First use

1. On your phone, **Surahs** tab: mark what your son already knows. "Mark all known" fills a whole juz;
   tap a surah to mark only a verse range.
2. **Plan** tab → **Automatic revision**: choose how often to go through everything (every 3 to 30 days)
   and any days without revision. The preview shows the coming days. Tap **Start automatic revision**.
3. Still on **Plan**, add new verses to memorize under **Day by day** (e.g. New verses: Al-Mulk 1–5), plus any
   extra revision you want by hand.

Tasks appear on the tablet within about 20 seconds, or straight away when the app is reopened.

### Stars, crystals and the spaceship

- **Stars**: 1 per approved task. A lifetime count that never goes down.
- **Crystals**: spending money. 3 for an approval on the first attempt, 2 on the second, 1 after that,
  plus 5 when every task of a day is approved.
- **My ship** (on the tablet): your son spends crystals on spaceship parts (paint, nose, window, wings,
  engine, decals, companion, trail, space scene). He can try parts on before buying, and swap between parts he owns.
- Prices live in `src/lib/ship.ts`. After changing them, run `node scripts/gen-shop-sql.mjs` and update the
  catalog in the database with its output.

### What is kept, and for how long

- Recordings and voice notes are removed automatically once their task's day is more than a day old
  (today's and yesterday's always stay). The parent's app does this when it opens.
- Recordings still waiting for review are never removed.
- **Kept recordings stay forever.** When you approve a whole surah that isn't known yet, the review screen offers
  "Add to known surahs" and "Keep this recording" (both ticked). You can tick "Keep" on any approval.
  Kept recordings can be played from the Surahs tab.
- Approvals, stars, crystals and history are never removed. Only audio files are.

### How automatic revision works

- Every known surah (or known verse range) comes up once per cycle.
- Days are balanced by **amount of text**, not by number of surahs, so a day with a long surah gets fewer others.
- Order goes from the end of the Quran backwards (An-Nas first).
- Surahs longer than about two pages are split into verse ranges across days. Short surahs are never split.
- If there is too little to fill every day of the cycle, the cycle simply gets shorter.
- Changing the cycle, rest days or the known list recalculates the coming days. Anything already started
  stays as it is: if today's revision was already started, the new plan begins tomorrow.
- Tasks you add by hand are never touched by the automatic plan.

---

## Working on the code

You never need it on your computer. To edit in the browser, open the repo on GitHub and press `.`
(the web editor) or use **Code → Codespaces**. Push to `main` and Vercel redeploys.

If you do run it locally: `npm install`, copy `.env.example` to `.env.local` and fill it in, then `npm run dev`.

### Structure

```
supabase/schema.sql          tables, security rules, storage bucket, submit/review functions
supabase/002_auto_revision.sql   known surahs, revision settings, the balanced scheduler
src/lib/quran.ts             surah list, verse text, reciter audio URLs (change reciter here)
src/lib/data.ts              all database calls, stars and streak
src/lib/useReciter.ts        verse-by-verse player (repeat, prev/next, highlight)
src/lib/useRecorder.ts       microphone recording
src/screens/child/           Today, Listen/Record screen, recorder panel
src/screens/parent/          Dashboard, Review, Plan + AutoRevision, Surahs
src/styles.css               design tokens and all styles
```

### Data model, for SQL

- `assignments`: one row per task per day (`due_date`, `kind`, `surah`, `verse_from`, `verse_to`,
  `status` = todo / submitted / redo / approved).
- `recordings`: one row per attempt, with the review (`pending` / `approved` / `rejected`), comment and
  voice-note path.

For example, approval rate by surah:

```sql
select a.surah,
       count(*) filter (where r.review = 'approved') as approved,
       count(*) filter (where r.review = 'rejected') as redo,
       round(100.0 * count(*) filter (where r.review = 'approved') / nullif(count(*) filter (where r.review <> 'pending'), 0)) as pct
from recordings r join assignments a on a.id = r.assignment_id
group by a.surah order by a.surah desc;
```

## Notes

- **Quran text** is shown in the Amiri Quran font, loaded from Google Fonts. On the first visit the
  device needs internet to fetch it; after that the browser keeps it.
- **Reciter:** to switch, change `RECITER.base` in `src/lib/quran.ts` to another EveryAyah folder
  (e.g. `Husary_128kbps` or `Alafasy_128kbps`).
- **Recordings** are stored in the private Supabase bucket `audio`. The free plan includes 1 GB, which
  holds thousands of recitations.
