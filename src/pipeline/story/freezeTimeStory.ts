import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { FIVE_HUNDRED_IQ_CONCEPT, FIVE_HUNDRED_IQ_SCENES } from './fiveHundredIqStory.js';

/**
 * First Blender-cast story (rigged chibi cast, assets/characters/cast.blend).
 * - Topic from YouTube autocomplete demand: "what if you could freeze time"
 * - Storytime voice (calm ~150 wpm), 1-word captions, real lip-sync from the narration envelope
 * - Persistent stake: SNAPS LEFT counter 5 → 0
 * - Turn: freezing time is lonely → last snap brings everyone back; ends on a question (loop/comment bait)
 *
 * Each scene's `shot` is rendered by blender/scripts/render_scene.py via scripts/produce-blender.ts.
 * Track/path times are scene ratios (0..1). `freeze: true` holds the previous action exactly where it is.
 */
export const FREEZE_TIME_CONCEPT: StoryConcept = {
  ...FIVE_HUNDRED_IQ_CONCEPT,
  id: 'freeze-time-v1',
  title: 'What If You Could Freeze Time?',
  centralPremise:
    'Alex discovers he can freeze time with a snap—but only five times. He spends the snaps on silly wins, realises frozen people cannot laugh with him, and spends the last snap bringing everyone back.',
  openingHook: 'Alex snaps on a busy street and everyone freezes mid-step; SNAPS LEFT: 5 appears.',
  mainCharacter: 'Alex (narrates in first person).',
  supportingCharacters: ['Chloe (frozen mid-glare)', 'Chef (frozen mid-point)', 'Mayor (frozen mid-parade)', 'Granny (frozen mid-thought)'],
  environment: 'Toon town street, chef kitchen, park parade, Granny’s living room.',
  conflict: 'Unlimited fun, limited snaps—and nobody to share it with.',
  escalation: 'Steals the last pizza slice → wins a staring contest vs frozen Chloe → dances in the frozen parade → tells frozen Granny his secret.',
  climax: 'Alone on a street of statues: “frozen people can’t laugh at your jokes.”',
  ending: 'Last snap brings everyone back; they dance. Alex asks the viewer what they would do with one snap.',
  emotionalObjective: 'Cozy, funny storytime with a warm twist in ~30 seconds.',
  visualStorytellingOpportunities: ['Freeze mid-stride on the snap', 'SNAPS LEFT counter ticking down', 'Everyone unfreezes into a dance'],
  musicStyle: 'funky',
  captionStyle: 'storytime',
  visualStyle: 'storytime',
  styleVersion: 'v3',
  renderMode: 'three',
  illustrationStyle: undefined,
};

const BASE = FIVE_HUNDRED_IQ_SCENES[0];
const V = { stability: 0.55, similarityBoost: 0.8, style: 0.3, speed: 0.95 };
const CAM = (from: number[], look: number[], to?: number[], lookTo?: number[], lens = 70) => ({
  from: { loc: from, look, lens },
  to: { loc: to ?? from, look: lookTo ?? look, lens },
});
const MID = CAM([0, -5.6, 0.85], [0, 0, 0.62], [0, -4.9, 0.82], [0, 0, 0.62]);

type Shot = NonNullable<SceneScript['shot']>;
interface Beat {
  id: string;
  title: string;
  seconds: number;
  narration: string;
  highlights: string[];
  shot: Shot;
  snaps: [number, number];
  sfx?: SceneScript['soundEffects'];
  topTitle?: string;
  music?: SceneScript['musicEnergy'];
  emotion?: SceneScript['emotion'];
}

// Shared prop setups (continuity: Chloe's frozen coffee splash + the frozen pigeon recur)
const CUP = (char: string, from = 0) => [
  { id: `${char}_cup`, type: 'coffee_cup', scale: 1.25, hold: { char, bone: 'DEF-hand.R', from, offset: [0, -0.03, -0.06], rot: [0, 0, 0] } },
];
const PIGEON_FROZEN = (x: number, y: number, z: number, rz = 0) => ({ id: 'pigeon', type: 'pigeon', loc: [x, y, z], rot: [0, -10, rz], scale: 1.3, anim: { type: 'flap', until: 0.01 } });
const PARTY = [
  { id: 'bunting', type: 'bunting', params: { a: [-1.7, 1.4, 1.95], b: [1.7, 1.4, 1.95], n: 11, sag: 0.18 } },
  { id: 'balloon1', type: 'balloon', loc: [-0.95, 0.9, 0], params: { color: '#F28AA0', shade: '#D96C84', h: 1.25 } },
  { id: 'balloon2', type: 'balloon', loc: [1.0, 1.0, 0], params: { color: '#7FC8F8', shade: '#5EA8D8', h: 1.4 } },
  { id: 'balloon3', type: 'balloon', loc: [-0.75, 1.1, 0], params: { color: '#FFD45E', shade: '#E5B840', h: 1.5 } },
];
// Kitchen pizza: table between Alex and Chef, missing wedge faces Alex (θ ≈ 197°)
const PIZZA_C = [0.0, 0.15, 0.455];
const TH = (197.5 * Math.PI) / 180;
const SLICE_REST = [PIZZA_C[0] + 0.23 * Math.cos(TH), PIZZA_C[1] + 0.23 * Math.sin(TH), PIZZA_C[2] + 0.02];

const BEATS: Beat[] = [
  {
    id: 'ft-01-hook',
    title: 'Hook — I Can Freeze Time',
    seconds: 3.4,
    narration: 'I can freeze time... but I only get five snaps.',
    highlights: ['freeze', 'time', 'five', 'snaps'],
    snaps: [5, 5],
    topTitle: 'FREEZE TIME? ⏸',
    emotion: 'energetic',
    sfx: [{ sfx: 'pop', atRatio: 0.36, volume: 0.7 }, { sfx: 'sparkle_chime', atRatio: 0.4, volume: 0.5 }],
    shot: {
      set: 'street',
      freeze: { from: 0.36 },
      camera: CAM([0, -5.4, 0.85], [0, 0, 0.62], [0, -4.7, 0.82], [0, 0, 0.64]),
      chars: [
        { id: 'chloe', y: 0.55, path: [[0, -1.2, 0.55, 90], [0.38, -0.48, 0.55, 90]], track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.38, freeze: true }], blinkUntil: 0.38 },
        { id: 'chef', y: 0.7, path: [[0, 1.3, 0.7, -90], [0.38, 0.52, 0.7, -90]], track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.38, freeze: true }], blinkUntil: 0.38 },
        { id: 'alex', x: 0, y: -0.2, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.26, action: 'G_snap' }, { at: 0.5, action: 'G_cheer' }] },
      ],
      props: [
        ...CUP('chloe'),
        { id: 'pigeon', type: 'pigeon', scale: 1.4, rot: [0, -8, 0], path: [[0, -1.2, 0.6, 1.5], [0.38, -0.42, 0.6, 1.42]], anim: { type: 'flap', until: 0.38 } },
      ],
    },
  },
  {
    id: 'ft-02-pizza',
    title: 'Snap One — The Last Slice',
    seconds: 3.2,
    narration: "Snap one: I ate the chef's last slice of pizza.",
    highlights: ['one', 'last', 'pizza'],
    snaps: [5, 4],
    sfx: [{ sfx: 'pop', atRatio: 0.08, volume: 0.6 }, { sfx: 'bite_crunch', atRatio: 0.72, volume: 0.6 }],
    shot: {
      set: 'kitchen',
      freeze: {},
      camera: CAM([0, -5.0, 1.35], [0, 0, 0.55], [-0.1, -4.3, 1.25], [-0.1, 0, 0.55]),
      chars: [
        { id: 'chef', x: 0.48, y: 0.42, face: -40, track: [{ at: 0, action: 'G_point', hold: 20 }], blink: false },
        { id: 'alex', speaker: true, path: [[0, -1.15, 0.0, 90], [0.4, -0.33, 0.02, 55]], track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.4, action: 'Interact' }, { at: 0.56, action: 'G_eatL' }, { at: 0.86, action: 'G_cheer' }] },
      ],
      props: [
        { id: 'table', type: 'table', loc: [PIZZA_C[0], PIZZA_C[1], 0] },
        { id: 'pizza', type: 'pizza', loc: PIZZA_C, rot: [0, 0, 175], scale: 1.35, params: { missing: 1 } },
        { id: 'slice', type: 'slice', loc: SLICE_REST, rot: [0, 0, 197.5], scale: 1.35, show: [0, 0.68], hold: { char: 'alex', bone: 'DEF-hand.L', from: 0.5, aimMouth: true } },
        { id: 'slice_b', type: 'slice_bitten', scale: 1.35, hold: { char: 'alex', bone: 'DEF-hand.L', from: 0.68, aimMouth: true } },
        { id: 'crumbs', type: 'crumbs', loc: [-0.24, -0.02, 0.62], show: [0.69, null], anim: { type: 'fall', from: 0.69, speed: 0.9 } },
      ],
    },
  },
  {
    id: 'ft-03-stare',
    title: 'Snap Two — Staring Contest',
    seconds: 3.8,
    narration: 'Snap two: I won a staring contest... against frozen Chloe.',
    highlights: ['two', 'staring', 'frozen'],
    snaps: [4, 3],
    sfx: [{ sfx: 'pop', atRatio: 0.06, volume: 0.6 }, { sfx: 'ding', atRatio: 0.8, volume: 0.5 }],
    shot: {
      set: 'street',
      freeze: {},
      camera: CAM([0, -4.6, 0.85], [0, 0, 0.64], [0, -4.0, 0.84], [0.05, 0, 0.66]),
      chars: [
        { id: 'chloe', x: -0.3, y: 0.1, face: 55, track: [{ at: 0, action: 'Walk_Loop', hold: 8 }], blink: false },
        { id: 'alex', x: 0.36, y: -0.05, face: -55, speaker: true, track: [{ at: 0, action: 'G_hips' }, { at: 0.3, action: 'G_wave' }, { at: 0.8, action: 'G_cheer' }] },
      ],
      props: [...CUP('chloe'), PIGEON_FROZEN(0.05, 0.6, 1.42)],
    },
  },
  {
    id: 'ft-04-parade',
    title: 'Snap Three — Dancing in the Parade',
    seconds: 4.0,
    narration: "Snap three: I danced in the mayor's parade. Nobody could stop me.",
    highlights: ['three', 'danced', 'parade', 'nobody'],
    snaps: [3, 2],
    music: 'triumphant',
    sfx: [{ sfx: 'pop', atRatio: 0.06, volume: 0.6 }],
    shot: {
      set: 'park',
      freeze: {},
      camera: CAM([-0.3, -5.8, 0.9], [0, 0, 0.62], [0.3, -5.2, 0.86], [0, 0, 0.62]),
      chars: [
        { id: 'mayor', x: 0.42, y: 0.45, face: -20, track: [{ at: 0, action: 'G_cheer', hold: 12 }], blink: false },
        { id: 'granny', x: -0.55, y: 0.5, face: 25, track: [{ at: 0, action: 'G_wave', hold: 15 }], blink: false },
        { id: 'alex', x: 0, y: -0.1, face: 0, speaker: true, track: [{ at: 0, action: 'Dance_Loop' }] },
      ],
      props: [
        ...PARTY,
        { id: 'flag', type: 'flag', hold: { char: 'mayor', bone: 'DEF-hand.R', from: 0, offset: [0, 0, -0.02], rot: [0, 0, 0] } },
        { id: 'confetti', type: 'confetti', loc: [0, 0.2, 0], params: { n: 80, box: [1.9, 1.0, 1.1], z0: 0.55, seed: 4 } },
      ],
    },
  },
  {
    id: 'ft-05-granny',
    title: 'Snap Four — Telling Granny',
    seconds: 3.8,
    narration: 'Snap four: I told Granny my biggest secret. She was frozen too.',
    highlights: ['four', 'secret', 'frozen'],
    snaps: [2, 1],
    music: 'gentle',
    emotion: 'warm_triumph',
    sfx: [{ sfx: 'pop', atRatio: 0.06, volume: 0.6 }],
    shot: {
      set: 'home',
      freeze: {},
      camera: CAM([0, -4.8, 0.85], [0, 0, 0.62], [0, -4.3, 0.84], [0, 0, 0.64]),
      chars: [
        { id: 'granny', x: 0.42, y: 0.15, face: -60, track: [{ at: 0, action: 'G_pour', hold: 8 }], blink: false },
        { id: 'alex', x: -0.4, y: 0, face: 40, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.62, action: 'G_shrug' }] },
      ],
      props: [
        { id: 'teatable', type: 'tea_set', loc: [0.05, 0.12, 0] },
        { id: 'teapot', type: 'teapot', scale: 1.4, hold: { char: 'granny', bone: 'DEF-hand.R', from: 0, offset: [0, 0, 0], rot: [0, 32, 240] } },
        { id: 'stream', type: 'tea_stream', params: { fromProp: 'teapot', fromLocal: [0.225, 0, 0.02], cupOn: 'teatable' } },
      ],
    },
  },
  {
    id: 'ft-06-lonely',
    title: 'Turn — Statues Cannot Laugh',
    seconds: 3.6,
    narration: "That's the thing. Frozen people can't laugh at your jokes.",
    highlights: ['frozen', 'laugh', 'jokes'],
    snaps: [1, 1],
    music: 'suspense',
    emotion: 'sad',
    sfx: [{ sfx: 'sigh_down', atRatio: 0.7, volume: 0.55 }],
    shot: {
      set: 'street',
      freeze: {},
      camera: CAM([0, -4.4, 0.8], [0, 0, 0.62], [0, -6.2, 0.95], [0, 0, 0.6]),
      chars: [
        { id: 'chloe', x: -0.95, y: 0.7, face: 90, track: [{ at: 0, action: 'Walk_Loop', hold: 8 }], blink: false },
        { id: 'chef', x: 1.05, y: 0.9, face: -60, track: [{ at: 0, action: 'G_cheer', hold: 12 }], blink: false },
        { id: 'mayor', x: -0.15, y: 1.6, face: 10, track: [{ at: 0, action: 'G_wave', hold: 18 }], blink: false },
        { id: 'alex', x: -0.05, y: -0.15, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.55, action: 'G_facepalm' }] },
      ],
      props: [
        ...CUP('chloe'),
        { id: 'dough', type: 'dough', hold: { char: 'chef', bone: 'DEF-hand.R', from: 0, offset: [-0.12, 0, 0.2], rot: [12, -8, 0] } },
        PIGEON_FROZEN(0.4, 0.6, 1.25, 160),
      ],
    },
  },
  {
    id: 'ft-07-unfreeze',
    title: 'Twist — Last Snap Brings Everyone Back',
    seconds: 3.4,
    narration: 'So I used my last snap... to bring everyone back.',
    highlights: ['last', 'snap', 'everyone', 'back'],
    snaps: [1, 0],
    music: 'triumphant',
    emotion: 'playful',
    sfx: [{ sfx: 'pop', atRatio: 0.4, volume: 0.7 }, { sfx: 'sparkle_chime', atRatio: 0.45, volume: 0.55 }],
    shot: {
      set: 'park',
      freeze: { to: 0.42 },
      camera: CAM([0, -6.0, 0.9], [0, 0, 0.62], [0, -5.3, 0.88], [0, 0, 0.62]),
      chars: [
        { id: 'chloe', x: -0.6, y: 0.4, face: 20, track: [{ at: 0, action: 'G_cross', hold: 10 }, { at: 0.45, action: 'Dance_Loop' }], blinkFrom: 0.45 },
        { id: 'mayor', x: 0.6, y: 0.45, face: -20, track: [{ at: 0, action: 'G_cheer', hold: 12 }, { at: 0.45, action: 'G_cheer' }], blinkFrom: 0.45 },
        { id: 'granny', x: 0.2, y: 0.9, face: -5, track: [{ at: 0, action: 'G_think', hold: 8 }, { at: 0.47, action: 'Dance_Loop' }], blinkFrom: 0.47 },
        { id: 'alex', x: -0.05, y: -0.1, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.3, action: 'G_snap' }, { at: 0.55, action: 'Dance_Loop' }] },
      ],
      props: [
        ...PARTY,
        { id: 'flag', type: 'flag', hold: { char: 'mayor', bone: 'DEF-hand.R', from: 0, offset: [0, 0, -0.02], rot: [0, 0, 0] } },
        { id: 'confetti', type: 'confetti', loc: [0, 0.2, 0], params: { n: 90, box: [1.9, 1.0, 1.2], z0: 0.6, seed: 4 }, anim: { type: 'fall', from: 0.42, speed: 0.32 } },
      ],
    },
  },
  {
    id: 'ft-08-loop',
    title: 'Loop — What Would You Do?',
    seconds: 2.4,
    narration: 'What would YOU do with one snap?',
    highlights: ['you', 'one', 'snap'],
    snaps: [0, 0],
    topTitle: 'FREEZE TIME? ⏸',
    emotion: 'playful',
    shot: {
      set: 'street',
      camera: CAM([0, -3.9, 0.85], [0, 0, 0.7], [0, -3.4, 0.86], [0, 0, 0.72]),
      chars: [{ id: 'alex', x: 0, y: 0, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.35, action: 'G_point' }] }],
      props: [{ id: 'pigeon', type: 'pigeon', scale: 1.3, rot: [0, -8, 0], path: [[0, -0.9, 0.5, 1.5], [1, 0.9, 0.5, 1.7]], anim: { type: 'flap' } }],
    },
  },
];

export const FREEZE_TIME_SCENES: SceneScript[] = BEATS.map((b, i) => {
  const { illustration: _drop, ...base } = BASE;
  return {
    ...base,
    sceneNumber: i + 1,
    id: b.id,
    title: b.title,
    targetDurationSeconds: b.seconds,
    padAfterSeconds: 0.3,
    narration: b.narration,
    emotion: b.emotion ?? 'playful',
    voiceSettings: V,
    hud: { captionHighlights: b.highlights, ...(b.topTitle ? { topTitle: b.topTitle, topTitleTone: 'white' as const } : {}) },
    experimentOverlay: b.topTitle ? {} : { gauge: { label: 'SNAPS LEFT', startVal: b.snaps[0], endVal: b.snaps[1] } },
    soundEffects: b.sfx ?? [],
    thoughtBubbles: [],
    smokePoofs: [],
    musicEnergy: b.music ?? 'driving',
    transition: i === 0 ? 'zoom_punch' : 'cut',
    speaker: 'alex',
    shot: b.shot,
    visualObjective: b.title,
  } as SceneScript;
});
