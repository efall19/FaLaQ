import { useEffect, useState } from 'react';
import type { Assignment, Recording } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { RECITER } from '../../lib/quran';
import { useVerses } from '../../lib/useVerses';
import { useReciter } from '../../lib/useReciter';
import { QuranText } from '../../components/QuranText';
import { IconBack, IconEye, IconEyeOff, IconMic, IconNext, IconPause, IconPlay, IconPrev, IconRepeat } from '../../components/Icons';
import { rangeLabel } from './Today';
import { RecorderPanel } from './RecorderPanel';

export function SurahScreen({
  assignment: a,
  chapter,
  childId,
  latest,
  mode,
  onMode,
  onBack,
  onSent,
}: {
  assignment: Assignment;
  chapter: Chapter;
  childId: string;
  latest?: Recording;
  mode: 'listen' | 'record';
  onMode: (m: 'listen' | 'record') => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const { verses, basmala, error, retry } = useVerses(a.surah, a.verse_from, a.verse_to);
  const reciter = useReciter(a.surah, a.verse_from, a.verse_to);
  const [hidden, setHidden] = useState(false);
  const canRecord = a.status === 'todo' || a.status === 'redo';
  const attempt = (latest?.attempt ?? 0) + (canRecord ? 1 : 0);

  useEffect(() => {
    if (mode === 'record') reciter.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const memo = a.kind === 'memorization';
  const verseCount = a.verse_to - a.verse_from + 1;
  const shownVerse = reciter.current === null ? null : reciter.current === 0 ? 'Bismillah' : `Verse ${reciter.current - a.verse_from + 1} of ${verseCount}`;
  const progress =
    reciter.current === null ? 0 : reciter.current === 0 ? 2 : Math.round(((reciter.current - a.verse_from + 1) / verseCount) * 100);

  return (
    <div className="surah-screen">
      <header className="surah-header">
        <button type="button" className="btn btn-light" onClick={onBack}>
          <IconBack />
          Today
        </button>
        <div className="surah-title">
          <h1>
            {mode === 'record' ? 'Record ' : ''}
            {chapter.name}{' '}
            <span className="ar-inline" lang="ar" dir="rtl">
              {chapter.arabic}
            </span>
          </h1>
          <div className="muted small">
            {memo ? 'New memorization' : 'Revision'} · {rangeLabel(a, chapter)}
            {mode === 'record' ? ` · attempt ${attempt}` : ` · ${RECITER.name}`}
          </div>
        </div>
        <button
          type="button"
          className={`btn btn-light${hidden ? ' pressed' : ''}`}
          aria-pressed={hidden}
          onClick={() => setHidden((h) => !h)}
        >
          {hidden ? <IconEye /> : <IconEyeOff />}
          {hidden ? 'Show text' : 'Hide text'}
        </button>
      </header>

      <div className={`surah-body mode-${mode}`}>
        <div className="text-card">
          <QuranText
            verses={verses}
            basmala={basmala}
            current={mode === 'listen' ? reciter.current : null}
            hidden={hidden}
            error={error}
            onRetry={retry}
            onTapVerse={mode === 'listen' ? reciter.playVerse : undefined}
            size={mode === 'listen' ? 'large' : 'medium'}
          />
        </div>

        {mode === 'record' && (
          <RecorderPanel assignment={a} childId={childId} onSent={onSent} onBack={onBack} canRecord={canRecord} />
        )}
      </div>

      {mode === 'listen' && (
        <div className="reciter-bar">
          <div className="reciter-info">
            <strong>{shownVerse ?? `${verseCount} ${verseCount === 1 ? 'verse' : 'verses'}`}</strong>
            <span className="muted small">
              {reciter.error
                ? "The reciter didn't load"
                : reciter.loading
                  ? 'Loading…'
                  : reciter.loop > 1 && reciter.current
                    ? `Repeat ${reciter.rep} of ${reciter.loop}`
                    : reciter.loop > 1
                      ? `Each verse ${reciter.loop}×`
                      : 'Plays once'}
            </span>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="reciter-controls">
            <button type="button" className="round-btn" onClick={reciter.prev} aria-label="Previous verse">
              <IconPrev size={26} />
            </button>
            {reciter.error ? (
              <button type="button" className="round-btn big dark" onClick={reciter.retry} aria-label="Try again">
                <span className="small-label">Retry</span>
              </button>
            ) : (
              <button
                type="button"
                className="round-btn big primary"
                onClick={reciter.toggle}
                aria-label={reciter.playing ? 'Pause' : 'Play'}
              >
                {reciter.playing ? <IconPause size={34} /> : <IconPlay size={34} />}
              </button>
            )}
            <button type="button" className="round-btn" onClick={reciter.next} aria-label="Next verse">
              <IconNext size={26} />
            </button>
          </div>
          <div className="repeat">
            <div className="muted small repeat-label">
              <IconRepeat size={16} /> Repeat each verse
            </div>
            <div className="segmented" role="group" aria-label="Repeat each verse">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={reciter.loop === n}
                  className={reciter.loop === n ? 'on' : ''}
                  onClick={() => reciter.setLoop(n)}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>
          <div className="grow" />
          {canRecord && (
            <button type="button" className="btn btn-record btn-lg" onClick={() => onMode('record')}>
              <IconMic size={26} />
              I'm ready, record
            </button>
          )}
        </div>
      )}
    </div>
  );
}
