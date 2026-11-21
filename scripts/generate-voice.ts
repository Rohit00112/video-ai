import { attachMouthEnvelopes } from '../src/services/audio/mouthEnvelope.js';
import { ElevenLabsService, SceneVoiceArtifact } from '../src/services/elevenlabs/ElevenLabsService.js';
import { compileProductionPlan } from '../src/services/scripting/timelineCompiler.js';
import { loadScriptBundle, saveProductionPlan } from '../src/pipeline/production/productionStore.js';

function parseArgs(): { onlyScene?: number; force: boolean } {
  const args = process.argv.slice(2);
  let onlyScene: number | undefined;
  let force = false;
  for (const a of args) {
    if (a.startsWith('--scene=')) {
      onlyScene = Number.parseInt(a.split('=')[1], 10);
    } else if (a === '--force') {
      force = true;
    }
  }
  return { onlyScene, force };
}

async function main(): Promise<void> {
  const { onlyScene, force } = parseArgs();
  const bundle = loadScriptBundle();
  const eleven = new ElevenLabsService();

  if (!eleven.isConfigured()) {
    throw new Error('ELEVENLABS_API_KEY is not configured in .env.local');
  }

  const voiceId = await eleven.resolveStorytellerVoiceId();
  console.log(`[generate-voice] Using ElevenLabs voice ID: ${voiceId}`);

  const voiceMap = new Map<string, SceneVoiceArtifact>();
  for (const scene of bundle.scenes) {
    const shouldForce = force || (onlyScene !== undefined && scene.sceneNumber === onlyScene);
    const artifact = await eleven.generateSceneVoice(scene, voiceId, { force: shouldForce });
    voiceMap.set(scene.id, artifact);
    console.log(
      `  Scene ${String(scene.sceneNumber).padStart(2, '0')} (${scene.id}): ${artifact.durationSeconds.toFixed(2)}s, ${artifact.words.length} aligned words [${artifact.cached ? 'CACHED' : 'GENERATED'}]`
    );
  }

  const plan = compileProductionPlan({
    projectId: bundle.concept.id,
    concept: bundle.concept,
    scenes: bundle.scenes,
    voices: voiceMap,
    voiceId,
    musicFile:
      bundle.concept.musicStyle === 'funky'
        ? 'music/funky_groove.wav'
        : bundle.concept.musicStyle === 'documentary'
        ? 'music/documentary_bed.wav'
        : 'music/pastoral_loop.wav',
    ambienceFile: 'sound-effects/ambience_meadow.wav',
  });

  attachMouthEnvelopes(plan);
  const planPath = saveProductionPlan(plan);
  console.log(`[generate-voice] Compiled master timeline: ${plan.totalFrames} frames (${plan.totalDurationSeconds}s) -> ${planPath}`);
}

main().catch((err) => {
  console.error('[generate-voice] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
