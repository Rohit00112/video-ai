import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { FREEZE_TIME_CONCEPT, FREEZE_TIME_SCENES } from './freezeTimeStory.js';

/**
 * Blender-cast Short #2 (plan: docs/plans/everyone-disappeared.md)
 * - Demand: "what if everyone disappeared" / "last person on earth"
 * - Hook: tiny Alex in a wide empty street. Stake: PEOPLE LEFT: 1 → 5 on the twist.
 * - Twist: everyone was hiding for his surprise birthday party. Ends on a comment question.
 * Track/path/prop times are scene ratios (0..1), converted to frames by scripts/produce-blender.ts.
 */
export const EVERYONE_GONE_CONCEPT: StoryConcept = {
  ...FREEZE_TIME_CONCEPT,
  id: 'everyone-gone-v1',
  title: 'What If Everyone on Earth Disappeared?',
  centralPremise:
    'Alex wakes up and everyone on Earth is gone. Free pizza, he makes himself mayor, he dances in the street, then a lonely night, until he hears noises behind Granny’s door: everyone was hiding for his surprise birthday.',
  openingHook: 'A very wide empty street with tiny Alex in the middle: “I woke up... and everyone on Earth was gone.”',
  mainCharacter: 'Alex (narrates in first person).',
  supportingCharacters: ['Chloe', 'Mayor', 'Chef', 'Granny (hosts the surprise)', 'The pigeon'],
  environment: 'Toon town street (day, evening, night), kitchen, park stage, Granny’s living room (night, party).',
  conflict: 'Total freedom turns into total loneliness.',
  escalation: 'Free pizza → every slice → makes himself mayor → three-hour street dance → silent night.',
  climax: 'A warm light under Granny’s door at night.',
  ending: 'SURPRISE birthday party; PEOPLE LEFT jumps 1 → 5; Alex asks if you would have found them sooner.',
  emotionalObjective: 'Funny, cozy, then a warm twist in ~40 s.',
  visualStorytellingOpportunities: ['Tiny Alex in a huge empty street', 'Wobbling pizza-box tower', 'Mayor hat on Alex', 'Night silence', 'Party reveal'],
};

const BASE = FREEZE_TIME_SCENES[0];
const V = { stability: 0.55, similarityBoost: 0.8, style: 0.3, speed: 0.95 };
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
  people: [number, number] | null;
  shot: Shot;
  sfx?: SceneScript['soundEffects'];
  topTitle?: string;
  music?: SceneScript['musicEnergy'];
  emotion?: SceneScript['emotion'];
  pad?: number;
}

const HAT = (char: string, color: string, stripe: string, rot: number[] = [0, 0, 0]) => ({
  id: `${char}_phat`, type: 'party_hat', params: { color, stripe }, scale: 1.1, hold: { char, bone: 'DEF-head', from: 0, onHead: 0.82, rot },
});
const NEWSPAPER = { id: 'paper', type: 'newspaper', scale: 1.2, path: [[0, -1.9, -0.5, 0.06], [0.3, -1.0, -0.45, 0.22], [0.55, -0.1, -0.5, 0.07], [0.8, 0.8, -0.45, 0.25], [1, 1.7, -0.5, 0.08]], anim: { type: 'tumble' } };
const PARTY_ROOM = [
  { id: 'lights', type: 'string_lights', params: { a: [-1.6, 1.95, 1.95], b: [1.6, 1.95, 1.95], n: 18, sag: 0.18 } },
  { id: 'banner', type: 'banner_text', loc: [0, 2.0, 1.55], params: { text: 'HAPPY BIRTHDAY ALEX!', color: '#E07A5F', size: 0.17 } },
  { id: 'gift1', type: 'gift', loc: [0.95, 0.5, 0], rot: [0, 0, 20], params: { color: '#7FC8F8', ribbon: '#F28AA0', size: 0.2 } },
  { id: 'gift2', type: 'gift', loc: [-1.0, 0.6, 0], rot: [0, 0, -15], params: { color: '#9BE39A', ribbon: '#FFD45E', size: 0.17 } },
  { id: 'balloon1', type: 'balloon', loc: [-1.15, 1.3, 0], params: { color: '#F28AA0', shade: '#D96C84', h: 1.35 }, anim: { type: 'bob', amp: 0.03 } },
  { id: 'balloon2', type: 'balloon', loc: [1.2, 1.3, 0], params: { color: '#FFD45E', shade: '#E5B840', h: 1.45 }, anim: { type: 'bob', amp: 0.03, phase: 1.5 } },
];

const BEATS: Beat[] = [
  {
    id: 'ed-01-hook',
    title: 'Hook — Everyone on Earth Was Gone',
    seconds: 3.4,
    narration: 'I woke up one morning... and everyone on Earth was gone.',
    highlights: ['everyone', 'earth', 'gone'],
    people: null,
    topTitle: 'EVERYONE GONE? 😶',
    emotion: 'suspense',
    music: 'suspense',
    sfx: [{ sfx: 'whoosh', atRatio: 0.05, volume: 0.4 }],
    shot: {
      set: 'street',
      camera: CAM([0, -10.5, 2.1], [0, 0.6, 0.6], [0, -8.2, 1.6], [0, 0.4, 0.6]),
      chars: [{ id: 'alex', x: 0, y: 0, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Loop' }, { at: 0.45, action: 'G_think' }] }],
      props: [NEWSPAPER, { id: 'tlight', type: 'traffic_light', loc: [-1.0, 0.65, 0], rot: [0, 0, 10], anim: { type: 'blink', mode: 'yellow', period: 24 } }],
    },
  },
  {
    id: 'ed-02-pigeon',
    title: 'Not Even the Pigeon',
    seconds: 3.4,
    narration: 'No neighbors. No traffic. Not even the pigeon.',
    highlights: ['neighbors', 'traffic', 'pigeon'],
    people: [1, 1],
    sfx: [{ sfx: 'tick', atRatio: 0.7, volume: 0.35 }],
    shot: {
      set: 'street',
      camera: CAM([0.15, -3.4, 0.3], [0.5, 0.8, 1.05], [0.25, -3.0, 0.32], [0.55, 0.8, 1.12]),
      chars: [{ id: 'alex', x: 0.4, y: 0.75, face: 20, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.6, action: 'G_shrug' }] }],
      props: [{ id: 'feather', type: 'feather', scale: 1.6, path: [[0, 0.75, 1.6, 1.75], [0.5, 0.62, 1.5, 1.2], [1, 0.72, 1.4, 0.75]], anim: { type: 'flutter' } }],
    },
  },
  {
    id: 'ed-03-pizza',
    title: 'Free Pizza',
    seconds: 3.4,
    narration: 'So I did what anyone would do. I took all the free pizza.',
    highlights: ['anyone', 'free', 'pizza'],
    people: [1, 1],
    music: 'driving',
    emotion: 'playful',
    sfx: [{ sfx: 'boing', atRatio: 0.75, volume: 0.45 }],
    shot: {
      set: 'kitchen',
      camera: CAM([0, -5.0, 1.05], [0, 0, 0.6], [0.15, -4.4, 1.0], [0.15, 0, 0.62]),
      chars: [
        {
          id: 'alex', speaker: true, path: [[0, -1.2, 0.0, 90], [0.7, 0.05, 0.0, 90], [0.82, 0.08, 0.0, 30]],
          track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.72, action: 'Idle_Loop' }, { at: 0, action: 'G_carry', layer: true }],
        },
      ],
      props: [{ id: 'stack', type: 'box_stack', params: { n: 7 }, hold: { char: 'alex', bone: 'DEF-hand.R', from: 0, offset: [0.02, 0.09, -0.03], rot: [0, 0, 0] }, anim: { type: 'wobble', amp: 0.06 } }],
    },
  },
  {
    id: 'ed-04-slice',
    title: 'Every Single Slice',
    seconds: 2.4,
    narration: 'Every. Single. Slice.',
    highlights: ['every', 'single', 'slice'],
    people: [1, 1],
    music: 'driving',
    emotion: 'playful',
    sfx: [{ sfx: 'bite_crunch', atRatio: 0.45, volume: 0.6 }],
    shot: {
      set: 'kitchen',
      camera: CAM([0, -2.9, 0.95], [0, 0, 0.72], [0, -2.6, 0.95], [0, 0, 0.74], 70, { char: 'alex', fstop: 2.2 }),
      chars: [{ id: 'alex', x: 0, y: 0, face: 0, speaker: true, track: [{ at: 0, action: 'G_eatL' }] }],
      props: [
        { id: 'slice', type: 'slice', scale: 1.35, show: [0, 0.45], hold: { char: 'alex', bone: 'DEF-hand.L', from: 0, aimMouth: true } },
        { id: 'slice_b', type: 'slice_bitten', scale: 1.35, hold: { char: 'alex', bone: 'DEF-hand.L', from: 0.45, aimMouth: true } },
        { id: 'crumbs', type: 'crumbs', loc: [0.02, -0.25, 0.66], show: [0.46, null], anim: { type: 'fall', from: 0.46, speed: 0.9 } },
        { id: 'empties', type: 'box_stack', loc: [0.55, 0.35, 0], params: { n: 9 }, rot: [0, 0, 25] },
        { id: 'empties2', type: 'pizza_box', loc: [-0.5, 0.3, 0], params: { open: true }, rot: [0, 0, -20] },
      ],
    },
  },
  {
    id: 'ed-05-mayor',
    title: 'By Noon I Made Myself Mayor',
    seconds: 3.0,
    narration: 'By noon, I made myself the mayor. Nobody voted against me.',
    highlights: ['noon', 'mayor', 'nobody'],
    people: [1, 1],
    music: 'triumphant',
    emotion: 'confident',
    sfx: [{ sfx: 'sparkle_chime', atRatio: 0.55, volume: 0.5 }],
    shot: {
      set: 'park',
      camera: CAM([0, -4.0, 0.22], [0, 0.4, 0.95], [0, -3.6, 0.25], [0, 0.4, 0.98]),
      chars: [{ id: 'alex', x: 0, y: 0.45, face: 0, speaker: true, track: [{ at: 0, action: 'G_hips' }, { at: 0.5, action: 'G_cheer' }] }],
      props: [
        { id: 'podium', type: 'podium', loc: [0, 0.18, 0] },
        { id: 'mhat', type: 'sun_hat', scale: 0.9, hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 0.78, rot: [0, -6, 0] } },
        { id: 'flag', type: 'flag', hold: { char: 'alex', bone: 'DEF-hand.R', from: 0.5, offset: [0, 0, -0.02], rot: [0, 0, 0] } },
        { id: 'bunting', type: 'bunting', params: { a: [-1.7, 1.4, 1.95], b: [1.7, 1.4, 1.95], n: 11, sag: 0.18 } },
        { id: 'balloon1', type: 'balloon', loc: [-0.85, 0.9, 0], params: { color: '#F28AA0', shade: '#D96C84', h: 1.3 }, anim: { type: 'bob' } },
        { id: 'balloon2', type: 'balloon', loc: [0.9, 1.0, 0], params: { color: '#7FC8F8', shade: '#5EA8D8', h: 1.45 }, anim: { type: 'bob', phase: 2 } },
      ],
    },
  },
  {
    id: 'ed-06-dance',
    title: 'Three Hours of Street Dancing',
    seconds: 3.6,
    narration: 'I danced in the middle of the street. For three whole hours.',
    highlights: ['danced', 'street', 'three', 'hours'],
    people: [1, 1],
    music: 'driving',
    emotion: 'playful',
    shot: {
      set: 'street',
      time: 'evening',
      camera: CAM([0.0, -4.6, 2.7], [0, 0.1, 0.35], [0.0, -4.0, 2.4], [0, 0.1, 0.4]),
      chars: [{ id: 'alex', x: 0, y: 0, face: 0, speaker: true, track: [{ at: 0, action: 'Dance_Loop' }] }],
      props: [
        { id: 'tlight', type: 'traffic_light', loc: [0.8, 0.55, 0], rot: [0, 0, -10], anim: { type: 'blink', period: 30 } },
        { id: 'paper', type: 'newspaper', loc: [-0.6, -0.2, 0.01], rot: [0, 0, 30], scale: 1.2 },
      ],
    },
  },
  {
    id: 'ed-07-night',
    title: 'The Silence Got Really Loud',
    seconds: 3.4,
    narration: 'But at night... the silence got really, really loud. I missed everyone.',
    highlights: ['night', 'silence', 'loud', 'missed'],
    pad: 0.25,
    people: [1, 1],
    music: 'gentle',
    emotion: 'sad',
    sfx: [{ sfx: 'sigh_down', atRatio: 0.75, volume: 0.5 }],
    shot: {
      set: 'home',
      time: 'night',
      camera: CAM([0, -4.4, 0.75], [0, 0.2, 0.5], [0, -3.7, 0.72], [0, 0.2, 0.52], 70, { char: 'alex', fstop: 2.8 }),
      chars: [{ id: 'alex', x: 0, y: 0.2, face: 0, speaker: true, track: [{ at: 0, action: 'Sitting_Idle_Loop' }, { at: 0.35, action: 'Sitting_Talking_Loop' }] }],
      props: [
        { id: 'sofa', type: 'mini_sofa', loc: [0, 0.2, 0] },
        { id: 'box1', type: 'pizza_box', loc: [-0.55, -0.15, 0], params: { open: true }, rot: [0, 0, -25] },
        { id: 'box2', type: 'pizza_box', loc: [0.6, -0.05, 0], rot: [0, 0, 15] },
        { id: 'box3', type: 'pizza_box', loc: [0.62, -0.03, 0.045], rot: [0, 0, 40] },
      ],
    },
  },
  {
    id: 'ed-08-door',
    title: 'A Noise Behind Granny’s Door',
    seconds: 3.4,
    narration: "Then I heard a sound. Coming from behind Granny's door.",
    highlights: ['heard', 'sound', 'granny'],
    people: [1, 1],
    music: 'suspense',
    emotion: 'suspense',
    sfx: [{ sfx: 'tick', atRatio: 0.35, volume: 0.4 }, { sfx: 'tick', atRatio: 0.55, volume: 0.4 }],
    shot: {
      set: 'street',
      time: 'night',
      camera: CAM([0.8, -1.8, 1.05], [0.1, 2.2, 0.55], [0.65, -1.0, 0.98], [0.1, 2.2, 0.52], 60, { char: 'alex', fstop: 3.2 }),
      chars: [
        {
          id: 'alex', speaker: true, path: [[0, -0.35, 0.9, 150], [0.55, 0.05, 1.75, 175], [0.7, 0.07, 1.8, 180]],
          track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.55, action: 'G_think' }],
        },
      ],
      props: [
        { id: 'glow', type: 'door_glow', loc: [0.1, 2.285, 0] },
      ],
    },
  },
  {
    id: 'ed-085-open',
    title: 'I Slowly Opened the Door',
    seconds: 2.6,
    narration: 'I slowly opened the door...',
    highlights: ['slowly', 'door'],
    people: [1, 1],
    music: 'suspense',
    emotion: 'suspense',
    shot: {
      set: 'street',
      time: 'night',
      hide: ['T2_', 'L1_', 'L2_'],
      camera: CAM([2.75, 1.8, 0.95], [0.1, 2.05, 0.68], [2.45, 1.82, 0.92], [0.1, 2.06, 0.68], 45, { char: 'alex', fstop: 2.8 }),
      chars: [{ id: 'alex', x: 0.05, y: 1.88, face: 180, speaker: true, track: [{ at: 0, action: 'G_think' }, { at: 0.35, action: 'Interact' }] }],
      props: [{ id: 'glow', type: 'door_glow', loc: [0.1, 2.285, 0] }],
    },
  },
  {
    id: 'ed-09-surprise',
    title: 'SURPRISE — It Was My Birthday',
    seconds: 3.6,
    narration: 'SURPRISE! They were all hiding... for my birthday party.',
    highlights: ['surprise', 'hiding', 'birthday'],
    people: [1, 5],
    music: 'triumphant',
    emotion: 'warm_triumph',
    sfx: [{ sfx: 'pop', atRatio: 0.05, volume: 0.7 }, { sfx: 'sparkle_chime', atRatio: 0.1, volume: 0.6 }],
    shot: {
      set: 'home',
      time: 'party',
      camera: CAM([0, -5.8, 1.55], [0, 0.4, 0.68], [0, -5.1, 1.45], [0, 0.4, 0.7]),
      chars: [
        { id: 'chloe', x: -0.82, y: 0.45, face: 20, track: [{ at: 0, action: 'G_cheer' }, { at: 0.45, action: 'Dance_Loop' }] },
        { id: 'mayor', x: 0.75, y: 0.5, face: -20, track: [{ at: 0, action: 'G_cheer' }] },
        { id: 'chef', x: 0.35, y: 0.95, face: -10, track: [{ at: 0, action: 'Jump_Loop' }, { at: 0.5, action: 'G_wave' }] },
        { id: 'granny', x: -0.42, y: 0.7, face: 15, track: [{ at: 0, action: 'Idle_Loop' }, { at: 0, action: 'G_carry', layer: true }] },
        { id: 'alex', x: 0.15, y: -0.1, face: -10, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.55, action: 'G_cheer' }] },
      ],
      props: [
        ...PARTY_ROOM,
        { id: 'cake', type: 'cake', scale: 1.1, hold: { char: 'granny', bone: 'DEF-hand.R', from: 0, offset: [0.07, 0.0, -0.02], rot: [0, 0, 0] }, anim: { type: 'flicker' } },
        HAT('chloe', '#7FC8F8', '#FFD45E', [0, 10, 0]),
        HAT('mayor', '#9BE39A', '#F28AA0'),
        HAT('chef', '#FFD45E', '#7FC8F8', [0, -8, 0]),
        HAT('granny', '#B58CE0', '#FFD45E'),
        HAT('alex', '#F28AA0', '#FFD45E', [0, 6, 0]),
        { id: 'pigeon', type: 'pigeon', loc: [0.95, 0.5, 0.26], rot: [0, 0, 200], scale: 1.3, anim: { type: 'flap', until: 0.4 } },
        { id: 'confetti', type: 'confetti', loc: [0, 0.3, 0], params: { n: 110, box: [2.2, 1.2, 1.4], z0: 0.8, seed: 8 }, anim: { type: 'fall', from: 0.02, speed: 0.38 } },
      ],
    },
  },
  {
    id: 'ed-10-loop',
    title: 'Loop — Would You Have Found Them Sooner?',
    seconds: 3.4,
    narration: 'Best birthday ever. Would YOU have found them sooner?',
    highlights: ['best', 'birthday', 'you', 'sooner'],
    people: null,
    topTitle: 'EVERYONE GONE? 😶',
    music: 'outro',
    emotion: 'playful',
    shot: {
      set: 'home',
      time: 'party',
      camera: CAM([0, -3.3, 0.9], [0, 0, 0.72], [0, -3.0, 0.9], [0, 0, 0.74], 70, { char: 'alex', fstop: 2.0 }),
      chars: [
        { id: 'alex', x: 0, y: 0, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.45, action: 'G_point' }] },
        { id: 'chloe', x: -0.75, y: 1.1, face: 20, track: [{ at: 0, action: 'Dance_Loop' }] },
        { id: 'granny', x: 0.7, y: 1.2, face: -20, track: [{ at: 0, action: 'Dance_Loop', offset: 12 }] },
      ],
      props: [
        ...PARTY_ROOM,
        HAT('alex', '#F28AA0', '#FFD45E', [0, 6, 0]),
        HAT('chloe', '#7FC8F8', '#FFD45E', [0, 10, 0]),
        HAT('granny', '#B58CE0', '#FFD45E'),
        { id: 'table', type: 'table', loc: [0.42, 0.1, 0] },
        { id: 'cake', type: 'cake', loc: [0.42, 0.1, 0.44], anim: { type: 'flicker' } },
        { id: 'confetti', type: 'confetti', loc: [0, 0.3, 0], params: { n: 70, box: [1.8, 1.0, 1.2], z0: 0.5, seed: 12 }, anim: { type: 'drift', speed: 0.06 } },
      ],
    },
  },
];

export const EVERYONE_GONE_SCENES: SceneScript[] = BEATS.map((b, i) => {
  const { illustration: _drop, shot: _s, ...base } = BASE;
  return {
    ...base,
    sceneNumber: i + 1,
    id: b.id,
    title: b.title,
    targetDurationSeconds: b.seconds,
    padAfterSeconds: b.pad ?? 0.45,
    narration: b.narration,
    emotion: b.emotion ?? 'playful',
    voiceSettings: V,
    hud: { captionHighlights: b.highlights, ...(b.topTitle ? { topTitle: b.topTitle, topTitleTone: 'white' as const } : {}) },
    experimentOverlay: b.people ? { gauge: { label: 'PEOPLE LEFT', startVal: b.people[0], endVal: b.people[1] } } : {},
    soundEffects: b.sfx ?? [],
    thoughtBubbles: [],
    smokePoofs: [],
    musicEnergy: b.music ?? 'gentle',
    transition: i === 0 ? 'zoom_punch' : 'cut',
    speaker: 'alex',
    shot: b.shot,
    visualObjective: b.title,
  } as SceneScript;
});
