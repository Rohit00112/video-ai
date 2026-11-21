import fs from 'node:fs';
import path from 'node:path';
import { createSeededRng } from '../../utils/math.js';
import { SfxId } from '../scripting/schema.js';

const SAMPLE_RATE = 48000;

function writeStereoWav(filePath: string, left: Float32Array, right: Float32Array): void {
  const numSamples = left.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-0.98, Math.min(0.98, left[i]));
    const r = Math.max(-0.98, Math.min(0.98, right[i]));
    buffer.writeInt16LE(Math.round(l * 32767), offset);
    buffer.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Generates an upbeat, warm pastoral marimba + acoustic pluck + soft bass loop (72 seconds)
 * so it comfortably spans any 45–68s YouTube Short without harsh cuts.
 */
function synthesizePastoralMusic(durationSeconds: number): { left: Float32Array; right: Float32Array } {
  const totalSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const bpm = 112;
  const beatDur = 60 / bpm;
  const eighthDur = beatDur / 2;

  // Cheerful storybook progression: C -> G -> Am -> F
  const chords = [
    { bass: 48, notes: [60, 64, 67, 72] },
    { bass: 43, notes: [59, 62, 67, 71] },
    { bass: 45, notes: [60, 64, 69, 72] },
    { bass: 41, notes: [60, 65, 69, 72] },
  ];

  const melodyPattern = [0, 2, 1, 3, 2, 1, 2, 0];
  const totalEighths = Math.ceil(durationSeconds / eighthDur);

  const addPluck = (
    startSec: number,
    freq: number,
    amp: number,
    decaySec: number,
    pan: number,
    warmth = 0.25
  ) => {
    const startIdx = Math.floor(startSec * SAMPLE_RATE);
    const len = Math.floor(decaySec * SAMPLE_RATE);
    const gainL = amp * Math.cos(((pan + 1) * Math.PI) / 4);
    const gainR = amp * Math.sin(((pan + 1) * Math.PI) / 4);

    for (let i = 0; i < len && startIdx + i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.008);
      const env = attack * Math.exp(-t / (decaySec * 0.28));
      const fundamental = Math.sin(2 * Math.PI * freq * t);
      const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * t) * warmth * Math.exp(-t * 9);
      const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * t) * (warmth * 0.35) * Math.exp(-t * 14);
      const sample = (fundamental + harmonic2 + harmonic3) * env;
      left[startIdx + i] += sample * gainL;
      right[startIdx + i] += sample * gainR;
    }
  };

  for (let step = 0; step < totalEighths; step++) {
    const t = step * eighthDur;
    const barIndex = Math.floor(step / 8);
    const chord = chords[barIndex % chords.length];
    const subStep = step % 8;

    // Gentle acoustic pizzicato marimba arpeggio
    const noteMidi = chord.notes[melodyPattern[subStep]];
    const accent = subStep === 0 || subStep === 4 ? 1.0 : 0.72;
    const pan = subStep % 2 === 0 ? -0.28 : 0.28;
    addPluck(t, midiToFreq(noteMidi), 0.16 * accent, 0.55, pan, 0.28);

    // Warm plucked upright bass on beat 1 and 3
    if (subStep === 0 || subStep === 4) {
      const bassMidi = subStep === 0 ? chord.bass : chord.bass + 7;
      addPluck(t, midiToFreq(bassMidi), 0.22, 0.75, 0.0, 0.12);
    }

    // Light brushed shaker / wood tap on off-beats
    if (subStep % 2 === 1) {
      const tapStart = Math.floor(t * SAMPLE_RATE);
      const tapLen = Math.floor(0.035 * SAMPLE_RATE);
      for (let i = 0; i < tapLen && tapStart + i < totalSamples; i++) {
        const dt = i / SAMPLE_RATE;
        const env = Math.exp(-dt / 0.008);
        const wood = Math.sin(2 * Math.PI * 1420 * dt) * env * 0.03;
        left[tapStart + i] += wood;
        right[tapStart + i] += wood;
      }
    }

    // Playful high bell sparkle every 2 bars
    if (subStep === 6 && barIndex % 2 === 1) {
      addPluck(t, midiToFreq(chord.notes[3] + 12), 0.065, 0.6, 0.35, 0.15);
    }
  }

  // Soft fade in/out to avoid clicks
  const fadeSamples = Math.floor(0.4 * SAMPLE_RATE);
  for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
    const g = i / fadeSamples;
    left[i] *= g;
    right[i] *= g;
    left[totalSamples - 1 - i] *= g;
    right[totalSamples - 1 - i] *= g;
  }

  return { left, right };
}

/**
 * Upbeat 118 BPM funky Shorts groove: punchy kick/snare/hats, syncopated slap bass,
 * staccato chord stabs and a bouncy lead hook. Designed to sit under narration.
 */
function synthesizeFunkyMusic(durationSeconds: number): { left: Float32Array; right: Float32Array } {
  const total = Math.floor(durationSeconds * SAMPLE_RATE);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const rng = createSeededRng(118118);
  const bpm = 118;
  const beat = 60 / bpm;
  const six = beat / 4;

  const add = (start: number, len: number, fn: (t: number) => number, panL = 1, panR = 1) => {
    const s0 = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(len * SAMPLE_RATE);
    for (let i = 0; i < n && s0 + i < total; i++) {
      const v = fn(i / SAMPLE_RATE);
      left[s0 + i] += v * panL;
      right[s0 + i] += v * panR;
    }
  };

  // Am - F - C - G (i-VI-III-VII) groove in A minor
  const prog = [
    { root: 45, chord: [57, 60, 64] },
    { root: 41, chord: [57, 60, 65] },
    { root: 48, chord: [55, 60, 64] },
    { root: 43, chord: [55, 59, 62] },
  ];
  const bassPattern = [0, -1, 0, 12, -1, 0, -1, 7, 0, -1, 12, -1, 0, 7, -1, 10];
  const leadPattern = [12, -1, 15, -1, 17, 15, -1, 12, -1, 10, 12, -1, -1, -1, 7, -1];

  const totalSix = Math.ceil(durationSeconds / six);
  for (let k = 0; k < totalSix; k++) {
    const t0 = k * six;
    const bar = Math.floor(k / 16);
    const step = k % 16;
    const ch = prog[bar % prog.length];
    const swing = step % 2 === 1 ? six * 0.08 : 0;
    const st = t0 + swing;

    // Kick on 1 & 3 + syncopated pickup
    if (step === 0 || step === 8 || step === 11) {
      add(st, 0.32, (t) => Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-t * 28)) * t) * Math.exp(-t * 9) * 0.55);
    }
    // Snare/clap on 2 & 4
    if (step === 4 || step === 12) {
      add(st, 0.22, (t) => {
        const nz = rng() * 2 - 1;
        return (nz * 0.5 + Math.sin(2 * Math.PI * 190 * t) * 0.3) * Math.exp(-t * 18) * 0.38;
      }, 0.95, 1);
    }
    // Hats every 8th, open hat on offbeats
    if (step % 2 === 0) {
      const open = step % 4 === 2;
      add(st, open ? 0.12 : 0.04, (t) => {
        const nz = rng() * 2 - 1;
        return nz * Math.exp(-t * (open ? 30 : 90)) * 0.09;
      }, 0.8, 1.05);
    }
    // Slap bass
    const b = bassPattern[step];
    if (b >= 0) {
      const f = midiToFreq(ch.root + b - 12 + 12);
      add(st, six * 0.9, (t) => {
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 7);
        return (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 30)) * env * 0.26;
      });
    }
    // Chord stabs on the "and" of 2 and 4
    if (step === 6 || step === 14) {
      for (const n of ch.chord) {
        const f = midiToFreq(n + 12);
        add(st, 0.16, (t) => {
          const env = Math.min(1, t / 0.003) * Math.exp(-t * 22);
          const saw = 2 * ((f * t) % 1) - 1;
          return (saw * 0.35 + Math.sin(2 * Math.PI * f * t) * 0.65) * env * 0.055;
        }, 1.05, 0.85);
      }
    }
    // Lead hook on alternating 2-bar phrases
    const l = leadPattern[step];
    if (l >= 0 && bar % 4 >= 2) {
      const f = midiToFreq(57 + l + 12);
      add(st, six * 1.6, (t) => {
        const env = Math.min(1, t / 0.006) * Math.exp(-t * 6.5);
        const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 6 * t);
        return (Math.sin(2 * Math.PI * f * vib * t) * 0.7 + Math.sin(6 * Math.PI * f * t) * 0.12) * env * 0.07;
      }, 0.85, 1.1);
    }
  }

  // Soft limiter + edge fades
  for (let i = 0; i < total; i++) {
    left[i] = Math.tanh(left[i] * 1.3) * 0.8;
    right[i] = Math.tanh(right[i] * 1.3) * 0.8;
  }
  const fade = Math.floor(0.05 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    left[i] *= g;
    right[i] *= g;
  }
  return { left, right };
}

/**
 * Calm documentary bed (~84 BPM): soft electric-piano chords with slow attack, warm sub bass,
 * gentle brushed hats. Light and curious, never competes with a deadpan narrator.
 */
function synthesizeDocumentaryMusic(durationSeconds: number): { left: Float32Array; right: Float32Array } {
  const total = Math.floor(durationSeconds * SAMPLE_RATE);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const rng = createSeededRng(8484);
  const beat = 60 / 84;
  const add = (start: number, len: number, fn: (t: number) => number, gl = 1, gr = 1) => {
    const s0 = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(len * SAMPLE_RATE);
    for (let i = 0; i < n && s0 + i < total; i++) {
      const v = fn(i / SAMPLE_RATE);
      left[s0 + i] += v * gl;
      right[s0 + i] += v * gr;
    }
  };
  // Fmaj7 - Em7 - Dm9 - Cmaj7
  const prog = [
    { bass: 41, notes: [57, 60, 64, 65] },
    { bass: 40, notes: [55, 59, 62, 64] },
    { bass: 38, notes: [57, 60, 64, 65] },
    { bass: 36, notes: [55, 59, 62, 64] },
  ];
  const bars = Math.ceil(durationSeconds / (beat * 4));
  for (let b = 0; b < bars; b++) {
    const t0 = b * beat * 4;
    const ch = prog[b % prog.length];
    for (const [k, n] of ch.notes.entries()) {
      const f = midiToFreq(n);
      add(t0 + k * 0.03, beat * 4.2, (t) => {
        const env = Math.min(1, t / 0.08) * Math.exp(-t * 0.7);
        const trem = 1 + 0.06 * Math.sin(2 * Math.PI * 4.5 * t);
        return (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(4 * Math.PI * f * t) * 0.12 * Math.exp(-t * 3)) * env * trem * 0.05;
      }, k % 2 ? 0.8 : 1.1, k % 2 ? 1.1 : 0.8);
    }
    const bf = midiToFreq(ch.bass);
    for (const off of [0, 2.5]) {
      add(t0 + off * beat, beat * 1.4, (t) => Math.sin(2 * Math.PI * bf * t) * Math.min(1, t / 0.02) * Math.exp(-t * 1.6) * 0.12);
    }
    for (let h = 0; h < 8; h++) {
      add(t0 + h * beat * 0.5 + (h % 2 ? beat * 0.06 : 0), 0.08, (t) => (rng() * 2 - 1) * Math.exp(-t * 60) * (h % 2 ? 0.02 : 0.035), 0.9, 1.1);
    }
    if (b % 2 === 1) {
      add(t0 + beat * 3, beat * 0.9, (t) => Math.sin(2 * Math.PI * midiToFreq(ch.notes[3] + 12) * t) * Math.min(1, t / 0.01) * Math.exp(-t * 3) * 0.03);
    }
  }
  const fade = Math.floor(0.08 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    left[i] *= i / fade;
    right[i] *= i / fade;
  }
  return { left, right };
}

function synthesizeMeadowAmbience(durationSeconds: number): { left: Float32Array; right: Float32Array } {
  const totalSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rng = createSeededRng(4242);

  // Soft low-passed breeze bed
  let prevL = 0;
  let prevR = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const swell = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.14 * t);
    const whiteL = (rng() * 2 - 1) * 0.09;
    const whiteR = (rng() * 2 - 1) * 0.09;
    prevL = prevL * 0.985 + whiteL * 0.015;
    prevR = prevR * 0.985 + whiteR * 0.015;
    left[i] = prevL * swell;
    right[i] = prevR * swell;
  }

  // Occasional gentle distant songbird chirps
  for (let chirpSec = 1.4; chirpSec < durationSeconds - 1; chirpSec += 3.8 + rng() * 3.2) {
    const baseFreq = 2600 + rng() * 900;
    const pan = rng() * 1.2 - 0.6;
    const gainL = Math.cos(((pan + 1) * Math.PI) / 4);
    const gainR = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let note = 0; note < 2; note++) {
      const startIdx = Math.floor((chirpSec + note * 0.14) * SAMPLE_RATE);
      const len = Math.floor(0.09 * SAMPLE_RATE);
      for (let i = 0; i < len && startIdx + i < totalSamples; i++) {
        const dt = i / SAMPLE_RATE;
        const env = Math.sin((Math.PI * i) / len) * 0.045;
        const freq = baseFreq + 420 * Math.sin(Math.PI * (i / len)) + note * 240;
        const s = Math.sin(2 * Math.PI * freq * dt) * env;
        left[startIdx + i] += s * gainL;
        right[startIdx + i] += s * gainR;
      }
    }
  }

  return { left, right };
}

function synthesizeSfx(id: SfxId): { left: Float32Array; right: Float32Array } {
  const rng = createSeededRng(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const durationMap: Record<SfxId, number> = {
    pop: 0.16,
    poof: 0.42,
    whoosh: 0.45,
    ding: 0.55,
    splash: 0.52,
    tick: 0.09,
    wood_snap: 0.18,
    water_flow: 1.4,
    sigh_down: 0.48,
    sparkle_chime: 0.72,
    ui_click: 0.12,
    impact_boom: 1.3,
    cash_register: 0.8,
    boing: 0.55,
    record_scratch: 0.5,
    riser: 1.6,
    crowd_cheer: 1.8,
    bite_crunch: 0.32,
    bird_squawk: 0.42,
  };
  const dur = durationMap[id];
  const n = Math.floor(dur * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);

  let lp = 0;
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const u = i / n;
    let s = 0;

    switch (id) {
      case 'pop': {
        const freq = 260 + 620 * Math.pow(u, 0.65);
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) * Math.exp(-t * 14);
        s = Math.sin(phase) * env * 0.75;
        break;
      }
      case 'poof': {
        const noise = rng() * 2 - 1;
        lp = lp * 0.88 + noise * 0.12;
        const env = Math.min(1, t / 0.015) * Math.exp(-t * 7.5);
        const thump = Math.sin(2 * Math.PI * (120 * Math.exp(-t * 6)) * t) * Math.exp(-t * 12) * 0.45;
        s = (lp * 1.8 * env + thump) * 0.75;
        break;
      }
      case 'whoosh': {
        const noise = rng() * 2 - 1;
        lp = lp * 0.92 + noise * 0.08;
        const env = Math.sin(Math.PI * u) * Math.sin(Math.PI * u);
        const sweep = Math.sin(2 * Math.PI * (180 + 480 * Math.sin(Math.PI * u)) * t) * 0.12;
        s = (lp * 1.9 + sweep) * env * 0.65;
        break;
      }
      case 'ding': {
        const env = Math.min(1, t / 0.005) * Math.exp(-t * 5.2);
        s =
          (Math.sin(2 * Math.PI * 1046.5 * t) * 0.65 +
            Math.sin(2 * Math.PI * 1567.98 * t) * 0.28 +
            Math.sin(2 * Math.PI * 2093 * t) * 0.12) *
          env *
          0.65;
        break;
      }
      case 'splash': {
        const noise = rng() * 2 - 1;
        lp = lp * 0.82 + noise * 0.18;
        const env = Math.min(1, t / 0.01) * Math.exp(-t * 5.8);
        const drop1 = Math.sin(2 * Math.PI * (420 + 380 * u) * t) * Math.exp(-t * 14) * 0.35;
        const drop2 = t > 0.09 ? Math.sin(2 * Math.PI * 680 * (t - 0.09)) * Math.exp(-(t - 0.09) * 18) * 0.28 : 0;
        s = (lp * 1.45 * env + drop1 + drop2) * 0.72;
        break;
      }
      case 'tick': {
        const env = Math.exp(-t * 48);
        s = (Math.sin(2 * Math.PI * 980 * t) + 0.5 * Math.sin(2 * Math.PI * 1850 * t)) * env * 0.55;
        break;
      }
      case 'wood_snap': {
        const noise = rng() * 2 - 1;
        const env = Math.exp(-t * 28);
        s = (Math.sin(2 * Math.PI * 440 * t) * 0.6 + Math.sin(2 * Math.PI * 1120 * t) * 0.4 + noise * 0.25) * env * 0.72;
        break;
      }
      case 'water_flow': {
        const noise = rng() * 2 - 1;
        lp = lp * 0.85 + noise * 0.15;
        const mod = 0.7 + 0.3 * Math.sin(2 * Math.PI * 4.5 * t);
        const fade = Math.min(1, t / 0.12) * Math.min(1, (dur - t) / 0.25);
        s = lp * mod * fade * 0.52;
        break;
      }
      case 'sigh_down': {
        const freq = 520 * Math.pow(0.45, u);
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const env = Math.min(1, t / 0.02) * Math.exp(-t * 4.5);
        s = (Math.sin(phase) * 0.7 + Math.sin(phase * 0.5) * 0.3) * env * 0.62;
        break;
      }
      case 'sparkle_chime': {
        const notes = [1046.5, 1318.5, 1568.0, 2093.0];
        for (let k = 0; k < notes.length; k++) {
          const dt = t - k * 0.075;
          if (dt > 0) {
            const env = Math.min(1, dt / 0.005) * Math.exp(-dt * 5.8);
            s += Math.sin(2 * Math.PI * notes[k] * dt) * env * 0.26;
          }
        }
        break;
      }
      case 'ui_click': {
        const env = Math.exp(-t * 55);
        s = (Math.sin(2 * Math.PI * 1650 * t) * 0.65 + Math.sin(2 * Math.PI * 2400 * t) * 0.35) * env * 0.7;
        break;
      }
      case 'impact_boom': {
        // Cinematic sub drop: pitched-down sine + noise crack + long tail
        const freq = 38 + 90 * Math.exp(-t * 9);
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const noise = rng() * 2 - 1;
        lp = lp * 0.9 + noise * 0.1;
        const crack = noise * Math.exp(-t * 60) * 0.6;
        const body = Math.sin(phase) * Math.min(1, t / 0.004) * Math.exp(-t * 2.6);
        s = (body * 0.95 + lp * Math.exp(-t * 5) * 0.9 + crack) * 0.85;
        break;
      }
      case 'cash_register': {
        // "Ka-" drawer clunk, then bright "-ching" bell
        const clunk = t < 0.08 ? (rng() * 2 - 1) * Math.exp(-t * 50) * 0.7 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 40) * 0.5 : 0;
        const bt = t - 0.09;
        const bell = bt > 0
          ? (Math.sin(2 * Math.PI * 2637 * bt) * 0.5 + Math.sin(2 * Math.PI * 3951 * bt) * 0.3 + Math.sin(2 * Math.PI * 5274 * bt) * 0.15) *
            Math.min(1, bt / 0.003) * Math.exp(-bt * 4.2)
          : 0;
        s = (clunk + bell) * 0.7;
        break;
      }
      case 'boing': {
        const freq = 180 + 260 * Math.exp(-t * 6) * (1 + 0.35 * Math.sin(2 * Math.PI * 14 * t));
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const env = Math.min(1, t / 0.006) * Math.exp(-t * 5.5);
        s = (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.15) * env * 0.75;
        break;
      }
      case 'record_scratch': {
        const noise = rng() * 2 - 1;
        const rate = Math.sin(Math.PI * u * 2.2);
        lp = lp * (0.6 + 0.35 * Math.abs(rate)) + noise * (0.4 - 0.35 * Math.abs(rate));
        const tone = Math.sin(2 * Math.PI * (300 + 900 * rate) * t) * 0.35;
        s = (lp * 1.6 + tone) * Math.sin(Math.PI * u) * 0.7;
        break;
      }
      case 'riser': {
        const noise = rng() * 2 - 1;
        const a = 0.6 + 0.38 * u;
        lp = lp * a + noise * (1 - a);
        const freq = 200 * Math.pow(8, u);
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const env = Math.pow(u, 1.6) * Math.min(1, (1 - u) / 0.03);
        s = (lp * 1.4 + Math.sin(phase) * 0.25) * env * 0.7;
        break;
      }
      case 'crowd_cheer': {
        // Dense band-limited noise swell + many tiny formant "yay" chirps
        const noise = rng() * 2 - 1;
        lp = lp * 0.7 + noise * 0.3;
        let voices = 0;
        for (let k = 0; k < 6; k++) {
          voices += Math.sin(2 * Math.PI * (420 + k * 137 + 60 * Math.sin(t * (3 + k))) * t) * 0.05;
        }
        const env = Math.min(1, t / 0.15) * Math.min(1, (dur - t) / 0.6);
        s = (lp * 0.9 + voices) * env * 0.6;
        break;
      }
      case 'bite_crunch': {
        const noise = rng() * 2 - 1;
        const grains = Math.sin(2 * Math.PI * 38 * t) > 0.2 ? 1 : 0.35;
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 11);
        s = noise * grains * env * 0.7;
        break;
      }
      case 'bird_squawk': {
        const freq = 1300 + 700 * Math.sin(Math.PI * u) - 500 * u;
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        const rasp = 1 + 0.6 * Math.sign(Math.sin(2 * Math.PI * 90 * t));
        const env = Math.sin(Math.PI * Math.min(1, u * 1.2));
        s = Math.sin(phase + Math.sin(phase * 0.5) * 2.2) * rasp * env * 0.38;
        break;
      }
    }

    left[i] = s;
    right[i] = s;
  }

  return { left, right };
}

export interface GeneratedAudioAssets {
  musicPublicPath: string;
  funkyMusicPublicPath: string;
  documentaryMusicPublicPath: string;
  ambiencePublicPath: string;
  sfxPaths: Record<SfxId, string>;
}

export function generateAllAudioAssets(publicRoot = path.join(process.cwd(), 'public')): GeneratedAudioAssets {
  const musicPath = path.join(publicRoot, 'music', 'pastoral_loop.wav');
  const ambiencePath = path.join(publicRoot, 'sound-effects', 'ambience_meadow.wav');

  const music = synthesizePastoralMusic(74);
  writeStereoWav(musicPath, music.left, music.right);

  const funky = synthesizeFunkyMusic(74);
  writeStereoWav(path.join(publicRoot, 'music', 'funky_groove.wav'), funky.left, funky.right);

  const doc = synthesizeDocumentaryMusic(74);
  writeStereoWav(path.join(publicRoot, 'music', 'documentary_bed.wav'), doc.left, doc.right);

  const ambience = synthesizeMeadowAmbience(74);
  writeStereoWav(ambiencePath, ambience.left, ambience.right);

  const sfxIds: SfxId[] = [
    'pop',
    'poof',
    'whoosh',
    'ding',
    'splash',
    'tick',
    'wood_snap',
    'water_flow',
    'sigh_down',
    'sparkle_chime',
    'ui_click',
    'impact_boom',
    'cash_register',
    'boing',
    'record_scratch',
    'riser',
    'crowd_cheer',
    'bite_crunch',
    'bird_squawk',
  ];

  const sfxPaths = {} as Record<SfxId, string>;
  for (const id of sfxIds) {
    const outPath = path.join(publicRoot, 'sound-effects', `${id}.wav`);
    const wav = synthesizeSfx(id);
    writeStereoWav(outPath, wav.left, wav.right);
    sfxPaths[id] = `sound-effects/${id}.wav`;
  }

  return {
    musicPublicPath: 'music/pastoral_loop.wav',
    funkyMusicPublicPath: 'music/funky_groove.wav',
    documentaryMusicPublicPath: 'music/documentary_bed.wav',
    ambiencePublicPath: 'sound-effects/ambience_meadow.wav',
    sfxPaths,
  };
}
