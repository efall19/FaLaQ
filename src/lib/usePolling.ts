import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data now, again every `everyMs`, and whenever the app comes back to
 * the foreground. Keeps showing the last good data if a refresh fails.
 */
export function usePolling<T>(load: () => Promise<T>, deps: unknown[], everyMs = 20000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const d = await loadRef.current();
      if (mine !== seq.current) return;
      setData(d);
      setError(false);
    } catch {
      if (mine !== seq.current) return;
      setError(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    reload();
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, everyMs);
    const onVis = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', reload);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', reload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}
