/**
 * Viseme lip-sync from ElevenLabs per-character timing (no extra tools / binaries).
 *
 * Mouth shapes follow the Preston Blair / Rhubarb set used by most 2D studios:
 *   A closed (M B P)      B slightly open, teeth (most consonants)   C open (EH, IH, EE)
 *   D wide open (AA)      E rounded (AO, ER, R)                       F puckered (OO, W, U)
 *   G teeth on lip (F V)  H tongue up (L)                             X rest (silence)
 */
export type Viseme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface CharTiming {
  c: string;
  s: number;
  e: number;
}

const DIGRAPHS: Record<string, Viseme> = {
  th: 'B', sh: 'B', ch: 'B', ph: 'G', wh: 'F',
  oo: 'F', ou: 'E', ow: 'E', oa: 'E', oi: 'E', oy: 'E',
  ee: 'C', ea: 'C', ai: 'C', ay: 'C', ie: 'C', ei: 'C', ey: 'C',
  au: 'E', aw: 'E',
};

const SINGLE: Record<string, Viseme> = {
  a: 'D', e: 'C', i: 'C', y: 'C', o: 'E', u: 'F', w: 'F', q: 'F', r: 'E',
  m: 'A', b: 'A', p: 'A', f: 'G', v: 'G', l: 'H',
};

/** Map each character to a viseme (letters only; others → null = gap) */
export function charsToVisemes(chars: CharTiming[]): { v: Viseme; s: number; e: number }[] {
  const out: { v: Viseme; s: number; e: number }[] = [];
  const lower = chars.map((ch) => ch.c.toLowerCase());
  for (let i = 0; i < chars.length; i++) {
    const c = lower[i];
    if (!/[a-z]/.test(c)) continue;
    const next = lower[i + 1] ?? '';
    const prev = lower[i - 1] ?? '';
    // silent trailing "e" (time, made, snap-e…) → extend the previous shape
    if (c === 'e' && !/[a-z]/.test(next) && /[a-z]/.test(prev) && /[a-z]/.test(lower[i - 2] ?? '') && out.length) {
      out[out.length - 1].e = chars[i].e;
      continue;
    }
    const di = DIGRAPHS[c + next];
    if (di) {
      out.push({ v: di, s: chars[i].s, e: chars[i + 1].e });
      i++;
      continue;
    }
    out.push({ v: SINGLE[c] ?? 'B', s: chars[i].s, e: chars[i].e });
  }
  return out;
}

/**
 * Per-frame viseme string. The mouth leads the sound by ~1 frame (what animators do so it reads in sync),
 * gaps under 120 ms hold the last shape, single-frame flickers are removed (except lip closures).
 */
export function computeVisemeTrack(chars: CharTiming[], fps: number, frames: number, envelope?: number[]): string {
  let segs = charsToVisemes(chars);
  // ElevenLabs timing can sit a few frames ahead of the real voice onset: align to the audio envelope
  if (envelope?.length && segs.length) {
    const onset = envelope.findIndex((e) => e > 0.15);
    if (onset > 0) {
      const shift = Math.max(-0.1, Math.min(0.2, onset / fps - segs[0].s));
      if (Math.abs(shift) > 0.5 / fps) segs = segs.map((g) => ({ ...g, s: g.s + shift, e: g.e + shift }));
    }
  }
  const lead = 1 / fps;
  const track: Viseme[] = [];
  let k = 0;
  let lastEnd = -1;
  let last: Viseme = 'X';
  for (let f = 0; f < frames; f++) {
    const t = f / fps + lead;
    while (k < segs.length && segs[k].e <= t) {
      lastEnd = segs[k].e;
      last = segs[k].v;
      k++;
    }
    let v: Viseme;
    if (k < segs.length && segs[k].s <= t) v = segs[k].v;
    else if (lastEnd >= 0 && t - lastEnd < 0.12) v = last;
    else v = 'X';
    // quiet frames inside a word read better slightly open than wide open
    if (envelope && v !== 'A' && v !== 'X' && (envelope[f] ?? 1) < 0.06) v = 'B';
    track.push(v);
  }
  // remove 1-frame blips (keep closures so P/B/M visibly close)
  for (let f = 1; f < track.length - 1; f++) {
    // drop 1-frame consonant blips; keep 1-frame vowels (C D E F) and closures (A) so speech reads
    if (track[f] !== track[f - 1] && track[f] !== track[f + 1] && 'BGHX'.includes(track[f])) track[f] = track[f - 1];
  }
  // never jump straight from rest to wide open: insert a 1-frame "B" on the way in/out
  for (let f = 1; f < track.length; f++) {
    if (track[f - 1] === 'X' && track[f] === 'D') track[f - 1] = 'B';
    if (track[f - 1] === 'D' && track[f] === 'X') track[f] = 'B';
  }
  return track.join('');
}

/** Frames where highlighted words begin (speaker raises brows) */
export function emphasisFrames(words: { word: string; startSeconds: number }[], highlights: string[] | undefined, fps: number): number[] {
  if (!highlights?.length) return [];
  const hs = new Set(highlights.map((h) => h.toLowerCase()));
  return words
    .filter((w) => hs.has(w.word.toLowerCase().replace(/[^a-z0-9']/g, '')))
    .map((w) => Math.max(0, Math.round(w.startSeconds * fps)));
}
