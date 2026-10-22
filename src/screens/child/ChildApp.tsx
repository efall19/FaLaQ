import { useCallback, useEffect, useState } from 'react';
import type { Assignment, Profile, Recording } from '../../lib/types';
import { countStars, ensurePlan, fetchAssignments, fetchRecordingsFor, fetchStreak, fetchWallet, type Wallet } from '../../lib/data';
import { isoDate } from '../../lib/dates';
import { usePolling } from '../../lib/usePolling';
import { useChapters } from '../../lib/useVerses';
import { Today } from './Today';
import { SurahScreen } from './SurahScreen';
import { ShipScreen } from './ShipScreen';
import { DAY_BONUS } from '../../lib/ship';
import { Toast } from '../../components/Bits';
import { IconStar } from '../../components/Icons';

export interface ChildDay {
  date: string;
  assignments: Assignment[];
  /** Most recent recording for each assignment id. */
  latest: Record<string, Recording | undefined>;
  stars: number;
  streak: number;
  wallet: Wallet | null;
}

async function loadDay(childId: string): Promise<ChildDay> {
  const date = isoDate();
  // Top up the automatic revision plan; harmless if it isn't set up.
  await ensurePlan(childId, date).catch(() => undefined);
  const assignments = await fetchAssignments(childId, date, date);
  const [recs, stars, streak, wallet] = await Promise.all([
    fetchRecordingsFor(assignments.map((a) => a.id)),
    countStars(childId),
    fetchStreak(childId),
    fetchWallet(childId, date).catch(() => null), // null until the spaceship SQL is installed
  ]);
  const latest: ChildDay['latest'] = {};
  for (const r of recs) if (!latest[r.assignment_id]) latest[r.assignment_id] = r; // newest first
  return { date, assignments, latest, stars, streak, wallet };
}

type View = { name: 'today' } | { name: 'ship' } | { name: 'surah'; id: string; mode: 'listen' | 'record' };

export function ChildApp({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [view, setView] = useState<View>({ name: 'today' });
  const day = usePolling(() => loadDay(profile.id), [profile.id]);
  const { chapters } = useChapters();
  const [celebrate, setCelebrate] = useState<{ title: string; sub: string } | null>(null);

  // Celebrate newly approved tasks once, the first time the child sees them.
  useEffect(() => {
    if (!day.data || !chapters) return;
    const key = `falaq.seenApproved.${profile.id}`;
    const approved = day.data.assignments.filter((a) => a.status === 'approved').map((a) => a.id);
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      seen = null;
    }
    const fresh = seen ? approved.filter((id) => !seen!.includes(id)) : [];
    if (fresh.length) {
      const items = day.data.assignments.filter((x) => fresh.includes(x.id));
      const name = items.length === 1 ? chapters[items[0].surah - 1]?.name : '';
      const stars = items.length;
      let crystals = items.reduce((n, x) => n + (x.crystals ?? 0), 0);
      const dayDone = day.data.assignments.length > 0 && day.data.assignments.every((x) => x.status === 'approved');
      if (dayDone) crystals += DAY_BONUS;
      const parts = [`${stars} ${stars === 1 ? 'star' : 'stars'}`];
      if (crystals) parts.push(`${crystals} crystals`);
      setCelebrate({
        title: dayDone ? 'MashaAllah, today is complete!' : name ? `MashaAllah, ${name} approved!` : 'MashaAllah, approved!',
        sub: `You earned ${parts.join(' and ')}${dayDone ? `, including the ${DAY_BONUS}-crystal bonus` : ''}.`,
      });
    }
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(new Set([...(seen ?? []), ...approved])).slice(-500)));
    } catch {
      /* ignore */
    }
  }, [day.data, chapters, profile.id]);

  const endCelebrate = useCallback(() => setCelebrate(null), []);

  const current = view.name === 'surah' ? day.data?.assignments.find((a) => a.id === view.id) : undefined;

  return (
    <>
      {view.name === 'surah' && current && chapters ? (
        <SurahScreen
          assignment={current}
          chapter={chapters[current.surah - 1]}
          childId={profile.id}
          latest={day.data?.latest[current.id]}
          mode={view.mode}
          onMode={(mode) => setView({ name: 'surah', id: current.id, mode })}
          onBack={() => {
            setView({ name: 'today' });
            day.reload();
          }}
          onSent={() => day.reload()}
        />
      ) : view.name === 'ship' ? (
        <ShipScreen
          profile={profile}
          wallet={day.data?.wallet ?? null}
          onWalletChange={day.reload}
          onTab={(t) => setView({ name: t })}
          onSignOut={onSignOut}
        />
      ) : (
        <Today
          profile={profile}
          day={day.data}
          loading={day.loading}
          error={day.error}
          chapters={chapters}
          onRetry={day.reload}
          onOpen={(id, mode) => setView({ name: 'surah', id, mode })}
          onSignOut={onSignOut}
          onTab={(t) => setView({ name: t })}
        />
      )}
      {celebrate && (
        <Toast onDone={endCelebrate} ms={5000}>
          <span className="pop">
            <IconStar size={40} />
          </span>
          <span>
            <strong>{celebrate.title}</strong>
            <br />
            <span className="toast-sub">{celebrate.sub}</span>
          </span>
        </Toast>
      )}
    </>
  );
}
