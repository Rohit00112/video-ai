export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (Math.abs(b - a) < 1e-8) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

export function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeInOutQuint(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 16 * c * c * c * c * c : 1 - Math.pow(-2 * c + 2, 5) / 2;
}

export function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}

export function easeOutBack(t: number, overshoot = 1.70158): number {
  const c = clamp(t, 0, 1);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + overshoot * Math.pow(c - 1, 2);
}

/**
 * Deterministic underdamped spring curve matching cartoon pop-in feel (0 -> ~1.08 -> 1.0)
 */
export function springPop(
  elapsedSeconds: number,
  stiffness = 220,
  damping = 16
): number {
  if (elapsedSeconds <= 0) return 0;
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  if (zeta >= 1) {
    return 1 - Math.exp(-omega * elapsedSeconds) * (1 + omega * elapsedSeconds);
  }
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * elapsedSeconds);
  const value =
    1 -
    decay *
      (Math.cos(omegaD * elapsedSeconds) +
        (zeta * omega / omegaD) * Math.sin(omegaD * elapsedSeconds));
  return Math.max(0, value);
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}

/**
 * Deterministic Mulberry32 PRNG — guarantees identical geometry, flower scatter,
 * cloud placement, and particles on every render pass.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
