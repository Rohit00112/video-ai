import fs from 'node:fs';
import path from 'node:path';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';

/**
 * Writes a copy-paste prompt sheet for generating a story's painted scenes by hand (e.g. in the free Gemini app).
 *   npx tsx scripts/illustration-prompts.ts --story=<id>
 * Output: output/reports/illustration-prompts-<id>.md and an empty inbox folder illustrations-inbox/<id>/
 */
function parseStoryId(): string | undefined {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--story='));
  return arg ? arg.split('=')[1] : undefined;
}

const story = resolveStory(parseStoryId());
const style = story.concept.illustrationStyle ?? '';
const lines: string[] = [];

lines.push(`# Painting prompts: ${story.concept.title}`);
lines.push('');
lines.push('How to use (Gemini app, free):');
lines.push('1. Open one new chat in gemini.google.com and keep using that same chat for every image, so the characters stay consistent.');
lines.push('2. Paste the **Character sheet** prompt first. If you like the result, say "Use exactly these character designs for every image below."');
lines.push('3. Paste each scene prompt in order. If a picture comes out landscape, reply "make it vertical 9:16".');
lines.push(`4. Download each picture and save it as \`01.png\`, \`02.png\`, … in \`illustrations-inbox/${story.id}/\` (any image format is fine).`);
lines.push(`5. Tell Claude they're ready. Claude runs \`npx tsx scripts/ingest-illustrations.ts --story=${story.id}\`, then places the lip-sync mouths and renders.`);
lines.push('');
lines.push('## Character sheet');
lines.push('');
lines.push('```');
lines.push(`${style}\n\nCreate a character reference sheet on a plain warm-beige background showing every character described above standing side by side, full body, front view, each smiling with a small closed mouth. No text, no labels.`);
lines.push('```');
lines.push('');

for (const s of story.scenes) {
  if (!s.illustration) continue;
  const nn = String(s.sceneNumber).padStart(2, '0');
  lines.push(`## Scene ${nn}: ${s.title}`);
  lines.push('');
  lines.push(`Narration: "${s.narration}"`);
  lines.push('');
  lines.push('```');
  const bgOnly = (s.puppets?.length ?? 0) > 0;
  lines.push(`Scene ${nn}. Vertical 9:16 image. ${s.illustration.prompt}${bgOnly ? ' EMPTY BACKGROUND ONLY: no people, no characters, no animals. Eye-level camera with open ground or floor across the lower third of the image, where characters will be added later.' : s.speaker ? ' The speaking character\'s mouth is small and closed.' : ''} ${bgOnly ? 'Same art style as the character sheet,' : 'Same character designs as the character sheet,'} but as a full cinematic scene: rich warm lighting with soft glow, a detailed environment with gentle depth of field (background softly blurred), painterly shading. No text, no captions, no speech bubbles, no watermark.`);
  lines.push('```');
  lines.push('');
}

const out = path.join(process.cwd(), 'output', 'reports', `illustration-prompts-${story.id}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
fs.mkdirSync(path.join(process.cwd(), 'illustrations-inbox', story.id), { recursive: true });
console.log(`[illustration-prompts] ${story.scenes.filter((s) => s.illustration).length} scene prompts -> ${out}`);
console.log(`[illustration-prompts] Save images to illustrations-inbox/${story.id}/ as 01.png, 02.png, ...`);
