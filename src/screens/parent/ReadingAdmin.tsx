import { useEffect, useMemo, useState } from 'react';
import type { Profile } from '../../lib/types';
import { fetchMemorized, uploadAudio } from '../../lib/data';
import { fmtSec } from '../../lib/dates';
import { usePolling } from '../../lib/usePolling';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { extensionFor, useRecorder } from '../../lib/useRecorder';
import { toPlayableEverywhere } from '../../lib/wav';
import {
  buildContext,
  fetchMistakeStats,
  fetchModelAudio,
  fetchReadingSettings,
  fetchReadingTasks,
  optionsOf,
  saveModelAudio,
  saveReadingSettings,
  type ModelAudio,
} from '../../lib/reading/data';
import { LESSONS, buildBasePage, knowsPoolSurah, lessonMeta, pageCount } from '../../lib/reading/lessons';
import { computeProgress } from '../../lib/reading/progress';
import type { Page, ReadingOptions, ReadingSettings } from '../../lib/reading/types';
import { AudioPlayer, Spinner } from '../../components/Bits';
import { ReadingPageView } from '../../components/ReadingPage';
import { IconCheck, IconMic, IconRedo, IconStop } from '../../components/Icons';

const SWITCHES: { key: keyof ReadingOptions; title: string; text: string }[] = [
  { key: 'spell', title: 'Listen, spell, read, record', text: 'A “Spell it” button shows how to spell each syllable aloud (lessons 4–9). It fades out from lesson 10.' },
  { key: 'todayCard', title: 'Reading card on Today', text: 'Today’s page also appears on his Today screen, next to revision and memorization.' },
  { key: 'reviewRow', title: 'Old lessons come back', text: 'Every page ends with one short row from an earlier lesson.' },
  { key: 'tricky', title: 'Tricky items come back', text: 'What you mark as wrong reappears on his next pages until he reads it well at the first attempt.' },
  { key: 'spotIt', title: 'Spot it in his surahs', text: 'Lessons end with a verse he knows: he finds the new mark in it, then reads it.' },
  { key: 'wordAudio', title: 'Quran word audio', text: 'He can tap a Quran word to hear it (Quran.com word-by-word audio). Turn off if a word plays the wrong sound.' },
  { key: 'shipLights', title: 'Spaceship reading lights', text: 'Each finished lesson lights one of 17 lights around his spaceship.' },
];

async function loadAll(childId: string) {
  const [settings, tasks, audio, mistakes, memorized] = await Promise.all([
    fetchReadingSettings(childId),
    fetchReadingTasks(childId),
    fetchModelAudio(childId),
    fetchMistakeStats(childId).catch(() => []),
    fetchMemorized(childId).catch(() => []),
  ]);
  const hasKnown = knowsPoolSurah(memorized.filter((m) => m.verse_from === 1).map((m) => m.surah));
  return { settings, tasks, audio, mistakes, hasKnown };
}

export function ReadingAdmin({ child, parentId }: { child: Profile; parentId: string }) {
  const data = usePolling(() => loadAll(child.id), [child.id], 30000);
  const [draft, setDraft] = useState<ReadingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openLesson, setOpenLesson] = useState<number | null>(null);

  const settings: ReadingSettings = draft ??
    data.data?.settings ?? { child_id: child.id, active: false, opened: [1], options: {} };
  const options = optionsOf(settings);
  const progress = useMemo(
    () => (data.data ? computeProgress(data.data.tasks, options, data.data.hasKnown) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.data, JSON.stringify(options)],
  );
  const current = data.data?.tasks.find((t) => t.status !== 'approved');
  const curLesson = current?.reading_lesson ?? progress?.next.lesson ?? 1;

  const save = async (next: ReadingSettings) => {
    setDraft(next);
    setSaving(true);
    setError('');
    try {
      await saveReadingSettings(next);
      await data.reload();
      setDraft(null);
    } catch (e: any) {
      setError(e?.message ? `Couldn't save: ${e.message}` : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (data.loading && !data.data) {
    return (
      <div className="p-page">
        <div className="center-msg">
          <Spinner />
        </div>
      </div>
    );
  }
  if (data.error && !data.data) {
    return (
      <div className="p-page">
        <h1 className="p-title">Reading</h1>
        <div className="empty-box">
          Couldn't load the reading lessons. If this is the first time, the reading SQL (supabase/006_reading.sql) may not be installed yet.{' '}
          <button type="button" className="link-btn" onClick={data.reload}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-page">
      <h1 className="p-title">Reading</h1>
      <p className="muted small">
        17 lessons in the order of Al-Qaida An-Nouraniyah, one page a day, ending with verses {child.display_name} hasn't memorized.
        A page passes when you approve it; no skipping ahead.
      </p>

      <div className="box row-gap center">
        <div className="grow col">
          <strong>Reading lessons</strong>
          <span className="muted small">
            {settings.active
              ? current
                ? `Now: lesson ${current.reading_lesson}, page ${current.reading_page}`
                : progress && !settings.opened.includes(progress.next.lesson)
                  ? `Waiting for you to open lesson ${progress.next.lesson}`
                  : 'A page appears on his tablet each day'
              : 'Off: he sees “Reading lessons start soon”'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.active}
          aria-label="Reading lessons"
          className={`switch${settings.active ? ' on' : ''}`}
          onClick={() => save({ ...settings, active: !settings.active })}
          disabled={saving}
        >
          <span />
        </button>
      </div>
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}

      <h2 className="p-h2">
        Lessons · {progress?.passedCount ?? 0} of 17 done
      </h2>
      <div className="list-box">
        {LESSONS.map((m) => {
          const st = progress?.lessons[m.n - 1];
          const isOpen = settings.opened.includes(m.n);
          const here = m.n === curLesson && !st?.passed;
          return (
            <div key={m.n} className={`surah-row${openLesson === m.n ? ' open' : ''}`}>
              <div className="list-row">
                <button
                  type="button"
                  className="surah-row-main"
                  onClick={() => setOpenLesson(openLesson === m.n ? null : m.n)}
                  aria-expanded={openLesson === m.n}
                >
                  <span className="surah-num">{m.n}</span>
                  <span className="grow col">
                    <strong>
                      {m.en} <span className="ar-inline blue" lang="ar" dir="rtl">{m.ar}</span>
                    </strong>
                    <span className="muted small">
                      {st?.passed
                        ? 'Done'
                        : here
                          ? m.practice
                            ? `Current · ${st?.approved ?? 0} pages approved`
                            : `Current · ${st?.approved ?? 0} of ${st?.total} pages`
                          : m.practice
                            ? 'Practice · pages keep coming until passed'
                            : `${pageCount(m.n, options, !!data.data?.hasKnown)} pages`}
                    </span>
                  </span>
                </button>
                {st?.passed ? (
                  <span className="known-btn on" aria-label="Done">
                    <IconCheck size={20} />
                  </span>
                ) : (
                  <label className="open-toggle">
                    <span className="muted small">{isOpen ? 'Open' : 'Closed'}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOpen}
                      aria-label={`Open lesson ${m.n}`}
                      className={`switch${isOpen ? ' on' : ''}`}
                      disabled={saving}
                      onClick={() =>
                        save({
                          ...settings,
                          opened: isOpen ? settings.opened.filter((x) => x !== m.n) : [...settings.opened, m.n].sort((a, b) => a - b),
                        })
                      }
                    >
                      <span />
                    </button>
                  </label>
                )}
              </div>
              {openLesson === m.n && (
                <LessonDetail
                  lesson={m.n}
                  child={child}
                  parentId={parentId}
                  options={options}
                  hasKnown={!!data.data?.hasKnown}
                  approved={st?.approved ?? 0}
                  audio={data.data?.audio ?? []}
                  onAudioSaved={data.reload}
                />
              )}
            </div>
          );
        })}
      </div>

      <h2 className="p-h2">Method</h2>
      <p className="muted small">
        Always on: mastery before moving on, one page a day, and the last lesson on verses he hasn't memorized.
      </p>
      <div className="list-box">
        {SWITCHES.map((sw) => (
          <div key={sw.key} className="list-row">
            <span className="grow col">
              <strong>{sw.title}</strong>
              <span className="muted small">{sw.text}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={options[sw.key]}
              aria-label={sw.title}
              className={`switch${options[sw.key] ? ' on' : ''}`}
              disabled={saving}
              onClick={() => save({ ...settings, options: { ...settings.options, [sw.key]: !options[sw.key] } })}
            >
              <span />
            </button>
          </div>
        ))}
      </div>

      <h2 className="p-h2">Tricky items</h2>
      {data.data && data.data.mistakes.length === 0 ? (
        <div className="empty-box">Nothing marked yet. When you review a page, tap what he read wrong.</div>
      ) : (
        <div className="tricky-list" dir="rtl" lang="ar">
          {data.data?.mistakes.slice(0, 60).map((m) => (
            <span key={m.item} className={`tricky-chip${m.open ? ' open' : ''}`} title={m.open ? 'Still coming back' : 'Read well since'}>
              {m.item}
              <span className="tricky-n" dir="ltr">
                {m.n}×
              </span>
            </span>
          ))}
        </div>
      )}
      <p className="muted small">Highlighted items still come back on his pages; the others he has since read well.</p>
    </div>
  );
}

function LessonDetail({
  lesson,
  child,
  parentId,
  options,
  hasKnown,
  approved,
  audio,
  onAudioSaved,
}: {
  lesson: number;
  child: Profile;
  parentId: string;
  options: ReadingOptions;
  hasKnown: boolean;
  approved: number;
  audio: ModelAudio[];
  onAudioSaved: () => void;
}) {
  const meta = lessonMeta(lesson);
  const count = meta.practice ? Math.max(3, approved + 2) : pageCount(lesson, options, hasKnown);
  const [page, setPage] = useState(1);
  const [built, setBuilt] = useState<Page | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setBuilt(null);
    setErr(false);
    buildContext(child.id, options, lesson, false)
      .then((ctx) => alive && setBuilt(buildBasePage(lesson, page, ctx)))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, page, child.id, options.spotIt, options.wordAudio]);

  const model = audio.find((a) => a.lesson === lesson && a.page === page) ?? null;

  return (
    <div className="surah-edit">
      <div className="muted small">
        {meta.learns}. Passed when: {meta.passRule.toLowerCase()}.
      </div>
      <div className="chips" role="tablist" aria-label="Pages">
        {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
          <button key={p} type="button" className={p === page ? 'on' : ''} onClick={() => setPage(p)}>
            Page {p}
            {audio.some((a) => a.lesson === lesson && a.page === p) ? ' ♪' : ''}
          </button>
        ))}
      </div>
      <ModelAudioEditor key={`${lesson}-${page}`} child={child} parentId={parentId} lesson={lesson} page={page} model={model} onSaved={onAudioSaved} />
      <div className="box reading-preview">
        {err ? (
          <div className="muted">Couldn't build this page. Check the connection and try again.</div>
        ) : !built ? (
          <div className="center-msg">
            <Spinner size={28} />
            <span className="muted small">Loading Quran words…</span>
          </div>
        ) : (
          <>
            <strong>{built.title}</strong>
            <div className="muted small">{built.hint}</div>
            <ReadingPageView page={built} mode="preview" />
            <div className="muted small">
              On his tablet the page may end with a review row and his tricky items.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModelAudioEditor({
  child,
  parentId,
  lesson,
  page,
  model,
  onSaved,
}: {
  child: Profile;
  parentId: string;
  lesson: number;
  page: number;
  model: ModelAudio | null;
  onSaved: () => void;
}) {
  const rec = useRecorder();
  const { url, error } = useSignedUrl(model?.path);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!rec.blob) return;
    setBusy(true);
    setMsg('');
    try {
      const file = await toPlayableEverywhere(rec.blob);
      const path = `${parentId}/reading/${lesson}-${page}-${Date.now()}.${extensionFor(file.type)}`;
      await uploadAudio(path, file);
      await saveModelAudio({ child_id: child.id, lesson, page, path, duration_sec: Math.round(rec.seconds) });
      rec.reset();
      setMsg('Saved. He hears it on this page.');
      onSaved();
    } catch (e: any) {
      setMsg(e?.message ? `Couldn't save: ${e.message}` : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="box col gap">
      <strong>
        Your model reading <span className="muted normal">· page {page}</span>
      </strong>
      {model && rec.state !== 'recorded' && rec.state !== 'recording' && (
        <AudioPlayer src={url} path={model.path} loadError={error} fallbackDuration={model.duration_sec} label="Saved reading" tone="ink" />
      )}
      {(rec.state === 'idle' || rec.state === 'starting') && (
        <button type="button" className="btn btn-dashed" onClick={rec.start} disabled={rec.state === 'starting'}>
          <IconMic size={20} />
          {model ? 'Record again' : 'Record this page'}
        </button>
      )}
      {rec.state === 'recording' && (
        <div className="row-gap center">
          <button type="button" className="rec-btn sm pulse" onClick={rec.stop} aria-label="Stop">
            <IconStop size={18} />
          </button>
          <strong className="grow rec-text">Recording…</strong>
          <span className="rec-text">{fmtSec(rec.seconds)}</span>
        </div>
      )}
      {rec.state === 'recorded' && (
        <>
          <AudioPlayer src={rec.url} fallbackDuration={rec.seconds} tone="ink" />
          <div className="row-gap">
            <button type="button" className="btn btn-outline-ink btn-sm grow" onClick={rec.start} disabled={busy}>
              <IconRedo size={18} /> Redo
            </button>
            <button type="button" className="btn btn-primary btn-sm grow" onClick={save} disabled={busy}>
              {busy ? <Spinner size={18} /> : <IconCheck size={18} />} Save
            </button>
          </div>
        </>
      )}
      {(rec.state === 'denied' || rec.state === 'error' || rec.state === 'unsupported') && (
        <div className="muted small">The microphone isn't available. Allow it for this site in your phone's settings.</div>
      )}
      {msg && <div className="muted small">{msg}</div>}
    </div>
  );
}
