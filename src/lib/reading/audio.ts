import { verseAudioUrl } from '../quran';
import type { Item, Row } from './types';

const pad3 = (n: number) => String(n).padStart(3, '0');

/** Quran.com word-by-word audio for one word. */
export function wordAudioUrl([s, a, w]: [number, number, number]): string {
  return `https://audio.qurancdn.com/wbw/${pad3(s)}_${pad3(a)}_${pad3(w)}.mp3`;
}

let player: HTMLAudioElement | null = null;

/** Plays one short clip, stopping any other. Resolves false if it can't play. */
export function playClip(url: string): Promise<boolean> {
  try {
    if (!player) player = new Audio();
    player.pause();
    player.src = url;
    return player.play().then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

export function stopClip() {
  player?.pause();
}

/** The sound for a tapped item: the word itself, or the whole verse for verse rows. */
export function audioFor(item: Item, row: Row): string | null {
  if (row.kind === 'verse' && row.ref && !item.w) return verseAudioUrl(row.ref.surah, row.ref.ayah);
  if (item.w) return wordAudioUrl(item.w);
  return null;
}
