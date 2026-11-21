import { VIDEO_SPEC } from './videoConfig.js';
import { ProductionPlan } from '../services/scripting/schema.js';
import { WATER_SYSTEMS_CONCEPT, WATER_SYSTEMS_SCENES } from '../pipeline/story/waterSystemsStory.js';
import { buildCaptionChunks } from '../services/scripting/timelineCompiler.js';
import { secondsToFrames } from '../utils/math.js';

/**
 * Fallback deterministic production plan used by Remotion Studio if no generated
 * production-plan.json is passed via inputProps.
 */
export function buildDefaultProductionPlan(): ProductionPlan {
  const fps = VIDEO_SPEC.fps;
  let cursor = 0;

  const scenes = WATER_SYSTEMS_SCENES.map((scene) => {
    const durationFrames = secondsToFrames(scene.targetDurationSeconds + scene.padAfterSeconds, fps);
    const words = scene.narration.split(/\s+/).filter(Boolean).map((word, idx, arr) => {
      const slot = scene.targetDurationSeconds / Math.max(1, arr.length);
      return {
        word,
        startSeconds: idx * slot,
        endSeconds: (idx + 1) * slot,
      };
    });
    const compiled = {
      scene,
      startFrame: cursor,
      durationFrames,
      audioFile: null,
      audioDurationSeconds: scene.targetDurationSeconds,
      words,
      captions: buildCaptionChunks(words, fps, 2),
    };
    cursor += durationFrames;
    return compiled;
  });

  return {
    projectId: WATER_SYSTEMS_CONCEPT.id,
    createdAt: '2026-01-01T00:00:00.000Z',
    referenceStyleBible: 'REFERENCE_STYLE_BIBLE.md',
    concept: WATER_SYSTEMS_CONCEPT,
    fps,
    width: VIDEO_SPEC.width,
    height: VIDEO_SPEC.height,
    totalFrames: cursor,
    totalDurationSeconds: Number((cursor / fps).toFixed(3)),
    voiceId: 'default',
    musicFile: 'music/pastoral_loop.wav',
    ambienceFile: 'sound-effects/ambience_meadow.wav',
    scenes,
  };
}
