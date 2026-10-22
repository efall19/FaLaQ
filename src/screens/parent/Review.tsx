import { useEffect, useState, type ReactNode } from 'react';
import type { Profile, RecordingWithAssignment } from '../../lib/types';
import type { Chapter } from '../../lib/quran';
import { fetchRecording, reviewRecording, uploadAudio } from '../../lib/data';
import { clock, fmtSec, shortDate } from '../../lib/dates';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { useVerses } from '../../lib/useVerses';
import { extensionFor, useRecorder } from '../../lib/useRecorder';
import { CRYSTALS_BY_ATTEMPT } from '../../lib/ship';
import { AudioPlayer, CenterMessage, Spinner } from '../../components/Bits';
import { QuranText } from '../../components/QuranText';
import { IconBack, IconCheck, IconMic, IconRedo, IconStop, IconX } from '../../components/Icons';

export function Review({
  recordingId,
  chapters,
  parentId,
  child,
  onDone,
}: {
  recordingId: string;
  chapters: Chapter[] | null;
  parentId: string;
  child: Profile;
  onDone: (toast?: string) => void;
}) {
  const [rec, setRec] = useState<RecordingWithAssignment | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    fetchRecording(recordingId)
      .then((r) => alive && setRec(r))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [recordingId, attempt]);

  const header = (
    <div className="p-topbar">
      <button type="button" className="icon-btn" onClick={() => onDone()} aria-label="Back">
        <IconBack size={24} />
      </button>
      <span className="grow p-topbar-title">Review</span>
      {rec && <span className="badge badge-submitted badge-sm">Attempt {rec.attempt}</span>}
    </div>
  );

  if (loadError) {
    return (
      <div className="review">
        {header}
        <CenterMessage
          title="Couldn't load this recording"
          action={
            <button type="button" className="btn btn-dark" onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          }
        />
      </div>
    );
  }
  if (rec === undefined) {
    return (
      <div className="review">
        {header}
        <div className="center-msg">
          <Spinner />
        </div>
      </div>
    );
  }
  if (rec === null) {
    return (
      <div className="review">
        {header}
        <CenterMessage title="Recording not found" />
      </div>
    );
  }
  return <ReviewBody rec={rec} header={header} chapters={chapters} parentId={parentId} child={child} onDone={onDone} />;
}

function ReviewBody({
  rec,
  header,
  chapters,
  parentId,
  child,
  onDone,
}: {
  rec: RecordingWithAssignment;
  header: ReactNode;
  chapters: Chapter[] | null;
  parentId: string;
  child: Profile;
  onDone: (toast?: string) => void;
}) {
  const a = rec.assignment;
  const chapter = chapters?.[a.surah - 1];
  const { url, error: urlError } = useSignedUrl(rec.audio_path);
  const text = useVerses(a.surah, a.verse_from, a.verse_to);
  const note = useRecorder();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [error, setError] = useState('');
  const alreadyReviewed = rec.review !== 'pending';

  const decide = async (approve: boolean) => {
    setBusy(approve ? 'approve' : 'reject');
    setError('');
    try {
      let notePath: string | null = null;
      let noteDur: number | null = null;
      if (note.blob && note.state === 'recorded') {
        notePath = `${parentId}/notes/${rec.id}-${Date.now()}.${extensionFor(note.blob.type)}`;
        await uploadAudio(notePath, note.blob);
        noteDur = note.seconds;
      }
      await reviewRecording(rec.id, approve, comment, notePath, noteDur);
      onDone(
        approve
          ? `Approved. ${child.display_name} earned a star and ${CRYSTALS_BY_ATTEMPT(rec.attempt)} crystals (attempt ${rec.attempt}).`
          : `Sent back for a redo. ${child.display_name} will see your note on the card.`,
      );
    } catch (e: any) {
      setError(e?.message ? `Couldn't save: ${e.message}` : "Couldn't save. Check the connection and try again.");
      setBusy(null);
    }
  };

  return (
    <div className="review">
      {header}
      <div className="review-scroll">
        <div className="row-between baseline">
          <div>
            <h1 className="p-title">{chapter?.name ?? `Surah ${a.surah}`}</h1>
            <div className="muted small">
              Verses {a.verse_from}–{a.verse_to} · {a.kind === 'memorization' ? 'New memorization' : 'Revision'} ·{' '}
              {shortDate(a.due_date)} {clock(rec.created_at)}
            </div>
          </div>
          {chapter && (
            <div className="ar-name" lang="ar" dir="rtl">
              {chapter.arabic}
            </div>
          )}
        </div>

        <div className="box">
          <AudioPlayer src={url} loadError={urlError} fallbackDuration={rec.duration_sec} label={`Recording · ${fmtSec(rec.duration_sec)}`} />
        </div>

        <div className="box">
          <div className="eyebrow">Follow along</div>
          <QuranText verses={text.verses} basmala={null} error={text.error} onRetry={text.retry} size="small" />
        </div>

        {alreadyReviewed ? (
          <div className="box">
            This recording was already {rec.review === 'approved' ? 'approved' : 'sent back for a redo'}.
          </div>
        ) : (
          <>
            <div className="box col gap">
              <strong>
                Voice note for {child.display_name} <span className="muted normal">· optional</span>
              </strong>
              {(note.state === 'idle' || note.state === 'starting') && (
                <button type="button" className="btn btn-dashed" onClick={note.start} disabled={note.state === 'starting'}>
                  <IconMic size={20} />
                  Record voice note
                </button>
              )}
              {note.state === 'recording' && (
                <div className="row-gap center">
                  <button type="button" className="rec-btn sm pulse" onClick={note.stop} aria-label="Stop voice note">
                    <IconStop size={18} />
                  </button>
                  <strong className="grow rec-text">Recording…</strong>
                  <span className="rec-text">{fmtSec(note.seconds)}</span>
                </div>
              )}
              {note.state === 'recorded' && (
                <>
                  <AudioPlayer src={note.url} fallbackDuration={note.seconds} tone="ink" />
                  <div className="row-gap">
                    <button type="button" className="btn btn-outline-ink btn-sm grow" onClick={note.start}>
                      <IconRedo size={18} /> Redo
                    </button>
                    <button type="button" className="btn btn-outline-ink btn-sm grow" onClick={note.reset}>
                      <IconX size={18} /> Remove
                    </button>
                  </div>
                  <div className="muted small">The note is attached when you choose below.</div>
                </>
              )}
              {(note.state === 'denied' || note.state === 'error' || note.state === 'unsupported') && (
                <div className="muted small">
                  The microphone isn't available. Allow it for this site in your phone's settings, or write a comment instead.
                </div>
              )}
            </div>

            <label className="field">
              <span>
                Comment <span className="muted normal">· optional</span>
              </span>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Slow down on verse 4" />
            </label>
            {error && (
              <div className="error-text" role="alert">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {!alreadyReviewed && (
        <div className="review-actions">
          <button
            type="button"
            className="btn btn-outline-clay grow"
            onClick={() => decide(false)}
            disabled={busy !== null || note.state === 'recording'}
          >
            {busy === 'reject' ? <Spinner size={20} /> : <IconRedo size={18} />}
            Needs redo
          </button>
          <button
            type="button"
            className="btn btn-primary grow"
            onClick={() => decide(true)}
            disabled={busy !== null || note.state === 'recording'}
          >
            {busy === 'approve' ? <Spinner size={20} /> : <IconCheck size={18} />}
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
