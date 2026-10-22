import type { Assignment, Profile, RecordingWithAssignment } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { countStars, ensurePlan, fetchAssignments, fetchPending, fetchRecentlyReviewed, fetchStreak } from '../../lib/data';
import { clock, fmtSec, greeting, isoDate, shortDate } from '../../lib/dates';
import { usePolling } from '../../lib/usePolling';
import { StatusBadge } from '../../components/Bits';
import { IconForward, IconMic, IconPlus, IconWifiOff } from '../../components/Icons';

interface DashData {
  pending: RecordingWithAssignment[];
  today: Assignment[];
  recent: RecordingWithAssignment[];
  stars: number;
  streak: number;
}

async function loadDash(childId: string): Promise<DashData> {
  const d = isoDate();
  await ensurePlan(childId, d).catch(() => undefined);
  const [pending, today, recent, stars, streak] = await Promise.all([
    fetchPending(childId),
    fetchAssignments(childId, d, d),
    fetchRecentlyReviewed(childId, 6),
    countStars(childId),
    fetchStreak(childId),
  ]);
  return { pending, today, recent, stars, streak };
}

export function Dashboard({
  parent,
  child,
  chapters,
  onOpenReview,
  onOpenPlan,
}: {
  parent: Profile;
  child: Profile;
  chapters: Chapter[] | null;
  onOpenReview: (id: string) => void;
  onOpenPlan: () => void;
}) {
  const dash = usePolling(() => loadDash(child.id), [child.id], 15000);
  const name = (n: number) => chapters?.[n - 1]?.name ?? `Surah ${n}`;
  const range = (a: Assignment) => `${a.verse_from}–${a.verse_to}`;
  const data = dash.data;
  const done = data ? data.today.filter((a) => a.status === 'approved').length : 0;

  return (
    <div className="p-page">
      <div className="row-between">
        <span className="muted small">
          {greeting()}, {parent.display_name}
        </span>
        <span className="pill-student">
          <span className="avatar sm">{child.display_name.slice(0, 1).toUpperCase()}</span>
          {child.display_name}
        </span>
      </div>
      <h1 className="p-title">{child.display_name}'s day</h1>

      {dash.error && (
        <div className="banner" role="status">
          <IconWifiOff size={22} />
          <span className="grow">Can't reach the server. Showing the last update.</span>
          <button type="button" className="btn btn-light btn-sm" onClick={dash.reload}>
            Retry
          </button>
        </div>
      )}

      <div className="tiles">
        <button
          type="button"
          className={`tile${data?.pending.length ? ' tile-blue' : ''}`}
          onClick={() => data?.pending[0] && onOpenReview(data.pending[0].id)}
        >
          <strong>{data?.pending.length ?? '–'}</strong>
          <span>To review</span>
        </button>
        <div className="tile">
          <strong>{data?.streak ?? '–'}</strong>
          <span>Day streak</span>
        </div>
        <div className="tile">
          <strong>{data?.stars ?? '–'}</strong>
          <span>Stars</span>
        </div>
      </div>

      <h2 className="p-h2">To review</h2>
      {data && data.pending.length === 0 && <div className="empty-box">All caught up. New recordings appear here.</div>}
      {data?.pending.map((r) => (
        <button key={r.id} type="button" className="list-card" onClick={() => onOpenReview(r.id)}>
          <span className={`icon-circle ${r.assignment.kind === 'memorization' ? 'gold' : 'blue'}`}>
            {r.assignment.kind === 'memorization' ? <IconPlus /> : <IconMic />}
          </span>
          <span className="grow col">
            <strong>
              {name(r.assignment.surah)} · {range(r.assignment)}
            </strong>
            <span className="muted small">
              {r.assignment.kind === 'memorization' ? 'New memorization' : 'Revision'} ·{' '}
              {r.assignment.due_date === isoDate() ? 'today' : shortDate(r.assignment.due_date)} {clock(r.created_at)} ·{' '}
              {fmtSec(r.duration_sec)} · attempt {r.attempt}
            </span>
          </span>
          <IconForward size={20} />
        </button>
      ))}

      <div className="row-between">
        <h2 className="p-h2">
          Today's tasks{data && data.today.length ? ` · ${done} of ${data.today.length} approved` : ''}
        </h2>
        <button type="button" className="link-btn" onClick={onOpenPlan}>
          Edit
        </button>
      </div>
      {data && data.today.length === 0 && (
        <div className="empty-box">
          Nothing planned for today.{' '}
          <button type="button" className="link-btn" onClick={onOpenPlan}>
            Plan today
          </button>
        </div>
      )}
      {data && data.today.length > 0 && (
        <div className="list-box">
          {data.today.map((a) => (
            <div key={a.id} className="list-row">
              <span className="grow col">
                <strong>
                  {name(a.surah)} {range(a)}
                </strong>
                <span className="muted small">{a.kind === 'memorization' ? 'New memorization' : 'Revision'}</span>
              </span>
              <StatusBadge status={a.status} who="parent" small />
            </div>
          ))}
        </div>
      )}

      {data && data.recent.length > 0 && (
        <>
          <h2 className="p-h2">Recently reviewed</h2>
          <div className="list-box">
            {data.recent.map((r) => (
              <div key={r.id} className="list-row">
                <span className="grow col">
                  <strong>{name(r.assignment.surah)}</strong>
                  <span className="muted small">
                    {shortDate(r.assignment.due_date)} · attempt {r.attempt}
                    {r.note_path ? ' · voice note' : ''}
                  </span>
                </span>
                <StatusBadge status={r.review === 'approved' ? 'approved' : 'redo'} who="parent" small />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
