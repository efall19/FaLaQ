import { useCallback, useEffect, useRef, useState } from 'react';
import { hasBasmala, verseAudioUrl } from './quran';

/**
 * Verse-by-verse reciter player.
 * `current` is the verse being played (0 = the Basmala before verse 1, null = stopped).
 */
export function useReciter(surah: number, from: number, to: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const st = useRef({ current: null as number | null, rep: 1, loop: 1 });
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loop, setLoopState] = useState(1);
  const [rep, setRep] = useState(1);

  const load = useCallback(
    (n: number, r: number) => {
      const a = audioRef.current;
      if (!a) return;
      st.current.current = n;
      st.current.rep = r;
      setCurrent(n);
      setRep(r);
      setError(false);
      setLoading(true);
      a.src = n === 0 ? verseAudioUrl(1, 1) : verseAudioUrl(surah, n);
      a.play()
        .then(() => setPlaying(true))
        .catch((e) => {
          setLoading(false);
          setPlaying(false);
          if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') setError(true);
        });
    },
    [surah],
  );

  const startFromTop = useCallback(() => {
    load(from === 1 && hasBasmala(surah) ? 0 : from, 1);
  }, [from, surah, load]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    const { current: n, rep: r, loop: L } = st.current;
    if (n === null) return;
    if (n === 0) return load(from, 1);
    if (r < L) return load(n, r + 1);
    if (n < to) return load(n + 1, 1);
    st.current.current = null;
    setCurrent(null);
    setPlaying(false);
  };

  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    audioRef.current = a;
    const onEnded = () => advanceRef.current();
    const onError = () => {
      if (!a.getAttribute('src')) return;
      setError(true);
      setPlaying(false);
      setLoading(false);
    };
    const onPlaying = () => {
      setLoading(false);
      setError(false);
    };
    const onWaiting = () => setLoading(true);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onError);
    a.addEventListener('playing', onPlaying);
    a.addEventListener('waiting', onWaiting);
    return () => {
      a.pause();
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onError);
      a.removeEventListener('playing', onPlaying);
      a.removeEventListener('waiting', onWaiting);
      a.removeAttribute('src');
      a.load();
      audioRef.current = null;
    };
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) return pause();
    if (st.current.current === null) return startFromTop();
    a.play()
      .then(() => setPlaying(true))
      .catch(() => setError(true));
  }, [playing, pause, startFromTop]);

  const prev = useCallback(() => {
    const n = st.current.current;
    if (n === null || n <= from) return load(from, 1);
    load(n - 1, 1);
  }, [from, load]);

  const next = useCallback(() => {
    const n = st.current.current;
    if (n === null || n === 0) return load(from, 1);
    load(Math.min(to, n + 1), 1);
  }, [from, to, load]);

  const playVerse = useCallback((n: number) => load(n, 1), [load]);

  const setLoop = useCallback((L: number) => {
    st.current.loop = L;
    if (st.current.rep > L) st.current.rep = L;
    setLoopState(L);
  }, []);

  const retry = useCallback(() => {
    const n = st.current.current;
    if (n === null) startFromTop();
    else load(n, st.current.rep);
  }, [load, startFromTop]);

  return { current, playing, loading, error, loop, rep, toggle, pause, prev, next, playVerse, setLoop, retry };
}
