import { loadProductionPlan } from '../src/pipeline/production/productionStore.js';
import { renderProductionVideo } from '../src/pipeline/rendering/renderEngine.js';

function parseArgs(): { preview: boolean; onlySceneNumber?: number; captureStills: boolean; stillsOnly: boolean } {
  const args = process.argv.slice(2);
  let preview = false;
  let onlySceneNumber: number | undefined;
  let captureStills = false;
  let stillsOnly = false;

  for (const a of args) {
    if (a === '--preview') preview = true;
    if (a === '--stills') captureStills = true;
    if (a === '--stills-only') {
      captureStills = true;
      stillsOnly = true;
    }
    if (a.startsWith('--scene=')) {
      onlySceneNumber = Number.parseInt(a.split('=')[1], 10);
    }
  }
  return { preview, onlySceneNumber, captureStills, stillsOnly };
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const plan = loadProductionPlan();

  console.log(
    `[render-video] Rendering "${plan.concept.title}" (${opts.stillsOnly ? '1080x1920 QA stills only' : opts.preview ? '540x960 preview' : `${plan.width}x${plan.height} final`} @ ${plan.fps}fps${opts.onlySceneNumber ? `, Scene ${opts.onlySceneNumber} only` : ''})...`
  );

  const result = await renderProductionVideo({
    plan,
    preview: opts.preview,
    onlySceneNumber: opts.onlySceneNumber,
    captureStills: opts.captureStills,
    stillsOnly: opts.stillsOnly,
  });

  if (result.outputVideoPath) {
    console.log(`[render-video] Completed in ${(result.durationMs / 1000).toFixed(1)}s -> ${result.outputVideoPath}`);
  } else {
    console.log(`[render-video] Stills capture completed in ${(result.durationMs / 1000).toFixed(1)}s`);
  }
  if (result.stillPaths.length > 0) {
    console.log(`[render-video] Captured ${result.stillPaths.length} QA stills in output/previews/stills/`);
  }
}

main().catch((err) => {
  console.error('[render-video] Error:', err);
  process.exit(1);
});
