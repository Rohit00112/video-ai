import { attachMouthEnvelopes } from '../src/services/audio/mouthEnvelope.js';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { saveProductionPlan, saveScriptBundle } from '../src/pipeline/production/productionStore.js';
import { generateAllAudioAssets } from '../src/services/assets/AudioAssetGenerator.js';
import { ElevenLabsService, SceneVoiceArtifact } from '../src/services/elevenlabs/ElevenLabsService.js';
import { compileProductionPlan } from '../src/services/scripting/timelineCompiler.js';
import { renderProductionVideo } from '../src/pipeline/rendering/renderEngine.js';
import { runQualityChecks } from '../src/pipeline/rendering/qualityChecker.js';

function parseStoryId(): string | undefined {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--story='));
  return arg ? arg.split('=')[1] : undefined;
}

/**
 * End-to-end autonomous production runner (Phase 12) supporting any registered story via --story=<id>
 */
async function main(): Promise<void> {
  const story = resolveStory(parseStoryId());
  console.log(`=== AUTONOMOUS CINEMATIC SHORT PRODUCTION PIPELINE (${story.id}) ===`);

  // 1. Script
  saveScriptBundle(story.concept, story.scenes);
  console.log(`[1/6] Script generated: "${story.concept.title}" (${story.scenes.length} scenes)`);

  // 2. Audio assets (music, ambience, SFX)
  const audioAssets = generateAllAudioAssets();
  console.log(`[2/6] Synthesized pastoral music, ambience, and ${Object.keys(audioAssets.sfxPaths).length} SFX`);

  // 3. ElevenLabs Narration + Word Timestamps
  const eleven = new ElevenLabsService();
  const voiceId = await eleven.resolveStorytellerVoiceId();
  const voices = new Map<string, SceneVoiceArtifact>();
  for (const scene of story.scenes) {
    const art = await eleven.generateSceneVoice(scene, voiceId);
    voices.set(scene.id, art);
  }
  console.log(`[3/6] ElevenLabs narration ready for all ${story.scenes.length} scenes (voice: ${voiceId})`);

  // 4. Master Timeline Compilation
  const plan = compileProductionPlan({
    projectId: story.concept.id,
    concept: story.concept,
    scenes: story.scenes,
    voices,
    voiceId,
    musicFile:
      story.concept.musicStyle === 'funky'
        ? audioAssets.funkyMusicPublicPath
        : story.concept.musicStyle === 'documentary'
        ? audioAssets.documentaryMusicPublicPath
        : audioAssets.musicPublicPath,
    ambienceFile: audioAssets.ambiencePublicPath,
  });
  attachMouthEnvelopes(plan);
  saveProductionPlan(plan);
  console.log(`[4/6] Master timeline compiled: ${plan.totalFrames} frames (${plan.totalDurationSeconds}s)`);

  // 5. Render Final 1080x1920 MP4 + QA Stills
  const render = await renderProductionVideo({
    plan,
    preview: false,
    captureStills: true,
  });
  console.log(`[5/6] Rendered final MP4 (${(render.durationMs / 1000).toFixed(1)}s): ${render.outputVideoPath}`);

  // 6. Automated Quality Check
  const qa = runQualityChecks(plan, render.outputVideoPath);
  console.log(`[6/6] Quality Assurance: ${qa.overallPass ? 'PASS' : 'FAIL'}`);
  for (const check of qa.checks) {
    console.log(`  - [${check.passed ? 'PASS' : 'FAIL'}] ${check.name}: ${check.details}`);
  }
  if (!qa.overallPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[produce] Pipeline failed:', err);
  process.exit(1);
});
