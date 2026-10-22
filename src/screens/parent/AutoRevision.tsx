import { useEffect, useMemo, useState } from 'react';
import type { Profile, ScheduleRow } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { fetchMemorized, fetchRevisionSettings, previewSchedule, rebuildPlan, saveRevisionSettings } from '../../lib/data';
import { isoDate, shortDate } from '../../lib/dates';
import { Spinner } from '../../components/Bits';
import { IconRepeat } from '../../components/Icons';

const CYCLES = [3, 5, 7, 10, 14, 21, 30];
// Display Monday first; values are JavaScript/Postgres weekday numbers (0 = Sunday).
const WEEK = [
  { v: 1, short: 'M', long: 'Monday' },
  { v: 2, short: 'T', long: 'Tuesday' },
  { v: 3, short: 'W', long: 'Wednesday' },
  { v: 4, short: 'T', long: 'Thursday' },
  { v: 5, short: 'F', long: 'Friday' },
  { v: 6, short: 'S', long: 'Saturday' },
  { v: 0, short: 'S', long: 'Sunday' },
];

interface Draft {
  active: boolean;
  cycle: number;
  rest: number[];
}

const same = (a: Draft, b: Draft) =>
  a.active === b.active && a.cycle === b.cycle && [...a.rest].sort().join() === [...b.rest].sort().join();

export function AutoRevision({
  child,
  chapters,
  onGoSurahs,
  onChanged,
}: {
  child: Profile;
  chapters: Chapter[] | null;
  onGoSurahs: () => void;
  onChanged: () => void;
}) {
  const [saved, setSaved] = useState<Draft | null | undefined>(undefined); // null = never set up
  const [draft, setDraft] = useState<Draft>({ active: true, cycle: 7, rest: [] });
  const [known, setKnown] = useState<number | null>(null);
  const [savedStart, setSavedStart] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScheduleRow[] | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const today = isoDate();

  useEffect(() => {
    let alive = true;
    Promise.all([fetchRevisionSettings(child.id), fetchMemorized(child.id)])
      .then(([s, m]) => {
        if (!alive) return;
        setKnown(m.length);
        if (s) {
          const d = { active: s.active, cycle: s.cycle_days, rest: s.rest_weekdays ?? [] };
          setSaved(d);
          setDraft(d);
          setSavedStart(s.start_date);
        } else {
          setSaved(null);
        }
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [child.id]);

  // Live preview of the next days for the settings on screen.
  useEffect(() => {
    if (!known || !draft.active) {
      setPreview(null);
      return;
    }
    let alive = true;
    setPreviewError(false);
    const t = window.setTimeout(() => {
      // Unchanged settings: show the real schedule (cycle continues from its start).
      // Changed settings: show the new cycle starting today.
      const start = saved && same(saved, draft) && savedStart ? savedStart : today;
      previewSchedule(child.id, draft.cycle, draft.rest, start, today, Math.min(14, Math.max(7, draft.cycle + draft.rest.length)))
        .then((rows) => alive && setPreview(rows))
        .catch(() => alive && setPreviewError(true));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [child.id, draft, known, today, saved, savedStart]);

  const days = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const r of preview ?? []) {
      const list = map.get(r.day) ?? [];
      list.push(r);
      map.set(r.day, list);
    }
    return Array.from(map.entries());
  }, [preview]);

  const label = (r: ScheduleRow) => {
    const c = chapters?.[r.surah - 1];
    const name = c?.name ?? `Surah ${r.surah}`;
    return c && r.verse_from === 1 && r.verse_to >= c.verses ? name : `${name} ${r.verse_from}–${r.verse_to}`;
  };

  const revisionDaysPerWeek = 7 - draft.rest.length;
  const perDay = known ? Math.max(1, Math.round((known / draft.cycle) * 10) / 10) : 0;
  const dirty = saved === null || (saved !== undefined && !same(saved, draft));

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      await saveRevisionSettings({ child_id: child.id, cycle_days: draft.cycle, rest_weekdays: draft.rest, active: draft.active }, today);
      await rebuildPlan(child.id, true, today);
      setSaved(draft);
      setSavedStart((await fetchRevisionSettings(child.id))?.start_date ?? today);
      setMessage(draft.active ? 'Saved. The coming days are planned.' : 'Automatic revision is off. Future automatic tasks were removed.');
      onChanged();
    } catch (e: any) {
      setMessage(e?.message ? `Couldn't save: ${e.message}` : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="box">
        <strong>Automatic revision</strong>
        <p className="muted small">
          Not available yet. Run <code>supabase/002_auto_revision.sql</code> in Supabase (README, step 2b), then reopen this page.
        </p>
      </div>
    );
  }
  if (saved === undefined || known === null) {
    return (
      <div className="box center-text">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="box col gap auto-rev">
      <div className="row-between">
        <strong className="row-gap center">
          <IconRepeat size={20} /> Automatic revision
        </strong>
        <button
          type="button"
          role="switch"
          aria-checked={draft.active}
          aria-label="Automatic revision"
          className={`switch${draft.active ? ' on' : ''}`}
          onClick={() => setDraft({ ...draft, active: !draft.active })}
        >
          <span />
        </button>
      </div>

      {known === 0 ? (
        <div className="empty-box">
          First mark the surahs {child.display_name} already knows.{' '}
          <button type="button" className="link-btn" onClick={onGoSurahs}>
            Open Surahs
          </button>
        </div>
      ) : draft.active ? (
        <>
          <div className="col gap-sm">
            <span className="small strong">Revise everything every</span>
            <div className="chips" role="radiogroup" aria-label="Cycle length">
              {CYCLES.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={draft.cycle === n}
                  className={draft.cycle === n ? 'on' : ''}
                  onClick={() => setDraft({ ...draft, cycle: n })}
                >
                  {n} days
                </button>
              ))}
            </div>
          </div>
          <div className="col gap-sm">
            <span className="small strong">Days without revision</span>
            <div className="weekdays" role="group" aria-label="Days without revision">
              {WEEK.map((d) => {
                const off = draft.rest.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    aria-pressed={off}
                    aria-label={`${d.long}${off ? ': no revision' : ''}`}
                    className={off ? 'off' : ''}
                    disabled={!off && revisionDaysPerWeek <= 1}
                    onClick={() =>
                      setDraft({ ...draft, rest: off ? draft.rest.filter((x) => x !== d.v) : [...draft.rest, d.v] })
                    }
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="muted small">
            {known} {known === 1 ? 'surah or passage' : 'surahs or passages'} known · about {perDay} a day, balanced by length.
          </div>

          <div className="col gap-sm">
            <span className="small strong">Preview</span>
            {previewError ? (
              <div className="muted small">Couldn't load the preview.</div>
            ) : !preview ? (
              <Spinner size={24} />
            ) : (
              <div className="preview">
                {days.map(([day, rows]) => (
                  <div key={day} className="preview-day">
                    <span className="preview-date">{day === today ? 'Today' : shortDate(day)}</span>
                    <span className="preview-items">
                      {rows.map((r) => (
                        <span key={`${r.surah}-${r.verse_from}`} className="mini-chip">
                          {label(r)}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="muted small">Off. Only the tasks you add below will appear.</div>
      )}

      {known > 0 && (dirty || message) && (
        <div className="col gap-sm">
          {dirty && (
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? <Spinner size={20} /> : null}
              {saved === null ? 'Start automatic revision' : 'Save changes'}
            </button>
          )}
          {dirty && saved && (
            <span className="muted small">If {child.display_name} already started today's revision, today stays as it is and the new plan begins tomorrow.</span>
          )}
          {message && (
            <div className="small" role="status">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
