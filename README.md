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

**Not in v0.1 yet:** automatic memorization/revision schedules, badges and progress screens, history
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

On your phone: **Plan** → add today's tasks (for example Revision: Al-Ikhlas, Al-Falaq, An-Nas; New
verses: Al-Mulk 1–5). They appear on the tablet within about 20 seconds, or straight away when the app is reopened.

---

## Working on the code

You never need it on your computer. To edit in the browser, open the repo on GitHub and press `.`
(the web editor) or use **Code → Codespaces**. Push to `main` and Vercel redeploys.

If you do run it locally: `npm install`, copy `.env.example` to `.env.local` and fill it in, then `npm run dev`.

### Structure

```
supabase/schema.sql          tables, security rules, storage bucket, submit/review functions
src/lib/quran.ts             surah list, verse text, reciter audio URLs (change reciter here)
src/lib/data.ts              all database calls, stars and streak
src/lib/useReciter.ts        verse-by-verse player (repeat, prev/next, highlight)
src/lib/useRecorder.ts       microphone recording
src/screens/child/           Today, Listen/Record screen, recorder panel
src/screens/parent/          Dashboard, Review, Plan
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
