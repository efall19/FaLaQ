import { useEffect, useState } from 'react';
import { audioUrl } from './data';

/** Turns a private storage path into a temporary playable URL. */
export function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setError(false);
    if (!path) return;
    audioUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [path]);
  return { url, error };
}
