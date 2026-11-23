import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';

export const PRISON_IQ_CONCEPT: StoryConcept = {
  id: 'prison-iq-v1',
  title: 'What If You Had Infinite IQ In Prison?',
  centralPremise:
    'Ravi is locked in prison with infinite IQ. On night one he counts 347 bricks by the echo of rain; by morning he knows every guard routine and the laundry blind spot to walk out in eleven minutes. Instead, he solves the warden’s impossible puzzle, saves a guard, and legally proves his innocence. But freedom outside is so mind-numbingly slow that after seven days, he turns himself back in—the only place his brain isn’t bored.',
  openingHook:
    'In a dark stone prison cell lit by a moonlight beam and rain streaks, cell bars frame Ravi whose eyes lock onto the camera as a PRISON IQ: ∞ 🧠 card slams down.',
  mainCharacter: 'Ravi (calm genius in prison jumpsuit #347; narrating with infinite mental focus).',
  supportingCharacters: [
    'Warden (stern authority in dark navy suit, stunned by Ravi’s puzzle solution)',
    'Guard (slate-blue uniform, saved from a falling beam)',
    'Mayor (citizen talking in painfully slow motion)',
    'Chloe (friend talking in slow syrup)',
  ],
  environment:
    'Procedural cel-shaded 3D Prison sets: dark stone brick cell with barred window & rain, industrial laundry room, mahogany warden’s office with puzzle box, massive iron security gates, and city street.',
  conflict: 'Escaping prison is easy (11 minutes), but surviving the unbearable slow-motion outside world is impossible.',
  escalation:
    'Count 347 bricks by rain echo → map guard patrols & laundry blind spot → 11-minute escape ready → solve warden puzzle → prove 10-year cold case innocence → gates open → outside world talks like slow syrup → boredom hits 100% → voluntary return.',
  climax: 'Free in the outside city, people talk so painfully slow Ravi falls asleep mid-sentence on a park bench.',
  ending:
    'Ravi walks back through the rain and presses the prison intercom to return—the only place complex enough to keep his brain alive.',
  emotionalObjective:
    'A gripping, atmospheric ~38-second storytime Short with moody cell lighting, tactical prison blueprints, satisfying genius deductions, and an ironic intellectual twist.',
  visualStorytellingOpportunities: [
    'Night rain dripping with echo rings counting 347 bricks on HUD gauge',
    'Sweeping searchlight in laundry room revealing the safe blind spot',
    'Warden puzzle box snapping open with green SOLVED ✓ stamp',
    'Massive sliding iron gates opening into golden blinding daylight',
    'Hilarious slow-motion speech clock and ZZZ thought bubble',
    'Rain-soaked return to the prison intercom with a satisfied smile',
  ],
  musicStyle: 'documentary',
  captionStyle: 'storytime',
  visualStyle: 'storytime',
  styleVersion: 'v3',
  renderMode: 'three',
};

const BASE_PRISON_ENV = {
  samBarrelFill: 0,
  mayaBarrelFill: 0,
  mayaBigBucket: false,
  leoPipeProgress: 0,
  leoEstateUpgraded: false,
  waterFlowing: false,
  showHelpSign: false,
  showHeroBucket: false,
  showSparkles: false,
  showSubscribeCta: false,
  samRunningLoop: false,
  worldTheme: 'prison' as const,
  rainActive: true,
  prisonState: {
    zone: 'cell' as const,
    barsVisible: true,
    rainStreaks: true,
    cellLightOn: false,
    puzzleSolved: false,
    gatesOpenRatio: 0,
    laundrySearchlight: false,
    searchlightAngle: 0,
    evidenceBoardActive: false,
    clockSpeed: 1.0,
    intercomBuzzing: false,
  },
};

const V = { stability: 0.55, similarityBoost: 0.82, style: 0.32, speed: 0.98 };

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
  shot: Shot;
  gauge?: { label: string; startVal: number; endVal: number; suffix?: string };
  stamp?: { text: string; color: 'red' | 'green'; atRatio: number };
  topTitle?: string;
  topTitleTone?: 'green' | 'yellow' | 'red';
  music?: SceneScript['musicEnergy'];
  emotion?: SceneScript['emotion'];
  sfx?: SceneScript['soundEffects'];
  setAnim?: Shot['setAnim'];
  pad?: number;
}

const BEATS: Beat[] = [
  // 1. Hook
  {
    id: 'prison-01-hook',
    title: 'Hook — Infinite IQ In Prison',
    seconds: 3.4,
    narration: 'What if you had infinite IQ, but you were locked in prison?',
    highlights: ['infinite', 'IQ', 'prison'],
    topTitle: 'PRISON IQ: ∞ 🧠',
    topTitleTone: 'yellow',
    emotion: 'curious',
    music: 'suspense',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.05, volume: 0.55 },
      { sfx: 'impact_boom', atRatio: 0.2, volume: 0.7 },
      { sfx: 'splash', atRatio: 0.6, volume: 0.5 },
    ],
    shot: {
      set: 'prison',
      time: 'night',
      camera: CAM([0.22, -3.2, 0.85], [0.22, 0.3, 0.65], [0.22, -2.5, 0.82], [0.22, 0.3, 0.65], 65, { char: 'ravi', fstop: 2.5 }),
      chars: [
        { id: 'ravi', x: 0.22, y: 0.3, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.5, action: 'G_think' }] },
      ],
      props: [{ id: 'bricks', type: 'brick_stack', loc: [0.8, 0.6, 0] }],
    },
  },

  // 2. Night One — Counting 347 Bricks
  {
    id: 'prison-02-rain-bricks',
    title: 'Night One — 347 Bricks by Rain Echo',
    seconds: 4.2,
    narration: 'On his first night, Ravi counted 347 bricks through the tiny window, just by the echo of rain.',
    highlights: ['347', 'bricks', 'echo', 'rain'],
    gauge: { label: 'BRICKS COUNTED', startVal: 0, endVal: 347, suffix: '' },
    emotion: 'suspense',
    music: 'driving',
    sfx: [
      { sfx: 'splash', atRatio: 0.15, volume: 0.65 },
      { sfx: 'tick', atRatio: 0.35, volume: 0.6 },
      { sfx: 'sparkle_chime', atRatio: 0.75, volume: 0.6 },
    ],
    shot: {
      set: 'prison',
      time: 'night',
      hide: ['IronBar', 'Bar_'],
      camera: CAM([0.4, -2.4, 0.35], [0, 0.4, 0.95], [-0.2, -1.8, 0.45], [0, 0.4, 1.15], 60, { char: 'ravi', fstop: 2.8 }),
      chars: [
        { id: 'ravi', x: 0, y: 0.4, face: 25, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.35, action: 'G_point' }, { at: 0.7, action: 'G_think' }] },
      ],
      props: [{ id: 'bricks', type: 'brick_stack', loc: [-0.9, 0.8, 0] }],
    },
  },

  // 3. Morning — Guard Patrols & Laundry Blind Spot
  {
    id: 'prison-03-guard-patrol',
    title: 'Morning — Guard Patrols and the Laundry Blind Spot',
    seconds: 4.2,
    narration: "By morning, he'd memorized every guard's patrol, every lock, and the one blind spot behind the laundry room.",
    highlights: ['memorized', 'patrol', 'lock', 'blind spot'],
    emotion: 'curious',
    music: 'driving',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.2, volume: 0.5 },
      { sfx: 'tick', atRatio: 0.55, volume: 0.65 },
    ],
    shot: {
      set: 'laundry',
      time: 'day',
      camera: CAM([-0.35, -2.0, 0.92], [-0.1, 0.15, 0.62], [-0.3, -1.75, 0.9], [-0.1, 0.15, 0.62], 48),
      chars: [
        { id: 'guard', path: [[0, -1.6, 0.6, 90], [0.5, 0.0, 0.6, 90], [1, 1.6, 0.6, 90]], track: [{ at: 0, action: 'Walk_Loop' }] },
        { id: 'ravi', path: [[0, -0.6, -0.2, 20], [0.4, -0.6, -0.2, 20], [0.75, -0.2, 0.1, 15], [1, -0.2, 0.1, 15]], track: [{ at: 0, action: 'Crouch_Idle_Loop' }, { at: 0.4, action: 'Crouch_Fwd_Loop' }, { at: 0.75, action: 'Crouch_Idle_Loop' }], speaker: true },
      ],
    },
  },

  // 4. Walk Out In 11 Minutes
  {
    id: 'prison-04-eleven-minutes',
    title: 'The Choice — Walk Out In 11 Minutes',
    seconds: 2.2,
    narration: 'He could have walked out in eleven minutes.',
    highlights: ['walked', 'eleven', 'minutes'],
    gauge: { label: 'ESCAPE TIME', startVal: 60, endVal: 11, suffix: ' MIN' },
    emotion: 'confident',
    music: 'suspense',
    sfx: [
      { sfx: 'impact_boom', atRatio: 0.35, volume: 0.7 },
      { sfx: 'tick', atRatio: 0.5, volume: 0.6 },
    ],
    shot: {
      set: 'prison',
      time: 'day',
      hide: ['IronBar', 'Bar_'],
      camera: CAM([0, -2.4, 0.85], [0, 0.1, 0.65], [0, -2.0, 0.82], [0, 0.1, 0.65], 65, { char: 'ravi', fstop: 2.2 }),
      chars: [
        { id: 'ravi', path: [[0, 0, 0.8, 0], [0.45, 0, 0.1, 0], [1, 0, 0.1, 0]], speaker: true, track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.45, action: 'G_snap' }, { at: 0.75, action: 'G_shrug' }] },
      ],
    },
  },

  // 5. Warden's Impossible Puzzle & Predicted Injury
  {
    id: 'prison-05-puzzle-injury',
    title: 'Warden Puzzle & Guard Saved',
    seconds: 4.4,
    narration: "Instead, he used his brain to do something smarter. He solved the warden's impossible puzzle, and predicted a guard's injury.",
    highlights: ['smarter', 'impossible', 'puzzle', 'predicted', 'injury'],
    stamp: { text: 'SOLVED ✓', color: 'green', atRatio: 0.42 },
    emotion: 'energetic',
    music: 'triumphant',
    sfx: [
      { sfx: 'wood_snap', atRatio: 0.42, volume: 0.75 },
      { sfx: 'ding', atRatio: 0.48, volume: 0.7 },
      { sfx: 'sparkle_chime', atRatio: 0.75, volume: 0.6 },
    ],
    setAnim: [
      { name: 'beam_main', type: 'drop', from: 3.2, to: 0.15, gravity: 0.024, bounce: 0.3, start: 0.38, end: 0.9 },
    ],
    shot: {
      set: 'office',
      time: 'day',
      camera: CAM([0, -4.0, 1.15], [0, 0.65, 0.75], [0.15, -3.6, 1.12], [0.1, 0.65, 0.75], 55, { char: 'ravi', fstop: 2.8 }),
      chars: [
        { id: 'ravi', x: -0.6, y: -0.15, face: 25, speaker: true, track: [{ at: 0, action: 'Interact' }, { at: 0.35, action: 'G_point' }, { at: 0.7, action: 'G_hips' }] },
        { id: 'warden', x: 0.35, y: 1.45, face: -20, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.42, action: 'G_facepalm' }] },
        { id: 'guard', path: [[0, 0.85, 0.15, -25], [0.36, 0.85, 0.15, -25], [0.55, 0.45, -0.2, -15], [1, 0.45, -0.2, -15]], track: [{ at: 0, action: 'Idle_Loop' }, { at: 0.36, action: 'Jump_Start' }, { at: 0.6, action: 'G_cheer' }] },
      ],
      props: [
        { id: 'puzzle', type: 'puzzle_box', loc: [0.05, 0.95, 0.72], scale: 1.2 },
        { id: 'beam', type: 'beam', loc: [0.85, 0.15, 0.0] },
      ],
    },
  },

  // 6. Proved Innocence Clues Missed 10 Years
  {
    id: 'prison-06-proven-innocent',
    title: 'Proved Innocence — Clues Missed 10 Years',
    seconds: 3.8,
    narration: 'And proved his own innocence using clues everyone else had missed for ten years.',
    highlights: ['proved', 'innocence', 'missed', 'ten', 'years'],
    stamp: { text: 'INNOCENT ✓', color: 'green', atRatio: 0.45 },
    emotion: 'warm_triumph',
    music: 'triumphant',
    sfx: [
      { sfx: 'impact_boom', atRatio: 0.45, volume: 0.75 },
      { sfx: 'crowd_cheer', atRatio: 0.65, volume: 0.6 },
    ],
    shot: {
      set: 'office',
      time: 'day',
      camera: CAM([0, -3.2, 0.95], [0, 0.4, 0.65], [0, -2.8, 0.92], [0, 0.4, 0.65], 60, { char: 'ravi', fstop: 2.4 }),
      chars: [
        { id: 'ravi', path: [[0, -0.45, -0.2, 20], [0.5, -0.2, 0.4, 20], [1, -0.2, 0.4, 20]], speaker: true, track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.5, action: 'G_point' }, { at: 0.8, action: 'G_cheer' }] },
        { id: 'warden', x: 0.35, y: 1.45, face: -20, track: [{ at: 0, action: 'G_think' }, { at: 0.55, action: 'G_wave' }] },
      ],
      props: [{ id: 'casefile', type: 'case_file', hold: { char: 'ravi', bone: 'DEF-hand.L', from: 0 } }],
    },
  },

  // 7. Gates Open — Walks Free
  {
    id: 'prison-07-gates-open',
    title: 'Freedom — The Gates Open',
    seconds: 2.2,
    narration: 'The gates open. He walks free.',
    highlights: ['gates', 'open', 'walks', 'free'],
    emotion: 'energetic',
    music: 'triumphant',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.1, volume: 0.6 },
      { sfx: 'impact_boom', atRatio: 0.18, volume: 0.55 },
      { sfx: 'sparkle_chime', atRatio: 0.4, volume: 0.65 },
    ],
    setAnim: [
      { name: 'GatePanel_L', type: 'slide', axis: 'x', from: 0, to: -1.4, start: 0.05, end: 0.55 },
      { name: 'GatePanel_R', type: 'slide', axis: 'x', from: 0, to: 1.4, start: 0.05, end: 0.55 },
    ],
    shot: {
      set: 'gates',
      time: 'day',
      camera: CAM([0, -2.6, 0.95], [0, 1.4, 0.85], [0, -1.8, 0.92], [0, 1.8, 0.85], 50),
      chars: [
        { id: 'ravi', path: [[0, 0, 0.2, 180], [0.55, 0, 1.8, 180], [1, 0, 3.4, 180]], track: [{ at: 0, action: 'Walk_Formal_Loop' }], speaker: true },
      ],
    },
  },

  // 8. Outside World in Slow Motion
  {
    id: 'prison-08-slow-motion',
    title: 'The Real Problem — Outside World in Slow Motion',
    seconds: 3.6,
    narration: 'But outside, bus drivers, shopkeepers, even his own family...',
    highlights: ['outside', 'family'],
    emotion: 'sad',
    music: 'gentle',
    sfx: [
      { sfx: 'tick', atRatio: 0.3, volume: 0.5 },
      { sfx: 'sigh_down', atRatio: 0.8, volume: 0.6 },
    ],
    setAnim: [
      { name: 'clock_main', type: 'slowTick', step: 8 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([-0.2, -4.2, 0.85], [0, 0.3, 0.62], [0.2, -3.6, 0.82], [0, 0.3, 0.62], 65, { char: 'ravi', fstop: 2.8 }),
      chars: [
        { id: 'ravi', x: -0.4, y: 0.15, face: 25, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.45, action: 'G_think' }] },
        { id: 'mayor', x: 0.45, y: 0.2, face: -30, track: [{ at: 0, action: 'Idle_Talking_Loop', speed: 0.25 }] },
      ],
      props: [{ id: 'clock', type: 'clock_prop', loc: [0.0, 0.5, 1.5], rot: [90, 0, 0], scale: 1.4 }],
    },
  },

  // 9. Falls Asleep Before One Sentence Ends
  {
    id: 'prison-09-falls-asleep',
    title: 'Boredom Peaks — Asleep Before One Sentence',
    seconds: 3.6,
    narration: '...all talk so slowly he falls asleep before they finish one sentence.',
    highlights: ['slowly', 'asleep', 'one', 'sentence'],
    gauge: { label: 'BOREDOM LEVEL', startVal: 20, endVal: 100, suffix: '%' },
    emotion: 'sad',
    music: 'suspense',
    sfx: [
      { sfx: 'sigh_down', atRatio: 0.3, volume: 0.7 },
      { sfx: 'boing', atRatio: 0.6, volume: 0.5 },
    ],
    shot: {
      set: 'park',
      time: 'day',
      camera: CAM([0, -3.6, 0.75], [0, 0.2, 0.52], [0, -3.0, 0.72], [0, 0.2, 0.52], 65, { char: 'ravi', fstop: 2.2 }),
      chars: [
        { id: 'ravi', x: -0.35, y: 0.36, face: 0, speaker: true, sleepFrom: 0.4, track: [{ at: 0, action: 'Sitting_Talking_Loop' }, { at: 0.35, action: 'Sitting_Idle_Loop', speed: 0.5 }] },
        { id: 'chloe', x: 0.45, y: 0.25, face: -35, track: [{ at: 0, action: 'Idle_Talking_Loop', speed: 0.25 }] },
      ],
      props: [{ id: 'bench', type: 'mini_sofa', loc: [-0.35, 0.2, 0] }],
    },
  },

  // 10. One Week Later — Turns Back In
  {
    id: 'prison-10-turns-back-in',
    title: 'One Week Later — Turns Himself Back In',
    seconds: 2.8,
    narration: 'After one week, Ravi turns himself back in...',
    highlights: ['one', 'week', 'turns', 'back'],
    stamp: { text: 'VOLUNTARY RETURN', color: 'green', atRatio: 0.5 },
    emotion: 'confident',
    music: 'driving',
    sfx: [
      { sfx: 'splash', atRatio: 0.1, volume: 0.6 },
      { sfx: 'ui_click', atRatio: 0.5, volume: 0.8 },
      { sfx: 'impact_boom', atRatio: 0.55, volume: 0.7 },
    ],
    shot: {
      set: 'gates',
      time: 'night',
      camera: CAM([0.7, -2.0, 0.95], [0.35, 1.1, 0.75], [0.55, -1.6, 0.92], [0.35, 1.1, 0.75], 55, { char: 'ravi', fstop: 2.6 }),
      chars: [
        { id: 'ravi', path: [[0, -0.2, 0.4, 25], [0.55, 0.35, 0.85, 15], [1, 0.35, 0.85, 15]], track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.55, action: 'Interact' }], speaker: true },
      ],
      props: [{ id: 'buzzer', type: 'intercom', loc: [0.45, 0.9, 1.0], scale: 2.2 }],
    },
  },

  // 11. Ending Loop — Finally Not Bored
  {
    id: 'prison-11-never-bored-loop',
    title: 'Ending Loop — The Only Place Not Bored',
    seconds: 4.0,
    narration: "...not because he wanted prison, but because it was the only place where his brain finally wasn't bored.",
    highlights: ['only', 'place', 'brain', 'never', 'bored'],
    topTitle: 'PRISON IQ: ∞ 🧠',
    topTitleTone: 'yellow',
    emotion: 'warm_triumph',
    music: 'outro',
    sfx: [
      { sfx: 'sparkle_chime', atRatio: 0.45, volume: 0.65 },
      { sfx: 'ding', atRatio: 0.75, volume: 0.6 },
    ],
    shot: {
      set: 'prison',
      time: 'night',
      camera: CAM([0, -2.6, 0.85], [0, 0.2, 0.65], [0, -3.2, 0.90], [0, 0.2, 0.65], 65, { char: 'ravi', fstop: 2.4 }),
      chars: [
        { id: 'ravi', x: 0, y: 0.2, face: 0, speaker: true, track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.45, action: 'G_point' }, { at: 0.75, action: 'G_cheer' }] },
      ],
    },
  },
];

export const PRISON_IQ_SCENES: SceneScript[] = BEATS.map((b, i) => {
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
    lightingPreset: b.shot.time === 'night' ? 'storm_rain' : 'daylight',
    hud: {
      captionHighlights: b.highlights,
      ...(b.topTitle ? { topTitle: b.topTitle, topTitleTone: b.topTitleTone ?? 'yellow' } : {}),
      ...(i === 0 ? { emojiBurst: { emoji: '⛓️', atRatio: 0.45, count: 8 } } : {}),
      ...(i === 10 ? { emojiBurst: { emoji: '🧠', atRatio: 0.6, count: 10 } } : {}),
    },
    experimentOverlay: {
      ...(b.gauge ? { gauge: b.gauge } : {}),
      ...(b.stamp ? { stamp: b.stamp } : {}),
    },
    characters: [
      {
        characterId: 'ravi',
        position: [0, 0, 0.8],
        facing: 'front',
        expression: 'neutral',
        pose: 'hands_on_hips',
        outfit: 'default',
        visible: true,
        scale: 1.05,
      },
    ],
    speaker: 'ravi',
    environment: {
      ...BASE_PRISON_ENV,
      rainActive: b.shot.time === 'night',
      prisonState: {
        ...BASE_PRISON_ENV.prisonState,
        zone: b.shot.set === 'laundry' ? 'laundry' : b.shot.set === 'office' ? 'warden_office' : b.shot.set === 'gates' ? 'gates' : b.shot.set === 'street' || b.shot.set === 'park' ? 'city_street' : 'cell',
      },
    },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: b.sfx ?? [],
    musicEnergy: b.music ?? 'driving',
    transition: i === 0 ? 'zoom_punch' : 'cut',
    shot: b.setAnim ? { ...b.shot, setAnim: b.setAnim } : b.shot,
    visualObjective: b.title,
  } as SceneScript;
});
