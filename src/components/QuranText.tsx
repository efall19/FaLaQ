import { useEffect, useRef } from 'react';
import type { Verse } from '../lib/quran';
import { arabicNumber } from '../lib/quran';
import { IconEyeOff } from './Icons';
import { Spinner } from './Bits';

/**
 * Arabic text of a verse range, one verse per line, right-to-left.
 * The current verse is highlighted and scrolled into view.
 */
export function QuranText({
  verses,
  basmala,
  current,
  hidden,
  error,
  onRetry,
  onTapVerse,
  size = 'large',
}: {
  verses: Verse[] | null;
  basmala: string | null;
  current?: number | null;
  hidden?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onTapVerse?: (n: number) => void;
  size?: 'large' | 'medium' | 'small';
}) {
  const refs = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    if (current === null || current === undefined) return;
    refs.current.get(current)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current]);

  if (error) {
    return (
      <div className="quran-empty">
        <strong>Couldn't load the verses</strong>
        <span className="muted">Check the internet connection.</span>
        {onRetry && (
          <button type="button" className="btn btn-dark" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (!verses) {
    return (
      <div className="quran-empty">
        <Spinner />
      </div>
    );
  }
  if (hidden) {
    return (
      <div className="quran-empty">
        <span style={{ color: '#1E5E54', display: 'flex' }}>
          <IconEyeOff size={52} />
        </span>
        <strong className="big">Text hidden</strong>
        <span className="muted">Listen, then try reciting from memory.</span>
        <div className="dots" aria-hidden="true">
          {verses.map((v) => (
            <span key={v.n} className={v.n === current ? 'on' : ''} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`quran quran-${size}`} lang="ar" dir="rtl">
      {basmala && (
        <div
          className={`basmala${current === 0 ? ' active' : ''}`}
          ref={(el) => {
            if (el) refs.current.set(0, el);
          }}
        >
          {basmala}
        </div>
      )}
      {verses.map((v) => {
        const cls = `ayah${v.n === current ? ' active' : ''}`;
        const content = (
          <>
            {v.text}{' '}
            <span className="ayah-num" aria-label={`verse ${v.n}`}>
              {arabicNumber(v.n)}
            </span>
          </>
        );
        return onTapVerse ? (
          <button
            key={v.n}
            type="button"
            className={cls}
            onClick={() => onTapVerse(v.n)}
            aria-label={`Play verse ${v.n}`}
            ref={(el) => {
              if (el) refs.current.set(v.n, el);
            }}
          >
            {content}
          </button>
        ) : (
          <div
            key={v.n}
            className={cls}
            ref={(el) => {
              if (el) refs.current.set(v.n, el);
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
