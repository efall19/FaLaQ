import { useState } from 'react';
import type { Item, Page, Row } from '../lib/reading/types';
import { spell } from '../lib/reading/arabic';
import { audioFor, playClip } from '../lib/reading/audio';
import { verseAudioUrl, arabicNumber } from '../lib/quran';
import { IconHeadphones } from './Icons';

/**
 * A reading page: big Arabic rows, right to left.
 * - child: tap an item to hear it (Quran words), optional spelling hints
 * - review: tap items to mark mistakes
 * - preview: read-only
 */
export function ReadingPageView({
  page,
  mode,
  showSpelling = false,
  selected,
  onToggle,
}: {
  page: Page;
  mode: 'child' | 'review' | 'preview';
  showSpelling?: boolean;
  selected?: Set<string>;
  onToggle?: (item: string) => void;
}) {
  const [noAudio, setNoAudio] = useState<string | null>(null);

  const tap = async (item: Item, row: Row) => {
    if (mode === 'review') {
      onToggle?.(item.t);
      return;
    }
    if (mode !== 'child') return;
    const url = audioFor(item, row);
    if (!url) return;
    const ok = await playClip(url);
    setNoAudio(ok ? null : item.t);
  };

  return (
    <div className={`rpage rpage-${page.size}`}>
      {page.rows.map((row, ri) => (
        <section key={ri} className={`rrow${row.tag ? ` rrow-${row.tag}` : ''}${row.kind === 'verse' ? ' rrow-verse' : ''}`}>
          {(row.label || row.find || row.ref) && (
            <div className="rrow-head">
              {row.label && <span className="rrow-label">{row.label}</span>}
              {row.find && (
                <span className="rrow-label">
                  Find {row.find.count} {row.find.what}
                </span>
              )}
              {row.ref && (
                <span className="muted small">
                  Surah {row.ref.surah}, verse {row.ref.ayah}
                </span>
              )}
              {row.kind === 'verse' && row.ref && mode === 'child' && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => playClip(verseAudioUrl(row.ref!.surah, row.ref!.ayah))}
                >
                  <IconHeadphones size={18} /> Listen
                </button>
              )}
            </div>
          )}
          <div className="ritems" dir="rtl" lang="ar">
            {row.items.map((it, ii) => {
              const on = selected?.has(it.t);
              const playable = mode === 'child' && !!it.w;
              const hint = showSpelling && row.kind === 'items' ? spell(it.t) : '';
              return (
                <button
                  key={ii}
                  type="button"
                  className={`ritem${on ? ' on' : ''}${playable ? ' playable' : ''}`}
                  onClick={() => tap(it, row)}
                  aria-pressed={mode === 'review' ? !!on : undefined}
                  disabled={mode === 'preview' || (mode === 'child' && !playable)}
                >
                  <span className="ritem-ar">{it.t}</span>
                  {it.say && (
                    <span className="ritem-say" dir="ltr">
                      {it.say}
                    </span>
                  )}
                  {hint && (
                    <span className="ritem-say" dir="ltr">
                      {hint}
                    </span>
                  )}
                </button>
              );
            })}
            {row.kind === 'verse' && row.ref && (
              <span className="ayah-num rverse-end" aria-label={`verse ${row.ref.ayah}`}>
                {arabicNumber(row.ref.ayah)}
              </span>
            )}
          </div>
        </section>
      ))}
      {noAudio && mode === 'child' && <div className="muted small">The sound for {noAudio} didn't load.</div>}
    </div>
  );
}
