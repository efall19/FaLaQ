import type { Assignment, Profile, Recording } from '../../lib/types';
import type { ReadingState } from '../../lib/reading/data';
import { LESSONS, lessonMeta } from '../../lib/reading/lessons';
import { CenterMessage, Spinner, StatusBadge, TaskTag } from '../../components/Bits';
import { IconCheck, IconLock, IconMic, IconReading, Medallion } from '../../components/Icons';
import { Rail, type ChildTab } from './Rail';
import { TeacherNote } from './Today';

export function ReadingCard({
  a,
  latest,
  onOpen,
}: {
  a: Assignment;
  latest?: Recording;
  onOpen: (id: string, mode: 'read' | 'record') => void;
}) {
  const meta = lessonMeta(a.reading_lesson ?? 1);
  const page = a.reading_content;
  return (
    <article className={`card card-${a.status} card-reading`}>
      <div className="card-head">
        <Medallion n={a.reading_lesson ?? ''} tone="blue" />
        <div className="grow">
          <div className="card-name">
            Lesson {a.reading_lesson} · page {a.reading_page}
          </div>
          <div className="muted small">{page?.title ?? meta.en}</div>
        </div>
        <div className="ar-name blue" lang="ar" dir="rtl">
          {meta.ar}
        </div>
      </div>
      <div className="badge-row">
        <StatusBadge status={a.status} />
        <TaskTag task={a} />
      </div>
      {a.status === 'redo' && latest && <TeacherNote rec={latest} />}
      <div className="card-actions">
        <button type="button" className="btn btn-outline" onClick={() => onOpen(a.id, 'read')}>
          <IconReading />
          {a.status === 'approved' ? 'Look again' : 'Open page'}
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

/** The 17 lessons as a path: done, current, and still locked. */
export function LessonPath({ reading }: { reading: ReadingState }) {
  const p = reading.progress;
  const cur = reading.current?.reading_lesson ?? p?.next.lesson ?? 1;
  return (
    <ol className="lesson-path">
      {LESSONS.map((m) => {
        const st = p?.lessons[m.n - 1];
        const done = !!st?.passed;
        const here = m.n === cur && !done;
        return (
          <li key={m.n} className={`lp-step${done ? ' done' : ''}${here ? ' here' : ''}`}>
            <span className="lp-dot">{done ? <IconCheck size={18} /> : here ? m.n : <IconLock size={14} />}</span>
            <span className="lp-text">
              <strong>
                {m.n}. {m.en}
              </strong>
              <span className="lp-ar" lang="ar" dir="rtl">
                {m.ar}
              </span>
              {here && st && (
                <span className="muted small">
                  {m.practice ? `${st.approved} pages done · ${m.passRule.toLowerCase()}` : `${st.approved} of ${st.total} pages done`}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ReadingScreen({
  profile,
  reading,
  latest,
  loading,
  onOpen,
  onTab,
  onSignOut,
}: {
  profile: Profile;
  reading: ReadingState | null;
  latest: Record<string, Recording | undefined>;
  loading: boolean;
  onOpen: (id: string, mode: 'read' | 'record') => void;
  onTab: (t: ChildTab) => void;
  onSignOut: () => void;
}) {
  const passed = reading?.progress?.passedCount ?? 0;
  return (
    <div className="child-shell">
      <Rail profile={profile} active="reading" onTab={onTab} onSignOut={onSignOut} />
      <main className="child-main">
        <header className="child-header">
          <div className="grow">
            <div className="muted">Learning to read the Quran</div>
            <h1>Reading</h1>
          </div>
          {reading?.settings?.active && (
            <div className="chip-stat">
              <IconReading size={26} />
              <strong>{passed}</strong>
              <span className="muted">of 17 lessons</span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="center-msg">
            <Spinner />
          </div>
        ) : !reading || !reading.settings?.active ? (
          <CenterMessage title="Reading lessons start soon">Your teacher will switch them on.</CenterMessage>
        ) : (
          <div className="reading-layout">
            <section className="section reading-today">
              <div className="section-title reading-title">
                <IconReading size={22} />
                <h2>Today's page</h2>
              </div>
              {reading.current ? (
                <ReadingCard a={reading.current} latest={latest[reading.current.id]} onOpen={onOpen} />
              ) : reading.waitingFor ? (
                <div className="empty-box">
                  MashaAllah! Lesson {reading.waitingFor} is next. Your teacher will open it for you soon.
                </div>
              ) : (
                <div className="empty-box">Today's page is done. See you tomorrow, in sha Allah.</div>
              )}
            </section>
            <section className="section">
              <div className="section-title reading-title">
                <h2>Your path</h2>
                <span className="muted">{passed} of 17 lessons done</span>
              </div>
              <LessonPath reading={reading} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
