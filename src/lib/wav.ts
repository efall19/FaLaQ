// Converts any recording the browser can decode (e.g. WebM/Opus from Android
// Chrome) into a mono 16-bit WAV file, which every device can play, including
// iPhone Safari. 22.05 kHz mono ≈ 43 KB per second: fine for recitation, and old
// files are cleaned up automatically.

const RATE = 22050;

export async function toWav(input: Blob): Promise<Blob> {
  const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await input.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * RATE));
    const offline = new OfflineAudioContext(1, length, RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), RATE);
  } finally {
    ctx.close().catch(() => undefined);
  }
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** MP4/AAC (iPhone, iPad, newer Chrome) already plays everywhere; anything else becomes WAV. */
export async function toPlayableEverywhere(blob: Blob): Promise<Blob> {
  if (blob.type.includes('mp4') || blob.type.includes('wav')) return blob;
  try {
    return await toWav(blob);
  } catch {
    return blob; // couldn't convert: upload the original rather than lose the recording
  }
}
