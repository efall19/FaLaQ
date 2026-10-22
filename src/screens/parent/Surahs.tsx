import { useEffect, useMemo, useState } from 'react';
import type { Memorized, Profile, RecordingWithAssignment } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { SURAH_GROUPS, weightFor } from '../../lib/quran';
import { fetchKeptRecordings, fetchMemorized, rebuildPlan, removeMemorized, saveMemorized } from '../../lib/data';
import { shortDate } from '../../lib/dates';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { usePolling } from '../../lib/usePolling';
import { AudioPlayer, Spinner } from '../../components/Bits';
import { IconCheck, IconPlus } from '../../components/Icons';

type Status = 'none' | 'partial' | 'full';

function statusOf(m: Memorized | undefined, c: Chapter): Status {
  if (!m) return 'none';
  return m.verse_from === 1 && m.verse_to >= c.verses ? 'full' : 'partial';
}

export function Surahs({
  child,
  chapters,
  chaptersError,
  onRetryChapters,
}: {
  child: Profile;
  chapters: Chapter[] | null;
  chaptersError: boolean;
  onRetryChapters: () => void;
}) {
  const known = usePolling(() => fetchMemorized(child.id), [child.id], 5 * 60 * 1000);
  const byId = useMemo(() => new Map((known.data ?? []).map((m) => [m.surah, m])), [known.data]);
  const kept = usePolling(() => fetchKeptRecordings(child.id), [child.id], 5 * 60 * 1000);
  const keptBySurah = useMemo(() => {
    const m = new Map<number, RecordingWithAssignment>();
    for (const r of kept.data ?? []) if (!m.has(r.assignment.surah)) m.set(r.assignment.surah, r); // newest first
    return m;
  }, [kept.data]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const total = known.data?.length ?? 0;
  const fullCount = chapters ? (known.data ?? []).filter((m) => statusOf(m, chapters[m.surah - 1]) === 'full').length : 0;

  // Save rows (computing how much text each holds) or remove them, then refresh the plan.
  const apply = async (label: string, save: Memorized[], remove: number[]) => {
    setBusy(label);
    setError('');
    try {
      const withWeights: Memorized[] = await Promise.all(
        save.map(async (r) => ({ ...r, weight: await weightFor(r.surah, r.verse_from, r.verse_to) })),
      );
      await saveMemorized(withWeights);
      await removeMemorized(child.id, remove);
      await rebuildPlan(child.id, false).catch(() => undefined);
      await known.reload();
    } catch (e: any) {
      setError(e?.message ? `Couldn't save: ${e.message}` : "Couldn't save. Check the connection.");
    } finally {
      setBusy(null);
    }
  };

  if (chaptersError) {
    return (
      <div className="p-page">
        <h1 className="p-title">Surahs</h1>
        <div className="empty-box">
          Couldn't load the surah list.{' '}
          <button type="button" className="link-btn" onClick={onRetryChapters}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!chapters || (known.loading && !known.data)) {
    return (
      <div className="p-page">
        <h1 className="p-title">Surahs</h1>
        <div className="center-msg">
          <Spinner />
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (c: Chapter) =>
    !q || String(c.id) === q || c.name.toLowerCase().replace(/[-'’]/g, '').includes(q.replace(/[-'’]/g, '')) || c.arabic.includes(query.trim());

  return (
    <div className="p-page">
      <div className="row-between baseline">
        <h1 className="p-title">Surahs</h1>
        <span className="muted small">
          {fullCount} known{total - fullCount ? ` · ${total - fullCount} partly` : ''}
        </span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Mark what {child.display_name} already knows. Automatic revision uses this list.
      </p>
      <label className="field">
        <span className="sr-only">Search surahs</span>
        <input type="search" placeholder="Name or number, e.g. Mulk or 67" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}

      {SURAH_GROUPS.map((g) => {
        const list = chapters.filter((c) => c.id >= g.from && c.id <= g.to && matches(c)).sort((a, b) => b.id - a.id);
        if (!list.length) return null;
        const groupKnown = list.filter((c) => statusOf(byId.get(c.id), c) === 'full').length;
        const allKnown = groupKnown === list.length;
        return (
          <section key={g.title} className="col gap">
            <div className="row-between">
              <h2 className="p-h2" style={{ margin: 0 }}>
                {g.title}
              </h2>
              <span className="row-gap center">
                <span className="muted small">
                  {groupKnown} of {list.length}
                </span>
                {!q && (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={busy !== null}
                    onClick={() =>
                      allKnown
                        ? apply(g.title, [], list.map((c) => c.id))
                        : apply(
                            g.title,
                            list
                              .filter((c) => statusOf(byId.get(c.id), c) !== 'full')
                              .map((c) => ({ child_id: child.id, surah: c.id, verse_from: 1, verse_to: c.verses, weight: 0 })),
                            [],
                          )
                    }
                  >
                    {busy === g.title ? 'Saving…' : allKnown ? 'Clear all' : 'Mark all known'}
                  </button>
                )}
              </span>
            </div>
            <div className="list-box">
              {list.map((c) => (
                <SurahRow
                  key={c.id}
                  chapter={c}
                  mem={byId.get(c.id)}
                  kept={keptBySurah.get(c.id)}
                  open={open === c.id}
                  busy={busy === `s${c.id}`}
                  disabled={busy !== null}
                  onToggle={() => setOpen(open === c.id ? null : c.id)}
                  onQuickKnown={() =>
                    apply(`s${c.id}`, [{ child_id: child.id, surah: c.id, verse_from: 1, verse_to: c.verses, weight: 0 }], [])
                  }
                  onSave={(status, from, to) => {
                    setOpen(null);
                    if (status === 'none') return apply(`s${c.id}`, [], [c.id]);
                    const f = status === 'full' ? 1 : Math.max(1, Math.min(from, c.verses));
                    const t = status === 'full' ? c.verses : Math.max(f, Math.min(to, c.verses));
                    return apply(`s${c.id}`, [{ child_id: child.id, surah: c.id, verse_from: f, verse_to: t, weight: 0 }], []);
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SurahRow({
  chapter: c,
  mem,
  kept,
  open,
  busy,
  disabled,
  onToggle,
  onQuickKnown,
  onSave,
}: {
  chapter: Chapter;
  mem?: Memorized;
  kept?: RecordingWithAssignment;
  open: boolean;
  busy: boolean;
  disabled: boolean;
  onToggle: () => void;
  onQuickKnown: () => void;
  onSave: (status: Status, from: number, to: number) => void;
}) {
  const current = statusOf(mem, c);
  const [status, setStatus] = useState<Status>(current);
  const [from, setFrom] = useState(mem?.verse_from ?? 1);
  const [to, setTo] = useState(mem?.verse_to ?? Math.min(5, c.verses));

  useEffect(() => {
    if (!open) return;
    setStatus(current);
    setFrom(mem?.verse_from ?? 1);
    setTo(mem?.verse_to ?? Math.min(5, c.verses));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`surah-row${open ? ' open' : ''}`}>
      <div className="list-row">
        <button type="button" className="surah-row-main" onClick={onToggle} aria-expanded={open}>
          <span className="surah-num">{c.id}</span>
          <span className="grow col">
            <strong>{c.name}</strong>
            <span className="muted small">
              {c.verses} verses
              {current === 'partial' && mem ? ` · knows ${mem.verse_from}–${mem.verse_to}` : ''}
              {kept ? ' · recording kept' : ''}
            </span>
          </span>
          <span className="ar-small" lang="ar" dir="rtl">
            {c.arabic}
          </span>
        </button>
        {busy ? (
          <span className="known-btn">
            <Spinner size={20} />
          </span>
        ) : current === 'full' ? (
          <button type="button" className="known-btn on" onClick={onToggle} aria-label={`${c.name}: known. Change`} disabled={disabled}>
            <IconCheck size={20} />
          </button>
        ) : current === 'partial' ? (
          <button type="button" className="known-btn part" onClick={onToggle} aria-label={`${c.name}: partly known. Change`} disabled={disabled}>
            ½
          </button>
        ) : (
          <button type="button" className="known-btn" onClick={onQuickKnown} aria-label={`Mark ${c.name} as known`} disabled={disabled}>
            <IconPlus size={20} />
          </button>
        )}
      </div>
      {open && (
        <div className="surah-edit">
          {kept && <KeptPlayer rec={kept} />}
          <div className="segmented full" role="radiogroup" aria-label={`${c.name} status`}>
            {(['none', 'partial', 'full'] as Status[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                {s === 'none' ? 'Not yet' : s === 'partial' ? 'Partly' : 'Fully'}
              </button>
            ))}
          </div>
          {status === 'partial' && (
            <div className="row-gap">
              <label className="field grow">
                <span>From verse</span>
                <input type="number" inputMode="numeric" min={1} max={c.verses} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
              </label>
              <label className="field grow">
                <span>To verse</span>
                <input type="number" inputMode="numeric" min={from} max={c.verses} value={to} onChange={(e) => setTo(Number(e.target.value))} />
              </label>
            </div>
          )}
          <div className="row-gap">
            <button type="button" className="btn btn-outline-ink btn-sm grow" onClick={onToggle}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm grow" onClick={() => onSave(status, from, to)} disabled={disabled}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KeptPlayer({ rec }: { rec: RecordingWithAssignment }) {
  const { url, error } = useSignedUrl(rec.audio_path);
  return (
    <AudioPlayer
      src={url}
      path={rec.audio_path}
      loadError={error}
      fallbackDuration={rec.duration_sec}
      label={`Kept recording · ${shortDate(rec.assignment.due_date)}`}
    />
  );
}
