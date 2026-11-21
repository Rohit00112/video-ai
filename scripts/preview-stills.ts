/**
 * Silent visual QA: renders one still per scene for a story using estimated word timings
 * (no ElevenLabs calls). Usage: npx tsx scripts/preview-stills.ts --story=pizza-money-v1 [--out=dir] [--at=0.6]
 */
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { buildCaptionChunks } from '../src/services/scripting/timelineCompiler.js';
import { ProductionPlan } from '../src/services/scripting/schema.js';
import { VIDEO_SPEC } from '../src/config/videoConfig.js';
import { secondsToFrames } from '../src/utils/math.js';

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

async function main() {
  const story = resolveStory(arg('story'));
  const outDir = path.resolve(arg('out') ?? path.join('output', 'previews', 'silent-stills'));
  const at = Number(arg('at') ?? '0.6');
  const only = arg('scenes')?.split(',').map(Number);
  fs.mkdirSync(outDir, { recursive: true });
  const fps = VIDEO_SPEC.fps;
  let cursor = 0;
  const scenes = story.scenes.map((scene) => {
    const durationFrames = secondsToFrames(scene.targetDurationSeconds + scene.padAfterSeconds, fps);
    const tokens = scene.narration.split(/\s+/).filter(Boolean);
    const slot = scene.targetDurationSeconds / Math.max(1, tokens.length);
    const words = tokens.map((word, i) => ({ word, startSeconds: i * slot, endSeconds: (i + 1) * slot }));
    const compiled = { scene, startFrame: cursor, durationFrames, audioFile: null, audioDurationSeconds: scene.targetDurationSeconds, words, captions: buildCaptionChunks(words, fps, 2) };
    cursor += durationFrames;
    return compiled;
  });
  const plan: ProductionPlan = {
    projectId: story.id, createdAt: new Date().toISOString(), referenceStyleBible: 'REFERENCE_STYLE_BIBLE_V2.md',
    concept: story.concept, fps, width: VIDEO_SPEC.width, height: VIDEO_SPEC.height, totalFrames: cursor,
    totalDurationSeconds: cursor / fps, voiceId: 'none', musicFile: 'music/pastoral_loop.wav', ambienceFile: 'sound-effects/ambience_meadow.wav', scenes,
  };
  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), 'src', 'remotion', 'index.ts'),
    publicDir: path.join(process.cwd(), 'public'),
    webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.jsx': ['.tsx', '.jsx'] } } }),
  });
  const inputProps = { plan };
  const chromiumOptions = { gl: 'angle' as const };
  const composition = await selectComposition({ serveUrl, id: 'MainVideo', inputProps, chromiumOptions });
  for (const s of scenes) {
    if (only && !only.includes(s.scene.sceneNumber)) continue;
    const frame = s.startFrame + Math.floor(s.durationFrames * at);
    const out = path.join(outDir, `scene-${String(s.scene.sceneNumber).padStart(2, '0')}.png`);
    const t0 = Date.now();
    await renderStill({ composition, serveUrl, output: out, frame, inputProps, chromiumOptions,
      onBrowserLog: (l) => { if (l.type === 'error') console.error('[browser]', l.text); } });
    console.log(`scene ${s.scene.sceneNumber} -> ${out} (${Date.now() - t0}ms)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
