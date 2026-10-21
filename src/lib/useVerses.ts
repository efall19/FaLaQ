import { useEffect, useState } from 'react';
import { getBasmala, getChapters, getVerses, hasBasmala, type Chapter, type Verse } from './quran';

export function useChapters() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    getChapters()
      .then((c) => alive && setChapters(c))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return { chapters, error, retry: () => setAttempt((n) => n + 1) };
}

/** Verses from..to of a surah, plus the Basmala line when the range starts at verse 1. */
export function useVerses(surah: number, from: number, to: number) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [basmala, setBasmala] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    setVerses(null);
    const wantBasmala = from === 1 && hasBasmala(surah);
    Promise.all([getVerses(surah), wantBasmala ? getBasmala() : Promise.resolve(null)])
      .then(([all, b]) => {
        if (!alive) return;
        setVerses(all.filter((v) => v.n >= from && v.n <= to));
        setBasmala(b);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [surah, from, to, attempt]);
  return { verses, basmala, error, retry: () => setAttempt((n) => n + 1) };
}
