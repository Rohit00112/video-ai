import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ProductionPlan } from '../scripting/schema.js';

/**
 * Node-only (uses ffmpeg). Computes a per-frame narration loudness envelope (0..1) for each scene
 * so the speaking character's mouth follows the real voice instead of a fixed flap timer.
 */
export function computeMouthEnvelope(audioFile: string, fps: number, frames: number): number[] {
  const sampleRate = 16000;
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', audioFile, '-ac', '1', '-ar', String(sampleRate), '-f', 's16le', '-'],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const perFrame = sampleRate / fps;

  const rms: number[] = [];
  for (let f = 0; f < frames; f++) {
    const start = Math.floor(f * perFrame);
    const end = Math.min(samples.length, Math.floor((f + 1) * perFrame));
    let sum = 0;
    for (let i = start; i < end; i++) sum += (samples[i] / 32768) ** 2;
    rms.push(end > start ? Math.sqrt(sum / (end - start)) : 0);
  }

  // Normalise against the 90th percentile of voiced frames so quiet and loud clips animate alike
  const voiced = rms.filter((v) => v > 0.01).sort((a, b) => a - b);
  const ref = voiced.length ? voiced[Math.floor(voiced.length * 0.9)] : 1;
  const norm = rms.map((v) => Math.min(1, v / Math.max(1e-4, ref)));

  // Light smoothing (attack fast, release slower) so the mouth doesn't jitter frame to frame
  const out: number[] = [];
  let prev = 0;
  for (const v of norm) {
    const next = v > prev ? prev + (v - prev) * 0.75 : prev + (v - prev) * 0.45;
    out.push(Number(next.toFixed(3)));
    prev = next;
  }
  return out;
}

/** Fill `mouthEnvelope` on every scene that has narration audio under public/ */
export function attachMouthEnvelopes(plan: ProductionPlan, publicDir = path.join(process.cwd(), 'public')): ProductionPlan {
  for (const s of plan.scenes) {
    if (!s.audioFile) continue;
    const file = path.join(publicDir, s.audioFile);
    if (!fs.existsSync(file)) continue;
    s.mouthEnvelope = computeMouthEnvelope(file, plan.fps, s.durationFrames);
  }
  return plan;
}
