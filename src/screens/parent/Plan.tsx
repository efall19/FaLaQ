import { useEffect, useState } from 'react';
import type { Assignment, Kind, Profile } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { addAssignment, deleteAssignment, fetchAssignments } from '../../lib/data';
import { addDays, isoDate, longDate, shortDate } from '../../lib/dates';
import { usePolling } from '../../lib/usePolling';
import { Spinner, StatusBadge } from '../../components/Bits';
import { IconBack, IconCopy, IconForward, IconPlus, IconTrash } from '../../components/Icons';
import { AutoRevision } from './AutoRevision';

export function Plan({
  child,
  chapters,
  chaptersError,
  onRetryChapters,
  onGoSurahs,
}: {
  child: Profile;
  chapters: Chapter[] | null;
  chaptersError: boolean;
  onRetryChapters: () => void;
  onGoSurahs: () => void;
}) {
  const [date, setDate] = useState(isoDate());
  const day = usePolling(() => fetchAssignments(child.id, date, date), [child.id, date], 30000);
  const list = day.data ?? [];
  const today = isoDate();

  const [kind, setKind] = useState<Kind>('revision');
  const [surah, setSurah] = useState(114);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const chapter = chapters?.[surah - 1];

  // Sensible default range when the surah or kind changes.
  useEffect(() => {
    if (!chapter) return;
    setFrom(1);
    setTo(kind === 'revision' ? chapter.verses : Math.min(5, chapter.verses));
  }, [surah, kind, chapter]);

  const name = (n: number) => chapters?.[n - 1]?.name ?? `Surah ${n}`;

  const add = async () => {
    if (!chapter) return;
    const f = Math.max(1, Math.min(from, chapter.verses));
    const t = Math.max(f, Math.min(to, chapter.verses));
    setBusy(true);
    setError('');
    try {
      await addAssignment({
        child_id: child.id,
        due_date: date,
        kind,
        surah,
        verse_from: f,
        verse_to: t,
        position: list.length,
      });
      await day.reload();
    } catch (e: any) {
      setError(e?.message ?? 'Could not add');
    } finally {
      setBusy(false);
    }
  };

  const copyPrevious = async () => {
    setBusy(true);
    setError('');
    try {
      const prev = await fetchAssignments(child.id, addDays(date, -1), addDays(date, -1));
      const key = (a: Pick<Assignment, 'kind' | 'surah' | 'verse_from' | 'verse_to'>) =>
        `${a.kind}-${a.surah}-${a.verse_from}-${a.verse_to}`;
      const existing = new Set(list.map(key));
      let pos = list.length;
      for (const a of prev) {
        if (existing.has(key(a))) continue;
        await addAssignment({
          child_id: child.id,
          due_date: date,
          kind: a.kind,
          surah: a.surah,
          verse_from: a.verse_from,
          verse_to: a.verse_to,
          position: pos++,
        });
      }
      await day.reload();
    } catch (e: any) {
      setError(e?.message ?? 'Could not copy');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await deleteAssignment(id);
      setConfirmDelete(null);
      await day.reload();
    } catch (e: any) {
      setError(e?.message ?? 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-page">
      <h1 className="p-title">Plan</h1>

      <AutoRevision child={child} chapters={chapters} onGoSurahs={onGoSurahs} onChanged={day.reload} />

      <h2 className="p-h2">Day by day</h2>

      <div className="date-nav">
        <button type="button" className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <IconBack size={22} />
        </button>
        <div className="grow center-text">
          <strong>{date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : shortDate(date)}</strong>
          <div className="muted small">{longDate(date)}</div>
        </div>
        <button type="button" className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
          <IconForward size={22} />
        </button>
      </div>

      {day.loading && !day.data ? (
        <div className="center-msg">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <div className="empty-box">Nothing planned for this day.</div>
      ) : (
        <div className="list-box">
          {list.map((a) => (
            <div key={a.id} className="list-row">
              <span className="grow col">
                <strong>
                  {name(a.surah)} {a.verse_from}–{a.verse_to}
                </strong>
                <span className="muted small">
                  {a.kind === 'memorization' ? 'New memorization' : 'Revision'}
                  {a.source === 'auto' ? ' · automatic' : ''}
                </span>
              </span>
              <StatusBadge status={a.status} who="parent" small />
              {confirmDelete === a.id ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)} disabled={busy}>
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${name(a.surah)}`}
                  onClick={() => setConfirmDelete(a.id)}
                >
                  <IconTrash size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-outline-ink" onClick={copyPrevious} disabled={busy}>
        <IconCopy size={18} />
        Copy from {shortDate(addDays(date, -1))}
      </button>

      <div className="box col gap">
        <strong>Add a task</strong>
        <div className="segmented full" role="radiogroup" aria-label="Task type">
          {(['revision', 'memorization'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? 'on' : ''}
              onClick={() => setKind(k)}
            >
              {k === 'revision' ? 'Revision' : 'New verses'}
            </button>
          ))}
        </div>

        {chaptersError ? (
          <div className="row-gap center">
            <span className="grow muted small">Couldn't load the surah list.</span>
            <button type="button" className="btn btn-light btn-sm" onClick={onRetryChapters}>
              Retry
            </button>
          </div>
        ) : (
          <label className="field">
            <span>Surah</span>
            <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} disabled={!chapters}>
              {(chapters ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name} ({c.verses})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="row-gap">
          <label className="field grow">
            <span>From verse</span>
            <input type="number" inputMode="numeric" min={1} max={chapter?.verses} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
          </label>
          <label className="field grow">
            <span>To verse</span>
            <input type="number" inputMode="numeric" min={from} max={chapter?.verses} value={to} onChange={(e) => setTo(Number(e.target.value))} />
          </label>
        </div>
        {chapter && <div className="muted small">{chapter.name} has {chapter.verses} verses.</div>}

        <button type="button" className="btn btn-primary" onClick={add} disabled={busy || !chapter}>
          <IconPlus size={18} />
          Add to {date === today ? 'today' : shortDate(date)}
        </button>
        {error && (
          <div className="error-text" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
