import type { Assignment, Profile, Recording } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import type { ChildDay } from './ChildApp';
import { isoDate, longDate } from '../../lib/dates';
import { AudioPlayer, CenterMessage, PlanTag, Spinner, StatusBadge } from '../../components/Bits';
import {
  IconBook,
  IconFlame,
  IconHeadphones,
  IconLogout,
  IconMic,
  IconPlus,
  IconRepeat,
  IconStar,
  IconTodayCheck,
  IconWifiOff,
  Logo,
  Medallion,
} from '../../components/Icons';
import { useSignedUrl } from '../../lib/useSignedUrl';

const SEG: Record<string, string> = { todo: '#D5DDD6', submitted: '#7FA0CF', redo: '#E3A26B', approved: '#1E6B4A' };

export function Today({
  profile,
  day,
  loading,
  error,
  chapters,
  onRetry,
  onOpen,
  onSignOut,
}: {
  profile: Profile;
  day: ChildDay | null;
  loading: boolean;
  error: boolean;
  chapters: Chapter[] | null;
  onRetry: () => void;
  onOpen: (id: string, mode: 'listen' | 'record') => void;
  onSignOut: () => void;
}) {
  const list = day?.assignments ?? [];
  const revision = list.filter((a) => a.kind === 'revision');
  const memo = list.filter((a) => a.kind === 'memorization');
  const done = list.filter((a) => a.status === 'submitted' || a.status === 'approved').length;

  return (
    <div className="child-shell">
      <nav className="rail" aria-label="Main">
        <Logo />
        <a className="rail-item active" aria-current="page" href="#">
          <IconTodayCheck size={28} />
          Today
        </a>
        <div className="rail-spacer" />
        <button className="rail-item" type="button" onClick={onSignOut} aria-label="Switch user">
          <span className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</span>
          <span className="rail-small">
            <IconLogout size={14} /> Switch
          </span>
        </button>
      </nav>

      <main className="child-main">
        <header className="child-header">
          <div className="grow">
            <div className="muted">{longDate(day?.date ?? isoDate())}</div>
            <h1>Assalamu alaykum, {profile.display_name}</h1>
          </div>
          {list.length > 0 && (
            <div className="day-progress">
              <div className="row-between">
                <strong>Today</strong>
                <span className="muted">
                  {done} of {list.length} done
                </span>
              </div>
              <div className="segments" aria-hidden="true">
                {list.map((a) => (
                  <span key={a.id} style={{ background: SEG[a.status] }} />
                ))}
              </div>
            </div>
          )}
          <div className="chip-stat">
            <IconStar size={26} />
            <strong>{day?.stars ?? '–'}</strong>
            <span className="muted">{day?.stars === 1 ? 'star' : 'stars'}</span>
          </div>
          <div className="chip-stat">
            <span style={{ color: '#B5541B', display: 'flex' }}>
              <IconFlame size={24} />
            </span>
            <strong>{day?.streak ?? '–'}</strong>
            <span className="muted">day streak</span>
          </div>
        </header>

        {error && (
          <div className="banner" role="status">
            <IconWifiOff size={26} />
            <div className="grow">
              <strong>No internet right now</strong>
              <div className="banner-sub">We'll keep trying. You can still listen to anything already loaded.</div>
            </div>
            <button type="button" className="btn btn-light" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {loading && !day ? (
          <div className="center-msg">
            <Spinner />
          </div>
        ) : day && list.length === 0 ? (
          <CenterMessage title="Rest day">Nothing is due today. Your streak is safe.</CenterMessage>
        ) : (
          <>
            {revision.length > 0 && (
              <section className="section">
                <div className="section-title">
                  <IconRepeat size={22} />
                  <h2>Revision</h2>
                  <span className="muted">
                    {revision.length} {revision.length === 1 ? 'surah' : 'surahs'}
                  </span>
                </div>
                <div className="card-grid">
                  {revision.map((a) => (
                    <SurahCard
                      key={a.id}
                      a={a}
                      chapter={chapters?.[a.surah - 1]}
                      latest={day?.latest[a.id]}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              </section>
            )}
            {memo.length > 0 && (
              <section className="section">
                <div className="section-title">
                  <IconPlus size={22} />
                  <h2>New memorization</h2>
                </div>
                <div className="card-grid">
                  {memo.map((a) => (
                    <SurahCard
                      key={a.id}
                      a={a}
                      chapter={chapters?.[a.surah - 1]}
                      latest={day?.latest[a.id]}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function rangeLabel(a: Assignment, chapter?: Chapter): string {
  const whole = chapter && a.verse_from === 1 && a.verse_to >= chapter.verses;
  if (whole) return `${chapter!.verses} verses`;
  return a.verse_from === a.verse_to ? `Verse ${a.verse_from}` : `Verses ${a.verse_from}–${a.verse_to}`;
}

function SurahCard({
  a,
  chapter,
  latest,
  onOpen,
}: {
  a: Assignment;
  chapter?: Chapter;
  latest?: Recording;
  onOpen: (id: string, mode: 'listen' | 'record') => void;
}) {
  const memo = a.kind === 'memorization';
  const auto = a.source === 'auto';
  return (
    <article className={`card card-${a.status}${memo ? ' card-memo' : ''}${auto ? ' card-auto' : ''}`}>
      <div className="card-head">
        <Medallion n={a.surah} tone={memo ? 'gold' : auto ? 'plum' : 'teal'} />
        <div className="grow">
          <div className="card-name">{chapter?.name ?? `Surah ${a.surah}`}</div>
          <div className="muted small">{rangeLabel(a, chapter)}</div>
        </div>
        {chapter && (
          <div className={`ar-name${memo ? ' gold' : auto ? ' plum' : ''}`} lang="ar" dir="rtl">
            {chapter.arabic}
          </div>
        )}
      </div>
      <div className="badge-row">
        <StatusBadge status={a.status} />
        {auto && <PlanTag />}
      </div>
      {a.status === 'redo' && latest && <TeacherNote rec={latest} />}
      <div className="card-actions">
        <button type="button" className="btn btn-outline" onClick={() => onOpen(a.id, 'listen')}>
          {memo && a.status !== 'approved' ? <IconBook /> : <IconHeadphones />}
          {a.status === 'approved' ? 'Listen again' : memo ? 'Memorize' : 'Listen'}
        </button>
        {(a.status === 'todo' || a.status === 'redo') && (
          <button type="button" className="btn btn-record" onClick={() => onOpen(a.id, 'record')}>
            <IconMic />
            {a.status === 'redo' ? 'Record again' : 'Record'}
          </button>
        )}
        {a.status === 'submitted' && (
          <button type="button" className="btn btn-waiting" disabled>
            Waiting…
          </button>
        )}
      </div>
    </article>
  );
}

function TeacherNote({ rec }: { rec: Recording }) {
  const { url, error } = useSignedUrl(rec.note_path);
  if (!rec.note_path && !rec.comment) return null;
  return (
    <div className="teacher-note">
      {rec.note_path && (
        <AudioPlayer
          src={url}
          loadError={error}
          tone="clay"
          fallbackDuration={rec.note_duration_sec}
          label="Teacher's voice note"
        />
      )}
      {rec.comment && <div className="teacher-comment">“{rec.comment}”</div>}
    </div>
  );
}
