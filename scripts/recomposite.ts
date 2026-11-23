import path from 'node:path';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { saveProductionPlan, saveScriptBundle } from '../src/pipeline/production/productionStore.js';
import { generateAllAudioAssets } from '../src/services/assets/AudioAssetGenerator.js';
import { ElevenLabsService, SceneVoiceArtifact } from '../src/services/elevenlabs/ElevenLabsService.js';
import { compileProductionPlan } from '../src/services/scripting/timelineCompiler.js';
import { renderProductionVideo } from '../src/pipeline/rendering/renderEngine.js';
import { runQualityChecks } from '../src/pipeline/rendering/qualityChecker.js';

async function main(): Promise<void> {
  const story = resolveStory('everyone-invisible-v1');
  saveScriptBundle(story.concept, story.scenes);
  const audioAssets = generateAllAudioAssets();
  const eleven = new ElevenLabsService();
  const voiceId = await eleven.resolveStorytellerVoiceId();
  const voices = new Map<string, SceneVoiceArtifact>();

  for (const scene of story.scenes) {
    voices.set(scene.id, await eleven.generateSceneVoice(scene, voiceId, { requireChars: true }));
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

  for (const cs of plan.scenes) {
    cs.scene.footage = `footage/${story.concept.id}/${cs.scene.id}.mp4`;
  }

  saveProductionPlan(plan);
  console.log(`[plan] ${plan.scenes.length} scenes, ${plan.totalFrames} frames (${plan.totalDurationSeconds}s)`);

  const render = await renderProductionVideo({ plan, preview: false, captureStills: true });
  console.log(`[render] ${render.outputVideoPath}`);

  const qa = runQualityChecks(plan, render.outputVideoPath);
  for (const c of qa.checks) console.log(`  - [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
