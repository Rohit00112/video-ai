import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';

/**
 * Converts hand-made painted scenes into render-ready 1080x1920 JPGs.
 *   npx tsx scripts/ingest-illustrations.ts --story=<id> [--placeholder]
 * Reads illustrations-inbox/<id>/ (files sorted by name: 01.png, 02.jpg, ...), cover-crops each to 9:16,
 * and writes public/illustrations/<id>/scene-NN.jpg. --placeholder makes grey test cards instead.
 */
const args = process.argv.slice(2);
const storyId = args.find((a) => a.startsWith('--story='))?.split('=')[1];
const placeholder = args.includes('--placeholder');
const story = resolveStory(storyId);
const scenes = story.scenes.filter((s) => s.illustration);

const inbox = path.join(process.cwd(), 'illustrations-inbox', story.id);
const outDir = path.join(process.cwd(), 'public', 'illustrations', story.id);
fs.mkdirSync(outDir, { recursive: true });

const vf = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';

if (placeholder) {
  for (const s of scenes) {
    const nn = String(s.sceneNumber).padStart(2, '0');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x6B4A33:s=1080x1920`, '-frames:v', '1', path.join(outDir, `scene-${nn}.jpg`)]);
  }
  console.log(`[ingest-illustrations] Wrote ${scenes.length} placeholder cards to ${outDir}`);
  process.exit(0);
}

const files = fs.existsSync(inbox)
  ? fs.readdirSync(inbox).filter((f) => /\.(png|jpe?g|webp|heic)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  : [];
if (files.length < scenes.length) {
  console.error(`[ingest-illustrations] Found ${files.length} images in ${inbox}, need ${scenes.length} (one per scene).`);
  process.exit(1);
}

scenes.forEach((s, i) => {
  const nn = String(s.sceneNumber).padStart(2, '0');
  const src = path.join(inbox, files[i]);
  const dst = path.join(outDir, `scene-${nn}.jpg`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', vf, '-q:v', '2', '-frames:v', '1', dst]);
  console.log(`  ${files[i]} -> scene-${nn}.jpg`);
});
console.log(`[ingest-illustrations] ${scenes.length} scenes ready in ${outDir}`);
