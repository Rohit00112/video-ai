import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { FREEZE_TIME_CONCEPT, FREEZE_TIME_SCENES } from './freezeTimeStory.js';

/**
 * What If Everyone Became Invisible?
 * 3D Cel-shaded Blender Story #4
 *
 * Story Arc:
 * 1. Hook: Town street, floating sunglasses & floating coffee cup walking by.
 * 2. Morning Routine: Floating coffee mug taking sips at the cafe counter in front of shocked Chef.
 * 3. Commute: Sidewalk bumper cars, invisible Alex crashes into invisible Mayor (briefcase & coffee collide).
 * 4. Failed Heist: Burglar tries to rob bank, but a giant sack of cash is floating down Main Street!
 * 5. Town Emergency: Mayor's emergency speech at empty podium; sudden sneeze shakes podium!
 * 6. Neon Paint Solution: Everyone paints themselves in glowing electric neon stickman silhouettes!
 * 7. The Night Twist: At 9 PM the spell wears off — everyone unhides caught in silly bunny pajamas!
 * 8. Outro & Loop: Interactive Engagement Poll + Subscribe CTA + narrative loop.
 */
export const EVERYONE_INVISIBLE_CONCEPT: StoryConcept = {
  ...FREEZE_TIME_CONCEPT,
  id: 'everyone-invisible-v1',
  styleVersion: undefined,
  title: 'What If Everyone Became Invisible?',
  centralPremise:
    'A funny hypothetical story about a town where nobody can see anyone. Morning coffee floats in mid-air, walking the sidewalk becomes bumper cars, a bank robbery fails because of a floating money sack, until neon paint solves the chaos—and the spell suddenly wears off at 9 PM.',
  openingHook: 'What if one morning... everyone in your town woke up completely invisible?',
  mainCharacter: 'Alex (narrates the town experience).',
  supportingCharacters: ['Chloe', 'Mayor', 'Chef', 'Guard'],
  environment: 'Toon town street (day & evening), kitchen, park stage.',
  conflict: 'Nobody can see anyone, turning everyday life into slapstick chaos.',
  escalation: 'Coffee theft → sidewalk collisions → failed bank heist → emergency sneeze → neon paint parade.',
  climax: 'At 9:00 PM, the invisibility spell suddenly wears off and reveals ridiculous pajamas.',
  ending: 'Alex asks viewers what they would do if invisible for 24 hours (Disney vs Pizza Heist) with subscribe CTA.',
  emotionalObjective: 'Hilarious, fast-paced slapstick humor with high viral retention and visual delight.',
  visualStorytellingOpportunities: [
    'Floating sunglasses and steaming coffee walking down the sidewalk',
    'Mid-air coffee sips and floating donut bites',
    'Sidewalk collision with bouncing briefcase and top hat',
    'Floating burlap money sack sprinting from a guard',
    'Podium microphone sneeze blowback',
    'Glowing neon painted character silhouettes celebrating',
    'Instant pajama reveal unhiding twist',
    'Engaging outro poll card and animated subscribe button',
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
  // 1. Hook: Everyone In Your Town Woke Up Invisible
  {
    id: 'invis-01-hook',
    title: 'Hook — Everyone In Town Woke Up Invisible',
    seconds: 3.8,
    narration: 'What if one morning... everyone in your town woke up completely invisible?',
    highlights: ['morning', 'everyone', 'completely', 'invisible'],
    topTitle: 'INVISIBLE? 👻',
    topTitleTone: 'yellow',
    emotion: 'curious',
    music: 'suspense',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.05, volume: 0.6 },
      { sfx: 'sparkle_chime', atRatio: 0.5, volume: 0.65 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([0, -4.5, 0.78], [0, 0.3, 0.65], [0, -3.8, 0.78], [0, 0.3, 0.65], 55),
      chars: [
        {
          id: 'alex',
          invisible: true,
          speaker: true,
          path: [[0, -1.4, 0.3, 85], [1, 1.2, 0.3, 85]],
          track: [{ at: 0, action: 'Walk_Loop' }],
        },
        {
          id: 'chloe',
          invisible: true,
          path: [[0, 1.4, 0.7, -85], [1, -1.0, 0.7, -85]],
          track: [{ at: 0, action: 'Walk_Loop' }],
        },
      ],
      props: [
        { id: 'sg', type: 'sunglasses', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 0.82, rot: [0, 0, 0] } },
        { id: 'coffee', type: 'coffee_cup', hold: { char: 'alex', bone: 'DEF-hand.R', from: 0, offset: [0.02, 0.08, -0.02] } },
        { id: 'shat', type: 'sun_hat', scale: 0.9, hold: { char: 'chloe', bone: 'DEF-head', from: 0, onHead: 0.82 } },
        { id: 'tlight', type: 'traffic_light', loc: [-1.2, 0.8, 0], rot: [0, 0, 10], anim: { type: 'blink', period: 30 } },
      ],
    },
  },

  // 2. Coffee Theft: Mid-air Phantom Sips
  {
    id: 'invis-02-coffee-theft',
    title: 'Morning Routine — Phantom Coffee Sips',
    seconds: 3.6,
    narration: "At 8:00 AM, nobody could find their coffee... because someone else's invisible hand was already drinking it!",
    highlights: ['coffee', 'someone', 'drinking', 'mid-air'],
    topTitle: 'PHANTOM SIPS ☕',
    topTitleTone: 'yellow',
    emotion: 'playful',
    music: 'driving',
    sfx: [
      { sfx: 'impact_boom', atRatio: 0.1, volume: 0.45 },
      { sfx: 'boing', atRatio: 0.55, volume: 0.6 },
    ],
    shot: {
      set: 'kitchen',
      time: 'day',
      camera: CAM([0.1, -3.2, 0.92], [0, 0.2, 0.72], [0.0, -2.7, 0.92], [0, 0.2, 0.72], 65),
      chars: [
        {
          id: 'chef',
          x: -0.55,
          y: 0.3,
          face: 25,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.55, action: 'G_facepalm' }],
        },
        {
          id: 'alex',
          invisible: true,
          speaker: true,
          x: 0.45,
          y: 0.25,
          face: -30,
          track: [{ at: 0, action: 'G_eatL' }, { at: 0.65, action: 'G_cheer' }],
        },
      ],
      props: [
        { id: 'sip_cup', type: 'coffee_cup', hold: { char: 'alex', bone: 'DEF-hand.L', from: 0, offset: [0.02, 0.08, -0.02] } },
        { id: 'donut', type: 'donut', loc: [0.38, 0.22, 0.85], anim: { type: 'bob', amp: 0.03 } },
        { id: 'crumbs', type: 'crumbs', loc: [0.38, 0.20, 0.80], show: [0.45, null], anim: { type: 'fall', from: 0.45, speed: 0.9 } },
      ],
    },
  },

  // 3. Sidewalk Bumper Cars
  {
    id: 'invis-03-sidewalk-bump',
    title: 'Commute — Sidewalk Bumper Cars',
    seconds: 3.8,
    narration: "Walking down the sidewalk became bumper cars. People apologized to empty lampposts, while crashing into the invisible Mayor!",
    highlights: ['bumper', 'cars', 'crashing', 'mayor'],
    gauge: { label: 'COLLISIONS', startVal: 0, endVal: 99, suffix: '+' },
    emotion: 'energetic',
    music: 'driving',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.2, volume: 0.5 },
      { sfx: 'impact_boom', atRatio: 0.44, volume: 0.8 },
      { sfx: 'boing', atRatio: 0.62, volume: 0.65 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([0, -3.8, 0.80], [0, 0.15, 0.62], [0, -3.2, 0.80], [0, 0.15, 0.62], 55),
      chars: [
        {
          id: 'mayor',
          invisible: true,
          path: [[0, -1.2, 0.15, 90], [0.44, -0.08, 0.15, 90], [0.55, -0.25, 0.15, 45], [1, -0.25, 0.15, 45]],
          track: [{ at: 0, action: 'Walk_Formal_Loop' }, { at: 0.44, action: 'Hit_Head' }, { at: 0.7, action: 'G_shrug' }],
        },
        {
          id: 'alex',
          invisible: true,
          speaker: true,
          path: [[0, 1.2, 0.15, -90], [0.44, 0.08, 0.15, -90], [0.55, 0.25, 0.15, -45], [1, 0.25, 0.15, -45]],
          track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.44, action: 'Hit_Chest' }, { at: 0.7, action: 'G_wave' }],
        },
      ],
      props: [
        { id: 'mhat', type: 'sun_hat', scale: 0.95, hold: { char: 'mayor', bone: 'DEF-head', from: 0, onHead: 0.82, rot: [0, 15, 0] } },
        { id: 'mcase', type: 'briefcase', scale: 0.9, hold: { char: 'mayor', bone: 'DEF-hand.R', from: 0 } },
        { id: 'alex_sg', type: 'sunglasses', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 0.82 } },
        { id: 'alex_mug', type: 'coffee_cup', hold: { char: 'alex', bone: 'DEF-hand.R', from: 0, offset: [0.02, 0.08, -0.02] } },
      ],
    },
  },

  // 4. Failed Bank Heist
  {
    id: 'invis-04-bank-heist',
    title: 'Crime — The Failed Bank Heist',
    seconds: 3.8,
    narration: "Crime dropped to zero. A burglar tried to rob the bank... but you can't be sneaky when a giant sack of cash is floating down Main Street!",
    highlights: ['burglar', 'bank', 'sneaky', 'giant', 'cash'],
    topTitle: 'SNEAK LEVEL: 0 💰',
    topTitleTone: 'yellow',
    stamp: { text: 'HEIST FAILED 🚨', color: 'red', atRatio: 0.52 },
    emotion: 'energetic',
    music: 'driving',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.1, volume: 0.5 },
      { sfx: 'impact_boom', atRatio: 0.52, volume: 0.75 },
      { sfx: 'ui_click', atRatio: 0.55, volume: 0.6 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([0.3, -3.8, 0.75], [0.2, 0.2, 0.62], [0.5, -3.2, 0.75], [0.3, 0.2, 0.62], 50),
      chars: [
        {
          id: 'alex',
          invisible: true,
          speaker: true,
          path: [[0, -1.8, 0.15, 90], [1, 1.8, 0.15, 90]],
          track: [{ at: 0, action: 'Sprint_Loop' }],
        },
        {
          id: 'guard',
          x: -1.8,
          y: 0.2,
          face: 90,
          path: [[0, -2.6, 0.2, 90], [1, 0.8, 0.2, 90]],
          track: [{ at: 0, action: 'Jog_Fwd_Loop' }, { at: 0.65, action: 'G_point' }],
        },
      ],
      props: [
        { id: 'money', type: 'money_sack', scale: 1.15, hold: { char: 'alex', bone: 'DEF-hand.R', from: 0, offset: [0.03, 0.1, -0.05] } },
      ],
    },
  },

  // 5. Town Emergency Meeting Sneeze
  {
    id: 'invis-05-mayor-speech',
    title: 'Emergency — The Town Meeting Sneeze',
    seconds: 3.8,
    narration: 'By noon, the Mayor called an emergency town meeting... but nobody knew where the podium was until he sneezed!',
    highlights: ['mayor', 'emergency', 'meeting', 'sneezed'],
    topTitle: 'TOWN MEETING 📢',
    topTitleTone: 'yellow',
    emotion: 'suspense',
    music: 'suspense',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.15, volume: 0.4 },
      { sfx: 'impact_boom', atRatio: 0.54, volume: 0.8 },
      { sfx: 'boing', atRatio: 0.62, volume: 0.6 },
    ],
    shot: {
      set: 'park',
      time: 'day',
      camera: CAM([0, -3.0, 0.88], [0, 0.1, 0.72], [0, -2.5, 0.88], [0, 0.1, 0.72], 60),
      chars: [
        {
          id: 'mayor',
          invisible: true,
          speaker: true,
          x: 0,
          y: 0.35,
          face: 0,
          track: [{ at: 0, action: 'G_hips' }, { at: 0.5, action: 'Hit_Head' }, { at: 0.75, action: 'G_shrug' }],
        },
      ],
      props: [
        { id: 'podium', type: 'podium', loc: [0, 0.12, 0] },
        { id: 'mic', type: 'microphone_stand', loc: [0, 0.12, 0.78] },
        { id: 'mhat', type: 'sun_hat', scale: 0.95, hold: { char: 'mayor', bone: 'DEF-head', from: 0, onHead: 0.82 } },
        { id: 'papers', type: 'confetti', loc: [0, 0.2, 0.7], show: [0.52, null], params: { n: 25, box: [1.2, 0.6, 0.8] }, anim: { type: 'flutter' } },
      ],
    },
  },

  // 6. Neon Paint Solution
  {
    id: 'invis-06-paint-parade',
    title: 'Solution — The Neon Paint Parade',
    seconds: 3.8,
    narration: 'The solution? The town bought every can of neon paint in the state. Suddenly, everyone became walking glowing stickmen!',
    highlights: ['solution', 'neon', 'paint', 'glowing', 'stickmen'],
    gauge: { label: 'VISIBILITY', startVal: 0, endVal: 100, suffix: '%' },
    emotion: 'confident',
    music: 'triumphant',
    sfx: [
      { sfx: 'splash', atRatio: 0.15, volume: 0.7 },
      { sfx: 'sparkle_chime', atRatio: 0.45, volume: 0.7 },
      { sfx: 'crowd_cheer', atRatio: 0.65, volume: 0.65 },
    ],
    shot: {
      set: 'street',
      time: 'day',
      camera: CAM([0, -4.0, 0.85], [0, 0.25, 0.68], [0, -3.3, 0.85], [0, 0.25, 0.68], 50),
      chars: [
        {
          id: 'alex',
          paintColor: '#00FFFF',
          speaker: true,
          x: -0.4,
          y: 0.2,
          face: 15,
          track: [{ at: 0, action: 'Walk_Loop' }, { at: 0.5, action: 'G_wave' }],
        },
        {
          id: 'chloe',
          paintColor: '#FF1493',
          x: 0.4,
          y: 0.2,
          face: -15,
          track: [{ at: 0, action: 'Dance_Loop' }],
        },
        {
          id: 'chef',
          paintColor: '#39FF14',
          x: 0.0,
          y: 0.55,
          face: 0,
          track: [{ at: 0, action: 'G_cheer' }],
        },
      ],
      props: [
        { id: 'p_bucket1', type: 'paint_bucket', scale: 0.9, hold: { char: 'alex', bone: 'DEF-hand.L', from: 0 }, params: { color: '#00FFFF' } },
        { id: 'p_bucket2', type: 'paint_bucket', scale: 0.9, hold: { char: 'chloe', bone: 'DEF-hand.R', from: 0 }, params: { color: '#FF1493' } },
        { id: 'balloon1', type: 'balloon', loc: [-1.2, 1.2, 0], params: { color: '#00FFFF', shade: '#00CCCC', h: 1.35 }, anim: { type: 'bob' } },
        { id: 'balloon2', type: 'balloon', loc: [1.2, 1.3, 0], params: { color: '#FF1493', shade: '#CC0077', h: 1.45 }, anim: { type: 'bob', phase: 1.5 } },
      ],
    },
  },

  // 7. Night Twist: Invisibility Spell Wears Off
  {
    id: 'invis-07-spell-wears-off',
    title: 'The Twist — Spell Wears Off',
    seconds: 3.8,
    narration: "It was a total blast... until 9:00 PM, when the invisibility suddenly wore off... and everyone realized what they'd been wearing all day.",
    highlights: ['blast', 'wore', 'off', 'wearing', 'all', 'day'],
    topTitle: 'SPELL BROKE! 😳',
    topTitleTone: 'red',
    stamp: { text: 'EMBARRASSING 🐰', color: 'red', atRatio: 0.55 },
    emotion: 'playful',
    music: 'driving',
    sfx: [
      { sfx: 'whoosh', atRatio: 0.45, volume: 0.5 },
      { sfx: 'impact_boom', atRatio: 0.55, volume: 0.75 },
      { sfx: 'record_scratch', atRatio: 0.65, volume: 0.65 },
    ],
    shot: {
      set: 'street',
      time: 'evening',
      camera: CAM([0, -3.5, 0.85], [0, 0.2, 0.65], [0, -3.0, 0.85], [0, 0.2, 0.65], 55),
      chars: [
        {
          id: 'alex',
          invisible: true,
          unhideAt: 0.52,
          speaker: true,
          x: -0.4,
          y: 0.2,
          face: 20,
          track: [{ at: 0, action: 'Idle_Talking_Loop' }, { at: 0.52, action: 'G_facepalm' }],
        },
        {
          id: 'chloe',
          invisible: true,
          unhideAt: 0.52,
          x: 0.4,
          y: 0.2,
          face: -20,
          track: [{ at: 0, action: 'Idle_Loop' }, { at: 0.52, action: 'G_shrug' }],
        },
        {
          id: 'mayor',
          invisible: true,
          unhideAt: 0.52,
          x: 0.0,
          y: 0.45,
          face: 0,
          track: [{ at: 0, action: 'Idle_Loop' }, { at: 0.52, action: 'Hit_Head' }],
        },
      ],
      props: [
        { id: 'phat', type: 'party_hat', hold: { char: 'alex', bone: 'DEF-head', from: 0, onHead: 0.82 } },
        { id: 'mhat', type: 'sun_hat', hold: { char: 'mayor', bone: 'DEF-head', from: 0, onHead: 0.82 } },
      ],
    },
  },

  // 8. Viral Outro & Engagement Loop
  {
    id: 'invis-08-outro-loop',
    title: 'Ending — Interactive Poll & Subscribe Loop',
    seconds: 4.8,
    narration: "If YOU were invisible for 24 hours, what's the FIRST thing you'd do? Sneak into Disney, or free pizza heist? Comment below... and subscribe before you turn invisible too!",
    highlights: ['first', 'thing', 'disney', 'free', 'pizza', 'comment', 'subscribe'],
    emotion: 'warm_triumph',
    music: 'outro',
    sfx: [
      { sfx: 'sparkle_chime', atRatio: 0.35, volume: 0.65 },
      { sfx: 'ding', atRatio: 0.46, volume: 0.75 },
      { sfx: 'ui_click', atRatio: 0.68, volume: 0.8 },
    ],
    shot: {
      set: 'park',
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
        { id: 'balloon1', type: 'balloon', loc: [-0.95, 0.9, 0], params: { color: '#F28AA0', shade: '#D96C84', h: 1.35 }, anim: { type: 'bob' } },
        { id: 'balloon2', type: 'balloon', loc: [0.95, 1.0, 0], params: { color: '#7FC8F8', shade: '#5EA8D8', h: 1.45 }, anim: { type: 'bob', phase: 2 } },
      ],
    },
  },
];

export const EVERYONE_INVISIBLE_SCENES: SceneScript[] = BEATS.map((b, i) => {
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
    lightingPreset: b.shot.time === 'evening' ? 'sunset_golden' : 'daylight',
    hud: {
      captionHighlights: b.highlights,
      ...(b.topTitle ? { topTitle: b.topTitle, topTitleTone: b.topTitleTone ?? 'yellow' } : {}),
      ...(i === 0 ? { emojiBurst: { emoji: '👻', atRatio: 0.45, count: 8 } } : {}),
      ...(i === 7
        ? {
            emojiBurst: { emoji: '👻', atRatio: 0.4, count: 12 },
            engagementPoll: {
              question: 'WHAT WOULD YOU DO? 👻',
              optionA: '🅰️ SNEAK INTO DISNEY 🎢',
              optionB: '🅱️ FREE PIZZA HEIST 🍕',
              atRatio: 0.45,
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
      showSubscribeCta: i === 7,
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
