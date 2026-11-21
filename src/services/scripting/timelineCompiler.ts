import { VIDEO_SPEC } from '../../config/videoConfig.js';
import { secondsToFrames } from '../../utils/math.js';
import {
  CaptionChunk,
  CompiledScene,
  ProductionPlan,
  ProductionPlanSchema,
  SceneScript,
  StoryConcept,
  WordTimestamp,
} from './schema.js';
import { SceneVoiceArtifact } from '../elevenlabs/ElevenLabsService.js';

/**
 * Formats word timestamps into 1-3 lowercase word mobile captions matching REFERENCE_STYLE_BIBLE.md
 */
export function buildCaptionChunks(
  words: WordTimestamp[],
  fps: number,
  maxWordsPerChunk = 2,
  opts: { preserveCase?: boolean; holdGapFrames?: number } = {}
): CaptionChunk[] {
  const clean = (w: string) =>
    opts.preserveCase ? w.replace(/["]/g, '') : w.replace(/[.,!?;:"]/g, '').toLowerCase();
  const chunks: CaptionChunk[] = [];
  let i = 0;

  while (i < words.length) {
    const group: WordTimestamp[] = [];
    let charLen = 0;

    while (i < words.length && group.length < maxWordsPerChunk) {
      const candidate = words[i];
      const cleaned = candidate.word.replace(/[^\w'-]/g, '').toLowerCase();
      if (group.length > 0 && charLen + cleaned.length > 16) {
        break;
      }
      group.push(candidate);
      charLen += cleaned.length + 1;
      i++;

      // Break naturally at punctuation boundaries for crisp reading rhythm
      if (/[.!?,;:]$/.test(candidate.word)) {
        break;
      }
    }

    if (group.length === 0) continue;

    const text = group
      .map((w) => clean(w.word))
      .filter(Boolean)
      .join(' ');

    if (!text) continue;

    const startFrame = Math.max(0, Math.floor(group[0].startSeconds * fps));
    const endFrame = Math.max(
      startFrame + 3,
      Math.ceil(group[group.length - 1].endSeconds * fps)
    );

    const chunkWords = group
      .map((w) => ({
        text: w.word.replace(/[.,!?;:"]/g, '').toLowerCase(),
        startFrame: Math.max(0, Math.floor(w.startSeconds * fps)),
      }))
      .filter((w) => w.text.length > 0);

    chunks.push({ text, startFrame, endFrame, words: chunkWords });
  }

  // Prevent visual overlap between adjacent caption chunks
  for (let idx = 0; idx < chunks.length - 1; idx++) {
    if (chunks[idx].endFrame > chunks[idx + 1].startFrame) {
      chunks[idx].endFrame = Math.max(chunks[idx].startFrame + 2, chunks[idx + 1].startFrame);
    }
    // Storytime: hold a word on screen across short pauses instead of flickering off
    const hold = opts.holdGapFrames ?? 0;
    if (hold > 0 && chunks[idx + 1].startFrame - chunks[idx].endFrame <= hold) {
      chunks[idx].endFrame = chunks[idx + 1].startFrame;
    }
  }

  return chunks;
}

export function compileProductionPlan(params: {
  projectId: string;
  concept: StoryConcept;
  scenes: SceneScript[];
  voices: Map<string, SceneVoiceArtifact>;
  voiceId: string;
  musicFile: string;
  ambienceFile: string;
}): ProductionPlan {
  const fps = VIDEO_SPEC.fps;
  const compiledScenes: CompiledScene[] = [];
  let cursorFrame = 0;

  for (const scene of params.scenes) {
    const voice = params.voices.get(scene.id);
    const audioDurationSeconds = voice ? voice.durationSeconds : scene.targetDurationSeconds;
    const totalSceneSeconds = Math.max(
      1.6,
      audioDurationSeconds + scene.padAfterSeconds
    );
    const durationFrames = secondsToFrames(totalSceneSeconds, fps);
    const words = voice ? voice.words : [];
    const storytime = params.concept.captionStyle === 'storytime';
    const captions = storytime
      ? buildCaptionChunks(words, fps, 1, { preserveCase: true, holdGapFrames: 9 })
      : buildCaptionChunks(words, fps, 2);

    compiledScenes.push({
      scene,
      startFrame: cursorFrame,
      durationFrames,
      audioFile: voice ? voice.audioPublicPath : null,
      audioDurationSeconds,
      words,
      captions,
    });

    cursorFrame += durationFrames;
  }

  const plan: ProductionPlan = {
    projectId: params.projectId,
    createdAt: new Date().toISOString(),
    referenceStyleBible: 'REFERENCE_STYLE_BIBLE.md',
    concept: params.concept,
    fps,
    width: VIDEO_SPEC.width,
    height: VIDEO_SPEC.height,
    totalFrames: cursorFrame,
    totalDurationSeconds: Number((cursorFrame / fps).toFixed(3)),
    voiceId: params.voiceId,
    musicFile: params.musicFile,
    ambienceFile: params.ambienceFile,
    scenes: compiledScenes,
  };

  return ProductionPlanSchema.parse(plan);
}
