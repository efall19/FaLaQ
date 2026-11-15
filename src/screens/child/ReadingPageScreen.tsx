import { useEffect, useState } from 'react';
import type { Assignment, Recording } from '../../lib/types';
import { DEFAULT_OPTIONS, type ReadingOptions } from '../../lib/reading/types';
import { fetchModelAudio, type ModelAudio } from '../../lib/reading/data';
import { lessonMeta } from '../../lib/reading/lessons';
import { stopClip } from '../../lib/reading/audio';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { AudioPlayer, CenterMessage } from '../../components/Bits';
import { ReadingPageView } from '../../components/ReadingPage';
import { IconBack, IconMic } from '../../components/Icons';
import { RecorderPanel } from './RecorderPanel';
import { TeacherNote } from './Today';

export function ReadingPageScreen({
  task: a,
  childId,
  latest,
  options = DEFAULT_OPTIONS,
  mode,
  backLabel,
  onMode,
  onBack,
  onSent,
}: {
  task: Assignment;
  childId: string;
  latest?: Recording;
  options?: ReadingOptions;
  mode: 'read' | 'record';
  backLabel: string;
  onMode: (m: 'read' | 'record') => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const page = a.reading_content;
  const lesson = a.reading_lesson ?? 1;
  const meta = lessonMeta(lesson);
  const canRecord = a.status === 'todo' || a.status === 'redo';
  const attempt = (latest?.attempt ?? 0) + (canRecord ? 1 : 0);
  const spellingOn = options.spell && lesson < 10 && lesson >= 4;
  const [showSpelling, setShowSpelling] = useState(false);

  const [model, setModel] = useState<ModelAudio | null>(null);
  useEffect(() => {
    let alive = true;
    fetchModelAudio(childId)
      .then((list) => alive && setModel(list.find((m) => m.lesson === lesson && m.page === a.reading_page) ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
      stopClip();
    };
  }, [childId, lesson, a.reading_page]);
  const modelUrl = useSignedUrl(model?.path);

  const steps = spellingOn ? ['Listen', 'Spell', 'Read', 'Record'] : ['Listen', 'Read', 'Record'];

  return (
    <div className="surah-screen">
      <header className="surah-header">
        <button type="button" className="btn btn-light" onClick={onBack}>
          <IconBack />
          {backLabel}
        </button>
        <div className="surah-title">
          <h1>
            {mode === 'record' ? 'Record · ' : ''}Lesson {lesson}, page {a.reading_page}{' '}
            <span className="ar-inline blue" lang="ar" dir="rtl">
              {meta.ar}
            </span>
          </h1>
          <div className="muted small">
            {page?.title ?? meta.en}
            {mode === 'record' ? ` · attempt ${attempt}` : ''}
          </div>
        </div>
        {spellingOn && mode === 'read' ? (
          <button
            type="button"
            className={`btn btn-light${showSpelling ? ' pressed' : ''}`}
            aria-pressed={showSpelling}
            onClick={() => setShowSpelling((v) => !v)}
          >
            {showSpelling ? 'Hide spelling' : 'Spell it'}
          </button>
        ) : (
          <span style={{ width: 90 }} />
        )}
      </header>

      <div className={`surah-body mode-${mode === 'read' ? 'listen' : 'record'}`}>
        <div className="text-card reading-card-body">
          {!page ? (
            <CenterMessage title="This page couldn't be shown" />
          ) : (
            <>
              {mode === 'read' && (
                <div className="reading-intro">
                  <ol className="steps" aria-label="How to do this page">
                    {steps.map((s, i) => (
                      <li key={s}>
                        <span>{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <p className="reading-hint">{page.hint}</p>
                  {a.status === 'redo' && latest && <TeacherNote rec={latest} />}
                  {model ? (
                    <AudioPlayer
                      src={modelUrl.url}
                      path={model.path}
                      loadError={modelUrl.error}
                      fallbackDuration={model.duration_sec}
                      label="Your teacher reads this page"
                    />
                  ) : (
                    page.rows.some((r) => r.items.some((it) => it.w) || r.kind === 'verse') && (
                      <div className="muted small">Tap a Quran word to hear it.</div>
                    )
                  )}
                </div>
              )}
              <ReadingPageView page={page} mode={mode === 'read' ? 'child' : 'preview'} showSpelling={showSpelling && mode === 'read'} />
            </>
          )}
        </div>

        {mode === 'record' && <RecorderPanel assignment={a} childId={childId} onSent={onSent} onBack={onBack} canRecord={canRecord} />}
      </div>

      {mode === 'read' && canRecord && (
        <div className="reciter-bar reading-bar">
          <div className="grow muted">Read it a few times out loud. When it's smooth, record it.</div>
          <button type="button" className="btn btn-record btn-lg" onClick={() => onMode('record')}>
            <IconMic size={26} />
            I'm ready, record
          </button>
        </div>
      )}
    </div>
  );
}
