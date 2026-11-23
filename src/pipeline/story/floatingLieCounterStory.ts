import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { FREEZE_TIME_CONCEPT, FREEZE_TIME_SCENES } from './freezeTimeStory.js';

/**
 * What If Everyone Had a Floating Lie Counter? 🤥 #shorts
 * 3D Cel-shaded Blender Story #5
 *
 * Story Arc:
 * 1. Hook: Best friend smiles saying "I didn't eat your fries" -> counter ticks 12,409 to 12,410 with DING!
 * 2. Escalation 1 (Office): Boss says "We're like a family here" -> counter explodes to 9,999+!
 * 3. Escalation 2 (Street): Guy with pure 0 walks by, everyone stares like he's an alien.
 * 4. Escalation 3 (Cafe): Girl says "I'm totally over my ex" -> counter rolls like a slot machine.
 * 5. The Twist: Alex's own counter is 0, but when he tries telling a tiny white lie -> ZAP! Shocked!
 * 6. Climax: Chef corners Alex asking "Be honest, do you like my cooking?" with burnt dish (TRUTH FORCED ⚠️).
 * 7. Outro: Split A/B comment trigger (See every lie vs Pure 0 trust) + Subscribe CTA + audio loop.
 */
export const FLOATING_LIE_COUNTER_CONCEPT: StoryConcept = {
  ...FREEZE_TIME_CONCEPT,
  id: 'floating-lie-counter-v1',
  styleVersion: undefined,
  title: 'What If Everyone Had a Floating Lie Counter?',
  centralPremise:
    'Imagine waking up and seeing a floating lie counter above everyone’s head. A boss claiming "we\'re like a family" explodes to 9,999+, a girl claiming she\'s over her ex spins like a slot machine, and telling a tiny white lie shocks you with electricity.',
  openingHook: 'Imagine waking up and seeing a floating lie counter over everyone\'s head.',
  mainCharacter: 'Alex (narrates the surreal reality).',
  supportingCharacters: ['Chloe', 'Mayor', 'Chef', 'Guard'],
  environment: 'Toon kitchen/cafe, office, city street, home living room.',
  conflict: 'Total transparency reveals everyday lies, but lying yourself triggers an electric shock.',
  escalation: 'Stolen fries → office family lie → street alien with 0 → cafe ex slot machine → electric shock.',
  climax: 'Chef asks for brutal honesty on his burnt dish while TRUTH FORCED flashes.',
  ending: 'Split A/B question: Would you rather see everyone\'s lies or have a 0 counter everyone trusts?',
  emotionalObjective: 'High energy, hilarious punchlines, relatable social comedy, and viral comment velocity.',
  visualStorytellingOpportunities: [
    'Holographic glowing 3D lie counter ticking up over friend’s head with fries',
    'Boss counter exploding from 840 to 9,999+ in office',
    'Crowd staring at guy with glowing green 0 on street',
    'Slot machine counter rolling at cafe',
    'Yellow electric lightning sparks shocking Alex in living room',
    'Chef holding smoking burnt dish as Alex sweats',
    'High-converting interactive A/B poll card and animated subscribe button',
  ],
};

const BASE = FREEZE_TIME_SCENES[0];
const V = { stability: 0.55, similarityBoost: 0.8, style: 0.35, speed: 0.98 };

const CAM = (from: number[], look: number[], to?: number[], lookTo?: number[], lens = 70, dof?: object) => ({
  from: { loc: from, look, lens },
  to: { loc: to ?? from, look: lookTo ?? look, lens },
  ...(dof ? { dof } : {}),
});

type Shot = NonNullable<SceneScript['shot']>;

interface Beat {
  id: string;
  title: string;
  seconds: number;
  narration: string;
  highlights: string[];
  topTitle?: string;
  topTitleTone?: 'yellow' | 'red' | 'green' | 'white';
  emotion?: SceneScript['emotion'];
  music?: SceneScript['musicEnergy'];
  stamp?: { text: string; color: 'red' | 'green'; atRatio: number };
  gauge?: { label: string; startVal: number; endVal: number; prefix?: string; suffix?: string };
  sfx?: SceneScript['soundEffects'];
  pad?: number;
  shot: Shot;
}

const BEATS: Beat[] = [
  // 1. Hook: Best Friend & Fries
  {
    id: 'lie-01-hook',
    title: 'Hook — The Floating Lie Counter',
    seconds: 3.5,
    narration: "Imagine waking up and seeing a floating lie counter over everyone's head.",
    highlights: ['waking', 'floating', 'lie', 'counter'],
    topTitle: 'LIE COUNTER? 🤥',
    topTitleTone: 'yellow',
    emotion: 'curious',
    music: 'suspense',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.05, volume: 0.5 },
      { sfx: 'ding', atRatio: 0.55, volume: 0.8 },
    ],
    shot: {
      set: 'kitchen',
      time: 'day',
      camera: CAM([0.05, -3.0, 0.92], [0, 0.2, 0.72], [0.0, -2.5, 0.92], [0, 0.2, 0.72], 65),
      chars: [
        {
          id: 'alex',
          x: -0.4,
          y: 0.25,
          face: 25,
          speaker: true,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }],
        },
        {
          id: 'chloe',
          x: 0.4,
          y: 0.25,
          face: -25,
          track: [{ at: 0, action: 'Idle_Loop' }, { at: 0.5, action: 'G_shrug' }],
        },
      ],
      props: [
        { id: 'fries', type: 'french_fries', hold: { char: 'alex', bone: 'DEF-hand.L', from: 0 } },
        { id: 'chloe_ctr', type: 'floating_counter', hold: { char: 'chloe', bone: 'DEF-head', from: 0, onHead: 1.7 }, params: { text: '12,410', color: '#FFE600' } },
      ],
    },
  },

  // 2. Office: Boss "We're like a family"
  {
    id: 'lie-02-boss-family',
    title: 'Office — The Boss Family Lie',
    seconds: 4.0,
    narration: "At work, the boss smiled and said 'We're like a family here'—and his counter exploded past ten thousand!",
    highlights: ['boss', 'family', 'counter', 'exploded'],
    topTitle: 'BIGGEST LIE 🚨',
    topTitleTone: 'red',
    stamp: { text: '9,999+ LIES! 🚨', color: 'red', atRatio: 0.55 },
    emotion: 'playful',
    music: 'driving',
    sfx: [
      { sfx: 'impact_boom', atRatio: 0.52, volume: 0.75 },
      { sfx: 'ui_click', atRatio: 0.55, volume: 0.7 },
    ],
    shot: {
      set: 'office',
      time: 'day',
      camera: CAM([0, -3.2, 0.95], [0, 0.35, 0.68], [0, -2.7, 0.95], [0, 0.35, 0.68], 60),
      chars: [
        {
          id: 'mayor',
          x: 0,
          y: 0.35,
          face: 0,
          speaker: true,
          track: [{ at: 0, action: 'G_hips' }, { at: 0.45, action: 'G_point' }, { at: 0.75, action: 'G_cheer' }],
        },
      ],
      props: [
        { id: 'boss_ctr', type: 'floating_counter', hold: { char: 'mayor', bone: 'DEF-head', from: 0, onHead: 2.1 }, params: { text: '9,999+', color: '#FF3366', prefix: 'LIES: ' } },
      ],
    },
  },

  // 3. Street: Guy with Pure 0
  {
    id: 'lie-03-street-zero',
    title: 'Street — The Zero Lies Alien',
    seconds: 3.8,
    narration: "On the street, a guy walked past with a pure zero above his head... and everyone stared at him like an alien.",
    highlights: ['zero', 'everyone', 'stared', 'alien'],
    topTitle: 'ZERO LIES? 👽',
    topTitleTone: 'green',
    emotion: 'curious',
    music: 'suspense',
    sfx: [
      { sfx: 'sparkle_chime', atRatio: 0.35, volume: 0.65 },
      { sfx: 'record_scratch', atRatio: 0.6, volume: 0.6 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([0, -4.0, 0.85], [0, 0.2, 0.62], [0, -3.4, 0.85], [0, 0.2, 0.62], 55),
      chars: [
        {
          id: 'alex',
          x: 0,
          y: 0.2,
          face: 0,
          speaker: true,
          track: [{ at: 0, action: 'Walk_Loop' }],
        },
        {
          id: 'guard',
          x: -0.75,
          y: 0.3,
          face: 60,
          track: [{ at: 0, action: 'G_think' }],
        },
        {
          id: 'chloe',
          x: 0.75,
          y: 0.3,
          face: -60,
          track: [{ at: 0, action: 'G_facepalm' }],
        },
      ],
      props: [
        { id: 'zero_ctr', type: 'floating_counter', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 1.85 }, params: { text: '0', color: '#00FF66', prefix: 'LIES: ' } },
      ],
    },
  },

  // 4. Cafe: Over My Ex Slot Machine
  {
    id: 'lie-04-cafe-ex',
    title: 'Cafe — The Slot Machine Ex Lie',
    seconds: 4.0,
    narration: "At the cafe, a girl claimed she was totally over her ex... while her counter rolled like a slot machine.",
    highlights: ['totally', 'over', 'ex', 'slot', 'machine'],
    topTitle: 'SLOT MACHINE 🎰',
    topTitleTone: 'yellow',
    emotion: 'playful',
    music: 'driving',
    sfx: [
      { sfx: 'pop', atRatio: 0.35, volume: 0.6 },
      { sfx: 'ding', atRatio: 0.55, volume: 0.7 },
      { sfx: 'boing', atRatio: 0.75, volume: 0.6 },
    ],
    shot: {
      set: 'kitchen',
      time: 'day',
      camera: CAM([0.1, -3.2, 0.95], [0, 0.2, 0.72], [0.0, -2.7, 0.95], [0, 0.2, 0.72], 65),
      chars: [
        {
          id: 'chloe',
          x: 0.25,
          y: 0.25,
          face: -15,
          speaker: true,
          track: [{ at: 0, action: 'Sitting_Talking_Loop' }, { at: 0.6, action: 'G_wave' }],
        },
      ],
      props: [
        { id: 'chloe_slot', type: 'floating_counter', hold: { char: 'chloe', bone: 'DEF-head', from: 0, onHead: 1.7 }, params: { text: '+3 LIES', color: '#FF9900', prefix: '🎰 ' } },
        { id: 'cup', type: 'coffee_cup', loc: [0.0, 0.22, 0.78] },
      ],
    },
  },

  // 5. The Twist: White Lie Electric Shock
  {
    id: 'lie-05-the-shock',
    title: 'The Twist — Electric Shock On White Lie',
    seconds: 4.5,
    narration: "Then I looked up at my own counter: a perfect zero. But when I tried telling one tiny white lie... ZAP!",
    highlights: ['counter', 'zero', 'white', 'lie', 'zap'],
    topTitle: 'THE SHOCK ⚡',
    topTitleTone: 'yellow',
    stamp: { text: 'ZAPPED! ⚡', color: 'red', atRatio: 0.65 },
    emotion: 'energetic',
    music: 'suspense',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.35, volume: 0.5 },
      { sfx: 'impact_boom', atRatio: 0.62, volume: 0.8 },
      { sfx: 'sparkle_chime', atRatio: 0.7, volume: 0.7 },
    ],
    shot: {
      set: 'home',
      time: 'day',
      camera: CAM([0, -3.0, 0.90], [0, 0.15, 0.68], [0, -2.5, 0.90], [0, 0.15, 0.68], 60),
      chars: [
        {
          id: 'alex',
          x: 0,
          y: 0.2,
          face: 0,
          speaker: true,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.6, action: 'Hit_Head' }, { at: 0.85, action: 'G_shrug' }],
        },
      ],
      props: [
        { id: 'alex_ctr', type: 'floating_counter', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 1.85 }, params: { text: '0 -> 1', color: '#FF3366', prefix: '⚡ ' } },
        { id: 'sparks', type: 'electric_spark', hold: { char: 'alex', bone: 'DEF-head', from: 0.6 } },
      ],
    },
  },

  // 6. The Climax: Chef Forced Truth
  {
    id: 'lie-06-chef-cooking',
    title: 'Climax — Chef Cooking Truth Dilemma',
    seconds: 4.2,
    narration: "Now Chef is cornering me with burnt soup asking: 'Be honest... do you like my cooking?'",
    highlights: ['chef', 'cornering', 'honest', 'cooking'],
    topTitle: 'TRUTH FORCED ⚠️',
    topTitleTone: 'red',
    stamp: { text: 'BRUTAL TRUTH 💀', color: 'red', atRatio: 0.55 },
    emotion: 'energetic',
    music: 'driving',
    sfx: [
      { sfx: 'impact_boom', atRatio: 0.52, volume: 0.75 },
      { sfx: 'boing', atRatio: 0.65, volume: 0.65 },
    ],
    shot: {
      set: 'kitchen',
      time: 'day',
      camera: CAM([0.0, -3.2, 0.95], [0, 0.2, 0.72], [0.0, -2.7, 0.95], [0, 0.2, 0.72], 65),
      chars: [
        {
          id: 'chef',
          x: -0.45,
          y: 0.25,
          face: 30,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.45, action: 'G_cheer' }],
        },
        {
          id: 'alex',
          x: 0.45,
          y: 0.25,
          face: -30,
          speaker: true,
          track: [{ at: 0, action: 'G_think' }, { at: 0.55, action: 'G_facepalm' }],
        },
      ],
      props: [
        { id: 'burnt', type: 'burnt_dish', hold: { char: 'chef', bone: 'DEF-hand.R', from: 0 } },
        { id: 'chef_danger', type: 'floating_counter', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 1.85 }, params: { text: 'DANGER!', color: '#FF0000', prefix: '⚠️ ' } },
      ],
    },
  },

  // 7. A/B Comment Trigger & Outro Loop
  {
    id: 'lie-07-comment-trigger',
    title: 'Ending — Split A/B Poll & Subscribe',
    seconds: 4.8,
    narration: "Would you rather see everyone else's lies—or have a zero counter everyone trusts? Comment A or B... and subscribe before your counter goes up!",
    highlights: ['rather', 'see', 'lies', 'zero', 'trusts', 'comment', 'subscribe'],
    emotion: 'warm_triumph',
    music: 'outro',
    sfx: [
      { sfx: 'sparkle_chime', atRatio: 0.35, volume: 0.65 },
      { sfx: 'ding', atRatio: 0.44, volume: 0.75 },
      { sfx: 'ui_click', atRatio: 0.65, volume: 0.8 },
    ],
    shot: {
      set: 'kitchen',
      time: 'day',
      camera: CAM([0, -2.5, 0.90], [0, 0.1, 0.72], [0, -2.2, 0.90], [0, 0.1, 0.72], 55, { char: 'alex', fstop: 2.2 }),
      chars: [
        {
          id: 'alex',
          x: 0,
          y: 0.15,
          face: 0,
          speaker: true,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.35, action: 'G_point' }, { at: 0.7, action: 'G_cheer' }],
        },
      ],
      props: [
        { id: 'balloon1', type: 'balloon', loc: [-0.95, 0.9, 0], params: { color: '#FFE600', shade: '#D4B800', h: 1.35 }, anim: { type: 'bob' } },
        { id: 'balloon2', type: 'balloon', loc: [0.95, 1.0, 0], params: { color: '#00FF66', shade: '#00CC52', h: 1.45 }, anim: { type: 'bob', phase: 2 } },
      ],
    },
  },
];

export const FLOATING_LIE_COUNTER_SCENES: SceneScript[] = BEATS.map((b, i) => {
  return {
    sceneNumber: i + 1,
    id: b.id,
    title: b.title,
    targetDurationSeconds: b.seconds,
    padAfterSeconds: b.pad ?? 0.2,
    narration: b.narration,
    emotion: b.emotion ?? 'curious',
    voiceSettings: V,
    camera: {
      startPosition: [0, 2.4, 6.0],
      endPosition: [0, 2.0, 5.0],
      startLookAt: [0, 1.8, 0],
      endLookAt: [0, 1.8, 0],
      fov: 46,
      movement: 'dolly_in',
      impacts: [0.3],
    },
    lightingPreset: 'daylight',
    hud: {
      captionHighlights: b.highlights,
      ...(b.topTitle ? { topTitle: b.topTitle, topTitleTone: b.topTitleTone ?? 'yellow' } : {}),
      ...(i === 0 ? { emojiBurst: { emoji: '🤥', atRatio: 0.45, count: 8 } } : {}),
      ...(i === 6
        ? {
            emojiBurst: { emoji: '🤥', atRatio: 0.38, count: 12 },
            engagementPoll: {
              question: 'WHICH POWER WOULD YOU CHOOSE? 🤥',
              optionA: '🅰️ SEE EVERY LIE 👁️',
              optionB: '🅱️ PURE ZERO TRUST 😇',
              atRatio: 0.42,
            },
          }
        : {}),
    },
    experimentOverlay: {
      ...(b.gauge ? { gauge: b.gauge } : {}),
      ...(b.stamp ? { stamp: b.stamp } : {}),
    },
    characters: [
      {
        characterId: 'alex',
        position: [0, 0, 0.8],
        facing: 'front',
        expression: 'neutral',
        pose: 'hands_on_hips',
        outfit: 'default',
        visible: true,
        scale: 1.05,
      },
    ],
    speaker: 'alex',
    environment: {
      ...BASE.environment,
      showSubscribeCta: i === 6,
    },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: b.sfx ?? [],
    musicEnergy: b.music ?? 'driving',
    transition: i === 0 ? 'zoom_punch' : 'cut',
    shot: b.shot,
    visualObjective: b.title,
  } as SceneScript;
});
