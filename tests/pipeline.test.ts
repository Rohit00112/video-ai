import test from 'node:test';
import assert from 'node:assert/strict';
import { WATER_SYSTEMS_CONCEPT, WATER_SYSTEMS_SCENES } from '../src/pipeline/story/waterSystemsStory.js';
import { BAMBOO_ROOTS_CONCEPT, BAMBOO_ROOTS_SCENES } from '../src/pipeline/story/bambooRootsStory.js';
import { HARBOR_MAP_CONCEPT, HARBOR_MAP_SCENES } from '../src/pipeline/story/harborMapStory.js';
import { ZERO_RULES_TOWN_CONCEPT, ZERO_RULES_TOWN_SCENES } from '../src/pipeline/story/zeroRulesTownStory.js';
import { FREE_MONEY_ISLAND_CONCEPT, FREE_MONEY_ISLAND_SCENES } from '../src/pipeline/story/freeMoneyIslandStory.js';
import { MARS_RESUME_CONCEPT, MARS_RESUME_SCENES } from '../src/pipeline/story/marsResumeStory.js';
import { DINO_TIME_CONCEPT, DINO_TIME_SCENES } from '../src/pipeline/story/dinoTimeStory.js';
import { GRAVITY_SWITCH_CONCEPT, GRAVITY_SWITCH_SCENES } from '../src/pipeline/story/gravitySwitchStory.js';
import { DREAM_TAX_CONCEPT, DREAM_TAX_SCENES } from '../src/pipeline/story/dreamTaxStory.js';
import { PIZZA_MONEY_CONCEPT, PIZZA_MONEY_SCENES } from '../src/pipeline/story/pizzaMoneyStory.js';
import { resolveStory } from '../src/pipeline/story/storyRegistry.js';
import { SceneScriptSchema, StoryConceptSchema } from '../src/services/scripting/schema.js';
import { buildCaptionChunks } from '../src/services/scripting/timelineCompiler.js';
import { ElevenLabsService } from '../src/services/elevenlabs/ElevenLabsService.js';
import { TimelineManager } from '../src/three/core/TimelineManager.js';
import { buildDefaultProductionPlan } from '../src/config/defaultPlan.js';
import { createSeededRng, springPop } from '../src/utils/math.js';

test('Story concept and all 16 scenes pass strict Zod schema validation', () => {
  for (const [concept, scenes] of [
    [WATER_SYSTEMS_CONCEPT, WATER_SYSTEMS_SCENES],
    [BAMBOO_ROOTS_CONCEPT, BAMBOO_ROOTS_SCENES],
    [HARBOR_MAP_CONCEPT, HARBOR_MAP_SCENES],
    [ZERO_RULES_TOWN_CONCEPT, ZERO_RULES_TOWN_SCENES],
    [FREE_MONEY_ISLAND_CONCEPT, FREE_MONEY_ISLAND_SCENES],
    [MARS_RESUME_CONCEPT, MARS_RESUME_SCENES],
    [DINO_TIME_CONCEPT, DINO_TIME_SCENES],
    [GRAVITY_SWITCH_CONCEPT, GRAVITY_SWITCH_SCENES],
    [DREAM_TAX_CONCEPT, DREAM_TAX_SCENES],
    [PIZZA_MONEY_CONCEPT, PIZZA_MONEY_SCENES],
  ] as const) {
    assert.doesNotThrow(() => StoryConceptSchema.parse(concept));
    assert.ok(scenes.length >= 7);
    for (let i = 0; i < scenes.length; i++) {
      const parsed = SceneScriptSchema.parse(scenes[i]);
      assert.equal(parsed.sceneNumber, i + 1);
    }
  }
  assert.equal(resolveStory('bamboo-roots-v1').id, 'bamboo-roots-v1');
  assert.equal(resolveStory('harbor-map-v1').id, 'harbor-map-v1');
  assert.equal(resolveStory('zero-rules-town-v1').id, 'zero-rules-town-v1');
  assert.equal(resolveStory('free-money-island-v1').id, 'free-money-island-v1');
  assert.equal(resolveStory('mars-resume-lie-v1').id, 'mars-resume-lie-v1');
  assert.equal(resolveStory('dino-sneeze-time-v1').id, 'dino-sneeze-time-v1');
  assert.equal(resolveStory('gravity-switch-v1').id, 'gravity-switch-v1');
  assert.equal(resolveStory('dream-tax-v1').id, 'dream-tax-v1');
});

test('ElevenLabs alignment parser groups characters into accurate word timestamps', () => {
  const svc = new ElevenLabsService();
  const alignment = {
    characters: ['L', 'e', 't', "'", 's', ' ', 'g', 'o', '!'],
    character_start_times_seconds: [0.0, 0.05, 0.1, 0.14, 0.18, 0.25, 0.3, 0.38, 0.46],
    character_end_times_seconds: [0.05, 0.1, 0.14, 0.18, 0.25, 0.3, 0.38, 0.46, 0.52],
  };
  const words = svc.extractWordsFromAlignment(alignment);
  assert.equal(words.length, 2);
  assert.equal(words[0].word, "Let's");
  assert.equal(words[0].startSeconds, 0);
  assert.equal(words[0].endSeconds, 0.25);
  assert.equal(words[1].word, 'go!');
  assert.equal(words[1].startSeconds, 0.3);
  assert.equal(words[1].endSeconds, 0.52);
});

test('Caption chunker creates readable non-overlapping 1-3 word lowercase captions', () => {
  const words = [
    { word: 'Why', startSeconds: 0.0, endSeconds: 0.2 },
    { word: 'do', startSeconds: 0.21, endSeconds: 0.35 },
    { word: 'hardest', startSeconds: 0.36, endSeconds: 0.7 },
    { word: 'workers', startSeconds: 0.71, endSeconds: 1.05 },
    { word: 'stay', startSeconds: 1.06, endSeconds: 1.3 },
    { word: 'stuck?', startSeconds: 1.31, endSeconds: 1.7 },
  ];
  const chunks = buildCaptionChunks(words, 30, 2);
  assert.ok(chunks.length >= 2);
  for (let i = 0; i < chunks.length; i++) {
    assert.equal(chunks[i].text, chunks[i].text.toLowerCase());
    assert.ok(chunks[i].endFrame > chunks[i].startFrame);
    if (i > 0) {
      assert.ok(chunks[i].startFrame >= chunks[i - 1].endFrame);
    }
  }
});

test('TimelineManager deterministically maps frames across entire Short', () => {
  const plan = buildDefaultProductionPlan();
  const tm = new TimelineManager(plan);
  const first = tm.evaluate(0);
  assert.equal(first.sceneIndex, 0);
  assert.equal(first.sceneLocalFrame, 0);

  const last = tm.evaluate(plan.totalFrames - 1);
  assert.equal(last.sceneIndex, plan.scenes.length - 1);

  // Determinism check
  const midA = tm.evaluate(Math.floor(plan.totalFrames / 2));
  const midB = tm.evaluate(Math.floor(plan.totalFrames / 2));
  assert.deepEqual(midA, midB);
});

test('Deterministic PRNG and springPop produce repeatable curves', () => {
  const r1 = createSeededRng(12345);
  const r2 = createSeededRng(12345);
  for (let i = 0; i < 20; i++) {
    assert.equal(r1(), r2());
  }
  assert.equal(springPop(0), 0);
  assert.ok(springPop(0.18) > 0.9);
  assert.ok(Math.abs(springPop(1.5) - 1.0) < 0.02);
});

test('Pizza Money short is Shorts-length and every scene has a retention device', () => {
  const total = PIZZA_MONEY_SCENES.reduce((a, s) => a + s.targetDurationSeconds + s.padAfterSeconds, 0);
  assert.ok(total >= 40 && total <= 60, `expected 40-60s, got ${total.toFixed(1)}s`);
  assert.equal(resolveStory('pizza-money-v1').concept.musicStyle, 'funky');
  for (const scene of PIZZA_MONEY_SCENES) {
    const parsed = SceneScriptSchema.parse(scene);
    assert.equal(parsed.environment.worldTheme, 'pizza_town');
    const hasDevice =
      parsed.soundEffects.length > 0 ||
      Boolean(parsed.hud?.topTitle) ||
      Boolean(parsed.experimentOverlay) ||
      (parsed.camera.impacts?.length ?? 0) > 0;
    assert.ok(hasDevice, `scene ${parsed.sceneNumber} has no hook/SFX/impact`);
  }
});

test('Caption chunks carry per-word frames for karaoke highlighting', () => {
  const chunks = buildCaptionChunks(
    [
      { word: 'one', startSeconds: 0, endSeconds: 0.3 },
      { word: 'slice', startSeconds: 0.3, endSeconds: 0.6 },
      { word: 'equals', startSeconds: 0.6, endSeconds: 0.9 },
    ],
    30,
    2
  );
  assert.equal(chunks[0].words?.length, 2);
  assert.equal(chunks[0].words?.[1].startFrame, 9);
});

test('V3 story lint flags long hooks, long scenes and missing hook cards', async () => {
  const { lintStoryV3 } = await import('../src/pipeline/rendering/storyLint.js');
  const base = buildDefaultProductionPlan();
  const fps = base.fps;
  const mk = (seconds: number[], hookTitle?: string) => {
    let start = 0;
    const scenes = seconds.map((sec, i) => {
      const s = structuredClone(base.scenes[i % base.scenes.length]);
      s.scene.sceneNumber = i + 1;
      s.scene.hud = i === 0 && hookTitle ? { topTitle: hookTitle } : undefined;
      s.scene.experimentOverlay = { gauge: { label: 'X', startVal: 0, endVal: 1 } };
      s.startFrame = start;
      s.durationFrames = Math.round(sec * fps);
      start += s.durationFrames;
      return s;
    });
    return { ...base, scenes, totalFrames: start, totalDurationSeconds: start / fps };
  };
  const good = lintStoryV3(mk([3, 3, 3, 3], '500 IQ? 🧠'));
  assert.deepEqual(good, []);
  const bad = lintStoryV3(mk([7, 3, 3]));
  const rules = bad.map((i) => i.rule);
  assert.ok(rules.includes('hook-title'));
  assert.ok(rules.includes('scene-length'));
  assert.ok(rules.includes('payoff-by-6s'));
});
