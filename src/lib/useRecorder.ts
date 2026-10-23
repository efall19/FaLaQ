import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'starting' | 'recording' | 'recorded' | 'denied' | 'unsupported' | 'error';

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  // MP4/AAC first: it plays on every device, including iPhone Safari, which is
  // unreliable with WebM. Older Android browsers fall back to WebM.
  const candidates = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return '';
}

export function extensionFor(mime: string): string {
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Microphone recording with a running timer. */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>(
    typeof navigator !== 'undefined' && navigator.mediaDevices && typeof MediaRecorder !== 'undefined'
      ? 'idle'
      : 'unsupported',
  );
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = useCallback(async () => {
    if (state === 'unsupported') return;
    setState('starting');
    setBlob(null);
    setSeconds(0);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mime || 'audio/webm';
        const b = new Blob(chunksRef.current, { type });
        durationRef.current = (Date.now() - startedAtRef.current) / 1000;
        setSeconds(durationRef.current);
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState('recorded');
        stopTracks();
      };
      recRef.current = rec;
      rec.start(1000);
      startedAtRef.current = Date.now();
      setState('recording');
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setSeconds((Date.now() - startedAtRef.current) / 1000);
      }, 250);
    } catch (err: any) {
      stopTracks();
      const name = err?.name ?? '';
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
  }, [state]);

  const stop = useCallback(() => {
    clearTimer();
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null;
      rec.stop();
    }
    stopTracks();
    setBlob(null);
    setSeconds(0);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setState(typeof MediaRecorder !== 'undefined' ? 'idle' : 'unsupported');
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      const rec = recRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null;
        rec.stop();
      }
      stopTracks();
    },
    [],
  );

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return { state, seconds, blob, url, duration: durationRef.current, start, stop, reset };
}
