import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { saveScriptBundle } from '../src/pipeline/production/productionStore.js';

function parseStoryId(): string | undefined {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--story='));
  return arg ? arg.split('=')[1] : undefined;
}

function main(): void {
  const story = resolveStory(parseStoryId());
  const outPath = saveScriptBundle(story.concept, story.scenes);
  const totalWords = story.scenes.reduce(
    (sum, s) => sum + s.narration.trim().split(/\s+/).length,
    0
  );
  console.log(
    `[generate-script] Saved story "${story.concept.title}" (${story.id}) — ${story.scenes.length} scenes (${totalWords} words)`
  );
  console.log(`[generate-script] Output: ${outPath}`);
}

main();
