import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { attachMouthEnvelopes } from '../src/services/audio/mouthEnvelope.js';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { saveProductionPlan, saveScriptBundle } from '../src/pipeline/production/productionStore.js';
import { generateAllAudioAssets } from '../src/services/assets/AudioAssetGenerator.js';
import { ElevenLabsService, SceneVoiceArtifact } from '../src/services/elevenlabs/ElevenLabsService.js';
import { compileProductionPlan } from '../src/services/scripting/timelineCompiler.js';
import { renderProductionVideo } from '../src/pipeline/rendering/renderEngine.js';
import { runQualityChecks } from '../src/pipeline/rendering/qualityChecker.js';
import { CompiledScene } from '../src/services/scripting/schema.js';
import { computeVisemeTrack, emphasisFrames } from '../src/services/audio/visemes.js';

/**
 * Blender-cast production: narration → lip-sync envelopes → one Blender shot per scene → Remotion
 * (captions, counter, music, SFX) on top of the rendered footage.
 *
 *   npx tsx scripts/produce-blender.ts --story=freeze-time-v1 [--stills] [--only=ft-01-hook] [--skip-existing]
 *   --stills: render 3 review stills per scene and stop (no MP4)
 */
const BLENDER = process.env.BLENDER_BIN ?? '/Applications/Blender.app/Contents/MacOS/Blender';
const arg = (k: string) => process.argv.slice(2).find((a) => a === `--${k}` || a.startsWith(`--${k}=`));
const argVal = (k: string) => arg(k)?.split('=')[1];

function shotSpec(storyId: string, cs: CompiledScene, fps: number) {
  const shot = cs.scene.shot!;
  const n = cs.durationFrames;
  const fr = (r: number) => Math.round(Math.max(0, Math.min(1, r)) * (n - 1));
  return {
    frames: n,
    fps,
    set: shot.set,
    camera: shot.camera,
    out: `public/footage/${storyId}/${cs.scene.id}.mp4`,
    chars: shot.chars.map((c: any) => ({
      ...c,
      track: (c.track ?? []).map((t: any) => ({ ...t, start: fr(t.at ?? 0) })),
      path: c.path?.map((p: number[]) => [fr(p[0]), p[1], p[2], p[3]]),
      blinkUntil: c.blinkUntil !== undefined ? fr(c.blinkUntil) : undefined,
      blinkFrom: c.blinkFrom !== undefined ? fr(c.blinkFrom) : undefined,
      visemes: c.speaker ? cs.visemes : undefined,
      emph: c.speaker ? cs.emphasisFrames : undefined,
    })),
  };
}

async function main(): Promise<void> {
  const story = resolveStory(argVal('story'));
  const stills = Boolean(arg('stills'));
  const only = argVal('only');
  saveScriptBundle(story.concept, story.scenes);
  const audioAssets = generateAllAudioAssets();
  const eleven = new ElevenLabsService();
  const voiceId = await eleven.resolveStorytellerVoiceId();
  const voices = new Map<string, SceneVoiceArtifact>();
  for (const scene of story.scenes) {
    try {
      voices.set(scene.id, await eleven.generateSceneVoice(scene, voiceId, { requireChars: true }));
    } catch (err) {
      if (!stills) throw err;
      // Review stills only: fake timing from the target duration so framing can be checked without audio
      console.warn(`[voice] ${scene.id}: ${(err as Error).message.slice(0, 80)}… using estimated timing`);
      const words = scene.narration.split(/\s+/);
      const per = scene.targetDurationSeconds / words.length;
      voices.set(scene.id, {
        sceneId: scene.id, sceneNumber: scene.sceneNumber, audioPublicPath: '', audioAbsolutePath: '',
        durationSeconds: scene.targetDurationSeconds, voiceId, contentHash: 'stub', cached: false,
        words: words.map((w, i) => ({ word: w, startSeconds: i * per, endSeconds: (i + 1) * per })) as any,
      });
    }
  }
  const plan = compileProductionPlan({
    projectId: story.concept.id,
    concept: story.concept,
    scenes: story.scenes,
    voices,
    voiceId,
    musicFile: story.concept.musicStyle === 'funky' ? audioAssets.funkyMusicPublicPath : audioAssets.musicPublicPath,
    ambienceFile: audioAssets.ambiencePublicPath,
  });
  attachMouthEnvelopes(plan);
  for (const cs of plan.scenes) {
    const v = voices.get(cs.scene.id);
    if (v?.chars?.length) cs.visemes = computeVisemeTrack(v.chars, plan.fps, cs.durationFrames, cs.mouthEnvelope);
    if (v) cs.emphasisFrames = emphasisFrames(v.words, cs.scene.hud?.captionHighlights, plan.fps).slice(0, 2);
  }
  console.log(`[plan] ${plan.scenes.length} scenes, ${plan.totalFrames} frames (${plan.totalDurationSeconds}s)`);

  const specDir = path.join(process.cwd(), 'output', 'blender-specs', story.concept.id);
  fs.mkdirSync(specDir, { recursive: true });
  for (const cs of plan.scenes) {
    if (!cs.scene.shot) throw new Error(`Scene ${cs.scene.id} has no shot`);
    const spec = shotSpec(story.concept.id, cs, plan.fps);
    cs.scene.footage = spec.out.replace(/^public\//, '');
    if (only && cs.scene.id !== only) continue;
    const specFile = path.join(specDir, `${cs.scene.id}.json`);
    fs.writeFileSync(specFile, JSON.stringify(spec));
    const outAbs = path.join(process.cwd(), spec.out);
    if (!stills && arg('skip-existing') && fs.existsSync(outAbs)) {
      console.log(`[shot] ${cs.scene.id}: exists, skipped`);
      continue;
    }
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    const t0 = Date.now();
    const extra = stills ? ['--stills', [1, Math.round(spec.frames * 0.5), spec.frames - 1].join(',')] : [];
    execFileSync(BLENDER, ['-b', '--factory-startup', '--python', 'blender/scripts/render_scene.py', '--', specFile, ...extra], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(`[shot] ${cs.scene.id}: ${spec.frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (stills || only) return;

  saveProductionPlan(plan);
  const render = await renderProductionVideo({ plan, preview: false, captureStills: true });
  console.log(`[render] ${render.outputVideoPath}`);
  const qa = runQualityChecks(plan, render.outputVideoPath);
  for (const c of qa.checks) console.log(`  - [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
}

main().catch((err) => {
  console.error('[produce-blender] failed:', err);
  process.exit(1);
});
