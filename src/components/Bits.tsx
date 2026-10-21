import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Status } from '../lib/types';
import { IconCheck, IconCircle, IconClock, IconPause, IconPlay, IconRedo } from './Icons';
import { fmtSec } from '../lib/dates';

const CHILD_LABEL: Record<Status, string> = {
  todo: 'To do',
  submitted: 'Sent · waiting for teacher',
  redo: 'Needs redo',
  approved: 'Approved · +1 star',
};
const PARENT_LABEL: Record<Status, string> = {
  todo: 'Not started',
  submitted: 'To review',
  redo: 'Redo asked',
  approved: 'Approved',
};

export function StatusBadge({ status, who = 'child', small = false }: { status: Status; who?: 'child' | 'parent'; small?: boolean }) {
  const label = who === 'child' ? CHILD_LABEL[status] : PARENT_LABEL[status];
  const Icon = status === 'approved' ? IconCheck : status === 'redo' ? IconRedo : status === 'submitted' ? IconClock : IconCircle;
  return (
    <span className={`badge badge-${status}${small ? ' badge-sm' : ''}`}>
      {!small && <Icon size={16} />}
      {label}
    </span>
  );
}

/** Compact audio player for a single file (recordings and voice notes). */
export function AudioPlayer({
  src,
  fallbackDuration,
  tone = 'teal',
  label,
  loadError,
}: {
  src: string | null;
  fallbackDuration?: number | null;
  tone?: 'teal' | 'clay' | 'ink';
  label?: ReactNode;
  loadError?: boolean;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState<number>(fallbackDuration ?? 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (fallbackDuration && !dur) setDur(fallbackDuration);
  }, [fallbackDuration, dur]);

  const toggle = () => {
    const a = ref.current;
    if (!a || !src) return;
    if (playing) {
      a.pause();
      return;
    }
    a.play().catch(() => setFailed(true));
  };

  const total = dur || fallbackDuration || 0;
  const pct = total ? Math.min(100, (pos / total) * 100) : 0;

  return (
    <div className={`player player-${tone}`}>
      {src && (
        <audio
          ref={ref}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setPos(0);
          }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDur(d);
          }}
          onError={() => setFailed(true)}
        />
      )}
      <button
        type="button"
        className="player-btn"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
      </button>
      <div className="player-body">
        {label && <div className="player-label">{label}</div>}
        <div className="bar">
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        {(failed || loadError) && <div className="player-error">Couldn't load this audio. Check the connection and try again.</div>}
      </div>
      <span className="player-time">{playing || pos ? fmtSec(pos) : fmtSec(total)}</span>
    </div>
  );
}

export function Toast({ children, onDone, ms = 5000, tone = 'ink' }: { children: ReactNode; onDone: () => void; ms?: number; tone?: 'ink' | 'error' }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return (
    <div className={`toast toast-${tone}`} role="status">
      {children}
    </div>
  );
}

export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <svg className="spin" aria-hidden="true" width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="#DCEBE5" strokeWidth="5" />
      <path d="M24 4a20 20 0 0 1 20 20" fill="none" stroke="#1E5E54" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function CenterMessage({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="center-msg">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
