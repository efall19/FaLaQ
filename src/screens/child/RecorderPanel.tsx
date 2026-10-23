import { useState } from 'react';
import type { Assignment } from '../../lib/types';
import { extensionFor, useRecorder } from '../../lib/useRecorder';
import { toPlayableEverywhere } from '../../lib/wav';
import { submitRecording, uploadAudio } from '../../lib/data';
import { fmtSec } from '../../lib/dates';
import { AudioPlayer, Spinner } from '../../components/Bits';
import { IconCheck, IconMic, IconMicOff, IconRedo, IconSend, IconStop, IconWifiOff } from '../../components/Icons';

type Phase = 'record' | 'uploading' | 'sent' | 'failed';

export function RecorderPanel({
  assignment,
  childId,
  canRecord,
  onSent,
  onBack,
}: {
  assignment: Assignment;
  childId: string;
  canRecord: boolean;
  onSent: () => void;
  onBack: () => void;
}) {
  const rec = useRecorder();
  const [phase, setPhase] = useState<Phase>('record');
  const [failMsg, setFailMsg] = useState('');
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  const send = async () => {
    if (!rec.blob) return;
    setPhase('uploading');
    try {
      let path = uploadedPath;
      if (!path) {
        const file = await toPlayableEverywhere(rec.blob); // WebM → WAV so the iPhone can play it
        path = `${childId}/${assignment.id}/${Date.now()}.${extensionFor(file.type)}`;
        await uploadAudio(path, file);
        setUploadedPath(path);
      }
      await submitRecording(assignment.id, path, rec.seconds);
      setPhase('sent');
      onSent();
    } catch (e: any) {
      setFailMsg(String(e?.message ?? ''));
      setPhase('failed');
    }
  };

  if (phase === 'sent') {
    return (
      <div className="recorder">
        <div className="done-circle">
          <IconCheck size={60} />
        </div>
        <h2 role="status">Sent!</h2>
        <p className="muted">
          Your teacher will listen soon.
          <br />
          You'll see the result on Today.
        </p>
        <button type="button" className="btn btn-primary btn-lg" onClick={onBack}>
          Back to Today
        </button>
      </div>
    );
  }

  if (phase === 'uploading') {
    return (
      <div className="recorder">
        <Spinner size={72} />
        <h2 role="status">Sending to your teacher…</h2>
      </div>
    );
  }

  if (phase === 'failed') {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <div className="recorder warn">
        <div className="warn-circle">
          <IconWifiOff size={42} />
        </div>
        <h2>Couldn't send yet</h2>
        <p className="muted">
          {offline ? 'The internet seems to be off. ' : ''}Your recording is still here. Keep this screen open and try again.
        </p>
        {failMsg && !offline && <p className="tiny muted">{failMsg}</p>}
        <button type="button" className="btn btn-dark btn-lg" onClick={send}>
          Try again
        </button>
      </div>
    );
  }

  if (!canRecord) {
    return (
      <div className="recorder">
        <h2>Already sent</h2>
        <p className="muted">Wait for your teacher to listen.</p>
      </div>
    );
  }

  switch (rec.state) {
    case 'unsupported':
      return (
        <div className="recorder warn">
          <div className="warn-circle">
            <IconMicOff size={42} />
          </div>
          <h2>Recording isn't available</h2>
          <p className="muted">This browser can't record. Open the app from the home screen icon, or ask your teacher.</p>
        </div>
      );
    case 'denied':
      return (
        <div className="recorder warn">
          <div className="warn-circle">
            <IconMicOff size={42} />
          </div>
          <h2>The microphone is switched off</h2>
          <p className="muted">
            Ask your teacher to allow the microphone for this app in the tablet's settings. You can still listen while you wait.
          </p>
          <button type="button" className="btn btn-dark btn-lg" onClick={rec.start}>
            Try again
          </button>
        </div>
      );
    case 'error':
      return (
        <div className="recorder warn">
          <div className="warn-circle">
            <IconMicOff size={42} />
          </div>
          <h2>The microphone didn't start</h2>
          <p className="muted">Close other apps that use the microphone, then try again.</p>
          <button type="button" className="btn btn-dark btn-lg" onClick={rec.start}>
            Try again
          </button>
        </div>
      );
    case 'recording':
      return (
        <div className="recorder">
          <div className="rec-timer" role="timer">
            {fmtSec(rec.seconds)}
          </div>
          <button type="button" className="rec-btn pulse" onClick={rec.stop} aria-label="Stop recording">
            <IconStop size={56} />
          </button>
          <div className="levels" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <h2>Recording… tap to stop</h2>
        </div>
      );
    case 'recorded':
      return (
        <div className="recorder">
          <h2>Listen to yourself</h2>
          <div className="full">
            <AudioPlayer src={rec.url} fallbackDuration={rec.seconds} />
          </div>
          <div className="row-gap full">
            <button
              type="button"
              className="btn btn-outline-ink btn-lg grow"
              onClick={() => {
                setUploadedPath(null);
                rec.reset();
              }}
            >
              <IconRedo />
              Redo
            </button>
            <button type="button" className="btn btn-primary btn-lg grow-more" onClick={send}>
              <IconSend />
              Submit
            </button>
          </div>
        </div>
      );
    default:
      return (
        <div className="recorder">
          <button
            type="button"
            className="rec-btn"
            onClick={rec.start}
            disabled={rec.state === 'starting'}
            aria-label="Start recording"
          >
            <IconMic size={64} />
          </button>
          <h2>Tap to record</h2>
          <p className="muted">Recite the whole {assignment.kind === 'memorization' ? 'passage' : 'surah'}, then tap Stop.</p>
        </div>
      );
  }
}
