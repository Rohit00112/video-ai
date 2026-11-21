import { generateAllAudioAssets } from '../src/services/assets/AudioAssetGenerator.js';

function main(): void {
  console.log('[generate-assets] Synthesizing deterministic 48 kHz pastoral music, meadow ambience, and synced cartoon SFX...');
  const assets = generateAllAudioAssets();
  console.log(`[generate-assets] Music: ${assets.musicPublicPath}`);
  console.log(`[generate-assets] Ambience: ${assets.ambiencePublicPath}`);
  console.log(`[generate-assets] Generated ${Object.keys(assets.sfxPaths).length} SFX files in public/sound-effects/`);
}

main();
