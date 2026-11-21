import { ProductionPlan } from '../../services/scripting/schema.js';

/**
 * REFERENCE_STYLE_BIBLE_V3 pacing rules, checked on the compiled plan (real narration timings).
 * Data behind the rules: Tiny World Stories lost 35–40 points of retention between 5 s and 10 s
 * (the "setup" scene) and most viewers before the end of 60 s+ videos.
 */
export const V3_LIMITS = {
  maxTotalSeconds: 45,
  maxSceneSeconds: 4.0,
  maxEventGapSeconds: 3.0,
  payoffBySeconds: 6.0,
  maxHookTitleChars: 16,
} as const;
const V3_DEFAULT = V3_LIMITS;

export interface StoryLintIssue {
  rule: string;
  detail: string;
}

/** Seconds into the scene at which something visibly happens (besides the cut itself). */
function sceneEventTimes(s: ProductionPlan['scenes'][number], fps: number): number[] {
  const dur = s.durationFrames / fps;
  const sc = s.scene;
  const ratios: number[] = [];
  if (sc.hud?.emojiBurst) ratios.push(sc.hud.emojiBurst.atRatio);
  if (sc.experimentOverlay?.stamp) ratios.push(sc.experimentOverlay.stamp.atRatio);
  for (const b of sc.characters) {
    for (const r of [b.expressionSwitchRatio, b.poseSwitchRatio, b.outfitSwitchRatio]) {
      if (r !== undefined) ratios.push(r);
    }
  }
  for (const p of sc.smokePoofs) ratios.push(p.triggerAtRatio);
  for (const t of sc.thoughtBubbles) ratios.push(t.startAtRatio);
  const times = ratios.map((r) => r * dur);
  // A running counter/gauge is a continuous visual change for the whole scene
  if (sc.experimentOverlay?.gauge) {
    for (let t = 0; t < dur; t += 1) times.push(t);
  }
  return times;
}

/** Storytime (reference) videos are calmer and longer: the reference Short runs 63 s with no title card */
export const STORYTIME_LIMITS = {
  maxTotalSeconds: 65,
  maxSceneSeconds: 5.0,
  maxEventGapSeconds: 3.5,
  payoffBySeconds: 7.0,
  maxHookTitleChars: 16,
} as const;

export function lintStoryV3(plan: ProductionPlan): StoryLintIssue[] {
  const issues: StoryLintIssue[] = [];
  const fps = plan.fps;
  const storytime = plan.concept.visualStyle === 'storytime';
  const V3_LIMITS = storytime ? STORYTIME_LIMITS : V3_DEFAULT;

  if (plan.totalDurationSeconds > V3_LIMITS.maxTotalSeconds) {
    issues.push({ rule: 'total-length', detail: `${plan.totalDurationSeconds.toFixed(1)}s > ${V3_LIMITS.maxTotalSeconds}s` });
  }

  const first = plan.scenes[0]?.scene;
  const title = first?.hud?.topTitle;
  if (!title) {
    if (!storytime) issues.push({ rule: 'hook-title', detail: 'scene 1 has no hud.topTitle hook card' });
  } else if ([...title].length > V3_LIMITS.maxHookTitleChars) {
    issues.push({ rule: 'hook-title', detail: `"${title}" is ${[...title].length} chars (max ${V3_LIMITS.maxHookTitleChars})` });
  }

  // Payoff / open loop must have started by 6 s: i.e. scene 2 begins before then
  const second = plan.scenes[1];
  if (second && second.startFrame / fps > V3_LIMITS.payoffBySeconds) {
    issues.push({ rule: 'payoff-by-6s', detail: `scene 2 starts at ${(second.startFrame / fps).toFixed(1)}s (hook too long)` });
  }

  let lastEvent = 0;
  for (const s of plan.scenes) {
    const start = s.startFrame / fps;
    const dur = s.durationFrames / fps;
    if (dur > V3_LIMITS.maxSceneSeconds + 0.35) {
      issues.push({ rule: 'scene-length', detail: `scene ${s.scene.sceneNumber} (${s.scene.id}) is ${dur.toFixed(1)}s` });
    }
    const events = [0, ...sceneEventTimes(s, fps)].map((t) => start + t).sort((a, b) => a - b);
    for (const t of events) {
      if (t - lastEvent > V3_LIMITS.maxEventGapSeconds + 0.35) {
        issues.push({
          rule: 'visual-event-gap',
          detail: `${(t - lastEvent).toFixed(1)}s with no visual change before ${t.toFixed(1)}s (scene ${s.scene.sceneNumber})`,
        });
      }
      lastEvent = Math.max(lastEvent, t);
    }
  }
  const end = plan.totalDurationSeconds;
  if (end - lastEvent > V3_LIMITS.maxEventGapSeconds + 0.35) {
    issues.push({ rule: 'visual-event-gap', detail: `${(end - lastEvent).toFixed(1)}s with no visual change at the end` });
  }

  return issues;
}
