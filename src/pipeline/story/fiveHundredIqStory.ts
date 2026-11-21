import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';

/**
 * First V3 story (REFERENCE_STYLE_BIBLE_V3.md):
 * - Topic from YouTube autocomplete demand: "what if you have 500 iq"
 * - First-person POV narrated by Alex (his mouth talks via `speaker`)
 * - Payoff stated in the first 3 s ("…and lost every single friend"), then rewind
 * - Persistent stake: FRIENDS counter 12 → 0, then back up in the twist
 * - Ends on the opening title card so the Short loops
 */
export const FIVE_HUNDRED_IQ_CONCEPT: StoryConcept = {
  id: 'five-hundred-iq-v1',
  title: 'What If You Woke Up With 500 IQ?',
  centralPremise:
    'Alex wakes up with 500 IQ. In one day he finishes his homework in 0.3 seconds, fixes the economy and "optimizes" everything around him—while his FRIENDS counter drops from 12 to 0. The twist: the smartest move was being a little dumber.',
  openingHook: 'Alex at the city crosswalk, eyes wide, as a "500 IQ? 🧠" card slams down and a brain-emoji burst explodes.',
  mainCharacter: 'Alex (narrates in first person; gets smarter and lonelier all day).',
  supportingCharacters: [
    'Chloe (best friend, increasingly done with him)',
    'Mayor (throws Alex a parade)',
    'Chef (whose pizza Alex "optimizes" into a grey cube)',
    'Granny (the one who welcomes him back)',
  ],
  environment: 'Existing City Experiment world: crosswalk, signboard plaza, golden-hour party deck, cozy interior.',
  conflict: 'Every genius move makes his life "better" and his friends fewer.',
  escalation: 'Homework in 0.3 s → corrects best friend twice → fixes the economy → turns pizza into a cube → explains a sunset during the sunset (FRIENDS 12 → 0).',
  climax: 'A red UNFRIENDED stamp slams as the counter hits 0 on the sunset deck.',
  ending: 'He makes himself a little dumber; the FRIENDS counter climbs back, then the 500 IQ? card asks the viewer if they would take it.',
  emotionalObjective: 'Fast POV comedy with a satisfying "smart vs. happy" twist in ~32 seconds.',
  visualStorytellingOpportunities: [
    '500 IQ? title card slam with brain-emoji burst',
    'FRIENDS counter ticking down every scene',
    'Mayor parade with SOLVED ✓ stamp',
    'Red UNFRIENDED stamp on the sunset deck',
  ],
  musicStyle: 'funky',
  captionStyle: 'storytime',
  visualStyle: 'storytime',
  styleVersion: 'v3',
  renderMode: 'illustrated',
  illustrationStyle:
    'Warm, painterly 2D digital cartoon illustration in a cozy cinematic storybook style, for a vertical 9:16 YouTube Short. Soft warm lighting with a gentle glow, shallow depth of field with a softly blurred background, rich saturated colors, smooth painterly shading, clean dark-brown outlines. Characters are cute, simple cartoon people with big round cream-colored heads, small dot eyes with expressive eyebrows, tiny noses, small mouths, simple hair, and thin stick-like arms and legs, wearing colorful clothes. Character designs: Alex is a young man with short spiky brown hair and a navy-blue hoodie (in some scenes a white lab coat over it, or a black party top hat). Chloe is a young woman with red hair in a top bun and a green dress. The Mayor wears a wide white sun hat, black sunglasses and a cream suit. The Chef wears a tall white chef hat and a white chef jacket with gold buttons. Granny has a grey hair bun and a purple cardigan.',
};

const ENV = {
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
  worldTheme: 'city_experiment' as const,
  citySignTitle: 'SOLVED',
  citySignSubtitle: 'THE ECONOMY\n(BY ALEX)',
  cityFlagText: '500 IQ',
  cityChaosCars: false,
  cityPartySpeakers: false,
  cityMoneyRain: false,
  interiorWifiBroken: false,
  rainActive: false,
};

const V = { stability: 0.55, similarityBoost: 0.8, style: 0.3, speed: 0.95 };
type V3 = [number, number, number];
const CROSS = { startPosition: [0, 2.0, 11.0] as V3, endPosition: [0, 1.95, 10.0] as V3, startLookAt: [0, 1.7, 4.2] as V3, endLookAt: [0, 1.7, 4.2] as V3, fov: 42 };
const GATE = { startPosition: [26.0, 2.05, 7.4] as V3, endPosition: [26.0, 2.0, 6.7] as V3, startLookAt: [26.0, 1.75, 0.6] as V3, endLookAt: [26.0, 1.75, 0.6] as V3, fov: 44 };
const ROOM = { startPosition: [-28.2, 2.0, 4.0] as V3, endPosition: [-28.3, 1.95, 3.4] as V3, startLookAt: [-28.4, 1.6, -0.5] as V3, endLookAt: [-28.4, 1.6, -0.5] as V3, fov: 46 };
const DECK = { startPosition: [26.0, 2.0, -22.4] as V3, endPosition: [26.0, 1.95, -23.2] as V3, startLookAt: [26.0, 1.6, -29.0] as V3, endLookAt: [26.0, 1.6, -29.0] as V3, fov: 42 };

export const FIVE_HUNDRED_IQ_SCENES: SceneScript[] = [
  {
    sceneNumber: 1,
    id: 'iq-01-hook',
    title: 'Hook — I Woke Up With 500 IQ',
    targetDurationSeconds: 2.4,
    padAfterSeconds: 0.32,
    narration: 'I woke up with five hundred IQ.',
    emotion: 'energetic',
    voiceSettings: V,
    camera: { ...CROSS, movement: 'dolly_in', impacts: [0.1] },
    lightingPreset: 'daylight',
    hud: {
      captionHighlights: ['five', 'hundred', 'iq'],
    },
    illustration: {
      prompt:
        'Medium close-up of Alex in his navy hoodie standing on a sunny European city crosswalk, eyes wide open in amazement, a faint golden glow and tiny sparkles around his head as if his brain just powered up. Pastel buildings and a turquoise-domed cathedral softly blurred behind him.',
      motion: 'push_in',
      focus: [0.5, 0.62],
      mouth: { x: 0.508, y: 0.665, w: 0.045, coverW: 0.05, skin: '#FBE6B1' },
    },
    characters: [
      { characterId: 'alex', position: [0, 0, 4.4], facing: 'front', expression: 'surprised', secondaryExpression: 'excited', expressionSwitchRatio: 0.45, pose: 'idle', secondaryPose: 'celebrating', poseSwitchRatio: 0.45, outfit: 'default', visible: true, scale: 1.05 },
    ],
    speaker: 'alex',
    environment: { ...ENV },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: [
      { sfx: 'sparkle_chime', atRatio: 0.48, volume: 0.65 },
    ],
    musicEnergy: 'driving',
    transition: 'zoom_punch',
    visualObjective: 'Alex jolts awake-eyed at the crosswalk, then pops into a celebration as brain emojis burst under the 500 IQ? card.',
  },
  {
    sceneNumber: 2,
    id: 'iq-02-payoff',
    title: 'Open Loop — Fixed the Economy, Lost Every Friend',
    targetDurationSeconds: 3.4,
    padAfterSeconds: 0.32,
    narration: "By dinner, I'd fixed the economy... and lost every single friend.",
    emotion: 'playful',
    voiceSettings: V,
    camera: { ...CROSS, movement: 'static_subtle_push' },
    lightingPreset: 'storm_rain',
    hud: { captionHighlights: ['economy', 'every', 'friend'] },
    illustration: {
      prompt:
        'Rainy evening city street with warm street-lamp glow and blue rain. Alex stands alone in the foreground, worried, shrugging. In the soft-focus background Chloe walks away with her back turned.',
      motion: 'pull_out',
      focus: [0.497, 0.624],
      mouth: { x: 0.511, y: 0.666, w: 0.04, coverW: 0.083, skin: '#FAE4AC' },
    },
    characters: [
      { characterId: 'alex', position: [-0.8, 0, 4.4], facing: 'front', expression: 'proud', secondaryExpression: 'worried', expressionSwitchRatio: 0.5, pose: 'hands_on_hips', secondaryPose: 'shrugging', poseSwitchRatio: 0.5, outfit: 'default', visible: true, scale: 1 },
      { characterId: 'chloe', position: [1.4, 0, 4.2], endPosition: [4.6, 0, 3.6], moveStartRatio: 0.45, moveEndRatio: 1, facing: 'right', expression: 'skeptical', pose: 'idle', outfit: 'default', visible: true, scale: 1 },
    ],
    speaker: 'alex',
    environment: { ...ENV, rainActive: true },
    experimentOverlay: { gauge: { label: 'FRIENDS', startVal: 12, endVal: 0 } },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: [
      { sfx: 'sigh_down', atRatio: 0.7, volume: 0.6 },
    ],
    musicEnergy: 'suspense',
    transition: 'cut',
    visualObjective: 'Rainy crosswalk: Alex goes from proud to worried as Chloe walks away and the FRIENDS counter drains to 0.',
  },
  {
    sceneNumber: 3,
    id: 'iq-03-homework',
    title: '8 AM — Homework in 0.3 Seconds',
    targetDurationSeconds: 3.0,
    padAfterSeconds: 0.32,
    narration: 'Eight AM: homework, done in point three seconds.',
    emotion: 'energetic',
    voiceSettings: V,
    camera: { ...ROOM, movement: 'punch_in' },
    lightingPreset: 'indoor_cozy',
    hud: { captionHighlights: ['eight', 'point', 'three'] },
    illustration: {
      prompt:
        'Cozy bedroom at 8 AM lit by a warm desk lamp. Alex in a white lab coat sits at his desk grinning, next to a tall stack of finished homework, with a glowing lightbulb floating above his head.',
      motion: 'push_in',
      focus: [0.49, 0.612],
      mouth: { x: 0.51, y: 0.658, w: 0.046, coverW: 0.145, skin: '#FAE4AC' },
    },
    characters: [
      { characterId: 'alex', position: [-28.5, 0, -0.4], facing: 'front', expression: 'excited', pose: 'pointing', secondaryPose: 'hands_on_hips', poseSwitchRatio: 0.55, outfit: 'lab_coat', visible: true, scale: 1 },
    ],
    speaker: 'alex',
    environment: { ...ENV },
    experimentOverlay: { gauge: { label: 'FRIENDS', startVal: 12, endVal: 12 } },
    thoughtBubbles: [{ id: 'iq3-bulb', anchorCharacter: 'alex', kind: 'lightbulb', startAtRatio: 0.2, endAtRatio: 0.98 }],
    smokePoofs: [{ worldPosition: [-28.5, 1.7, -0.4], triggerAtRatio: 0.05, scale: 0.9 }],
    soundEffects: [
      { sfx: 'poof', atRatio: 0.05, volume: 0.5 },
      { sfx: 'ding', atRatio: 0.55, volume: 0.65 },
    ],
    musicEnergy: 'driving',
    transition: 'white_flash',
    visualObjective: 'White-flash rewind into the cozy room: Alex poofs into a lab coat, a lightbulb pops over his head.',
  },
  {
    sceneNumber: 4,
    id: 'iq-04-grammar',
    title: "Noon — Corrected My Best Friend's Grammar",
    targetDurationSeconds: 3.0,
    padAfterSeconds: 0.32,
    narration: "Noon: I corrected my best friend's grammar. Twice.",
    emotion: 'playful',
    voiceSettings: V,
    camera: { ...CROSS, movement: 'dolly_in' },
    lightingPreset: 'daylight',
    hud: { captionHighlights: ['twice'] },
    illustration: {
      prompt:
        'Sunny city sidewalk. Alex in a white lab coat points a finger and lectures Chloe, who rolls her eyes with her arms crossed. Both characters visible from the knees up.',
      motion: 'pan_right',
      focus: [0.36, 0.523],
      mouth: { x: 0.369, y: 0.532, w: 0.035, coverW: 0.041, skin: '#FCE4A8' },
    },
    characters: [
      { characterId: 'alex', position: [-1.0, 0, 4.4], facing: 'right', expression: 'proud', pose: 'pointing', outfit: 'lab_coat', visible: true, scale: 1 },
      { characterId: 'chloe', position: [1.0, 0, 4.4], facing: 'left', expression: 'happy', secondaryExpression: 'skeptical', expressionSwitchRatio: 0.5, pose: 'idle', secondaryPose: 'hands_on_hips', poseSwitchRatio: 0.7, outfit: 'default', visible: true, scale: 1 },
    ],
    speaker: 'alex',
    environment: { ...ENV },
    experimentOverlay: { gauge: { label: 'FRIENDS', startVal: 12, endVal: 9 } },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: [
    ],
    musicEnergy: 'driving',
    transition: 'whip_pan',
    visualObjective: 'Alex points at Chloe mid-sentence; her smile turns into an eye-roll as the FRIENDS counter drops to 9.',
  },
  {
    sceneNumber: 5,
    id: 'iq-05-economy',
    title: '2 PM — Fixed the Economy, Mayor Parade',
    targetDurationSeconds: 3.0,
    padAfterSeconds: 0.32,
    narration: 'Two PM: I fixed the economy. The mayor threw me a parade.',
    emotion: 'energetic',
    voiceSettings: V,
    camera: { ...GATE, movement: 'dolly_in' },
    lightingPreset: 'daylight',
    hud: { captionHighlights: ['economy', 'parade'] },
    illustration: {
      prompt:
        'Town plaza celebration with confetti and paper money falling. The Mayor cheers with both arms up. Alex in a white lab coat stands proudly beside him in front of a large blank signboard (the sign has no writing).',
      motion: 'drift_up',
      focus: [0.702, 0.636],
      mouth: { x: 0.718, y: 0.678, w: 0.028, coverW: 0.083, skin: '#FAE0A7' },
    },
    characters: [
      { characterId: 'alex', position: [25.4, 0, 1.4], facing: 'front', expression: 'proud', pose: 'hands_on_hips', outfit: 'lab_coat', visible: true, scale: 1 },
      { characterId: 'mayor', position: [26.7, 0, 1.4], facing: 'left', expression: 'excited', pose: 'holding_cash', secondaryPose: 'celebrating', poseSwitchRatio: 0.55, outfit: 'sunglasses_hat', visible: true, scale: 1.05 },
    ],
    speaker: 'alex',
    environment: { ...ENV, cityMoneyRain: true },
    experimentOverlay: {
      gauge: { label: 'FRIENDS', startVal: 9, endVal: 7 }
    },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: [
    ],
    musicEnergy: 'triumphant',
    transition: 'cut',
    visualObjective: 'Money rains at the SOLVED signboard; a green SOLVED ✓ stamp slams while the Mayor celebrates.',
  },
  {
    sceneNumber: 6,
    id: 'iq-06-pizza-cube',
    title: "4 PM — Optimized the Chef's Pizza",
    targetDurationSeconds: 3.2,
    padAfterSeconds: 0.32,
    narration: "Four PM: I optimized the chef's pizza... into a grey cube.",
    emotion: 'playful',
    voiceSettings: V,
    camera: { ...ROOM, movement: 'dolly_in' },
    lightingPreset: 'indoor_cozy',
    hud: { captionHighlights: ['grey', 'cube'] },
    illustration: {
      prompt:
        'Cozy restaurant kitchen. The Chef stares in horror at a perfectly smooth grey cube sitting on a pizza plate on the counter. Alex in a white lab coat stands beside him looking proud.',
      motion: 'push_in',
      focus: [0.754, 0.478],
      mouth: { x: 0.746, y: 0.518, w: 0.026, coverW: 0.073, skin: '#FCE4AA' },
    },
    characters: [
      { characterId: 'alex', position: [-28.95, 0, -0.6], facing: 'right', expression: 'proud', pose: 'pointing', outfit: 'lab_coat', visible: true, scale: 0.92 },
      { characterId: 'chef', position: [-27.75, 0, -0.6], facing: 'left', expression: 'surprised', secondaryExpression: 'worried', expressionSwitchRatio: 0.66, pose: 'idle', secondaryPose: 'slumped_tired', poseSwitchRatio: 0.66, outfit: 'chef_hat', visible: true, scale: 1 },
    ],
    speaker: 'alex',
    environment: { ...ENV },
    experimentOverlay: { gauge: { label: 'FRIENDS', startVal: 7, endVal: 4 } },
    thoughtBubbles: [],
    smokePoofs: [{ worldPosition: [-27.35, 0.9, 0.1], triggerAtRatio: 0.6, scale: 0.35 }],
    soundEffects: [
      { sfx: 'poof', atRatio: 0.6, volume: 0.6 },
      { sfx: 'sigh_down', atRatio: 0.75, volume: 0.6 },
    ],
    musicEnergy: 'suspense',
    transition: 'cut',
    visualObjective: 'The chef gasps, a poof turns his pizza into a cube, and he slumps as ice-cube emojis burst.',
  },
  {
    sceneNumber: 7,
    id: 'iq-07-sunset',
    title: '6 PM — Explained the Sunset During the Sunset',
    targetDurationSeconds: 3.4,
    padAfterSeconds: 0.32,
    narration: 'Six PM: I explained how sunsets work... during the sunset.',
    emotion: 'playful',
    voiceSettings: V,
    camera: { ...DECK, movement: 'dolly_in' },
    lightingPreset: 'sunset_golden',
    hud: { captionHighlights: ['during', 'sunset'] },
    illustration: {
      prompt:
        'Rooftop deck at golden sunset. Alex in a white lab coat points enthusiastically at the setting sun, explaining, while Chloe beside him looks exhausted and bored with drooping eyes.',
      motion: 'pan_left',
      focus: [0.383, 0.508],
      mouth: { x: 0.397, y: 0.548, w: 0.026, coverW: 0.049, skin: '#FCD39D' },
    },
    characters: [
      { characterId: 'alex', position: [25.2, 0, -29.0], facing: 'right', expression: 'excited', pose: 'pointing', outfit: 'lab_coat', visible: true, scale: 1 },
      { characterId: 'chloe', position: [26.9, 0, -29.0], facing: 'left', expression: 'peaceful', secondaryExpression: 'exhausted', expressionSwitchRatio: 0.45, pose: 'idle', secondaryPose: 'slumped_tired', poseSwitchRatio: 0.6, outfit: 'default', visible: true, scale: 1 },
    ],
    speaker: 'alex',
    environment: { ...ENV, showSparkles: true },
    experimentOverlay: {
      gauge: { label: 'FRIENDS', startVal: 4, endVal: 0 }
    },
    thoughtBubbles: [],
    smokePoofs: [],
    soundEffects: [
    ],
    musicEnergy: 'suspense',
    transition: 'cut',
    visualObjective: 'Golden sunset deck: Alex lectures, Chloe wilts, FRIENDS hits 0 and a red UNFRIENDED stamp slams.',
  },
  {
    sceneNumber: 8,
    id: 'iq-08-twist',
    title: 'Twist — Being a Little Dumber',
    targetDurationSeconds: 3.4,
    padAfterSeconds: 0.32,
    narration: 'So I made myself a little dumber. Best idea I ever had.',
    emotion: 'warm_triumph',
    voiceSettings: { ...V, speed: 0.93 },
    camera: { ...DECK, movement: 'orbit_gentle' },
    lightingPreset: 'sunset_golden',
    hud: { captionHighlights: ['dumber', 'best'] },
    illustration: {
      prompt:
        'Rooftop deck at golden sunset with warm string lights. Alex, now wearing a black party top hat instead of the lab coat, laughs and dances with Chloe (wearing sunglasses) and Granny. Joyful, warm and glowing.',
      motion: 'pull_out',
      focus: [0.281, 0.518],
      mouth: { x: 0.285, y: 0.561, w: 0.026, coverW: 0.048, skin: '#FCD099' },
    },
    characters: [
      { characterId: 'alex', position: [25.0, 0, -29.0], facing: 'front', expression: 'neutral', secondaryExpression: 'happy', expressionSwitchRatio: 0.35, pose: 'shrugging', secondaryPose: 'dancing_party', poseSwitchRatio: 0.55, outfit: 'lab_coat', secondaryOutfit: 'top_hat', outfitSwitchRatio: 0.35, visible: true, scale: 1 },
      { characterId: 'chloe', position: [26.0, 0, -29.0], facing: 'front', expression: 'skeptical', secondaryExpression: 'excited', expressionSwitchRatio: 0.55, pose: 'idle', secondaryPose: 'dancing_party', poseSwitchRatio: 0.6, outfit: 'cool_shades', visible: true, scale: 1 },
      { characterId: 'granny', position: [27.0, 0, -29.0], facing: 'front', expression: 'happy', pose: 'celebrating', outfit: 'default', visible: true, scale: 0.95 },
    ],
    speaker: 'alex',
    environment: { ...ENV, showSparkles: true },
    experimentOverlay: { gauge: { label: 'FRIENDS', startVal: 0, endVal: 12 } },
    thoughtBubbles: [],
    smokePoofs: [{ worldPosition: [25.0, 1.8, -29.0], triggerAtRatio: 0.33, scale: 0.8 }],
    soundEffects: [
      { sfx: 'poof', atRatio: 0.33, volume: 0.55 },
    ],
    musicEnergy: 'triumphant',
    transition: 'white_flash',
    visualObjective: 'Alex poofs from lab coat to party top hat; Chloe and Granny dance with him as FRIENDS climbs back to 12.',
  },
  {
    sceneNumber: 9,
    id: 'iq-09-loop',
    title: 'Loop — Would You Take 500 IQ?',
    targetDurationSeconds: 2.8,
    padAfterSeconds: 0.7,
    narration: 'Would you take five hundred IQ?',
    emotion: 'curious',
    voiceSettings: V,
    camera: { ...CROSS, movement: 'dolly_in' },
    lightingPreset: 'daylight',
    hud: { captionHighlights: ['five', 'hundred', 'iq'] },
    illustration: {
      prompt:
        'Close-up of Alex in a black party top hat on the sunny city crosswalk, shrugging with a curious, questioning half-smile, looking straight at the viewer.',
      motion: 'push_in',
      focus: [0.508, 0.625],
      mouth: { x: 0.508, y: 0.665, w: 0.045, coverW: 0.05, skin: '#FBE6B1' },
    },
    characters: [
      { characterId: 'alex', position: [0, 0, 4.4], facing: 'front', expression: 'happy', secondaryExpression: 'surprised', expressionSwitchRatio: 0.6, pose: 'shrugging', outfit: 'top_hat', visible: true, scale: 1.05 },
    ],
    speaker: 'alex',
    environment: { ...ENV },
    thoughtBubbles: [{ id: 'iq9-q', anchorCharacter: 'alex', kind: 'question', startAtRatio: 0.3, endAtRatio: 0.98 }],
    smokePoofs: [],
    soundEffects: [{ sfx: 'ding', atRatio: 0.4, volume: 0.6 }],
    musicEnergy: 'outro',
    transition: 'cut',
    visualObjective: 'Back to the opening crosswalk framing and the same 500 IQ? card so the Short loops into scene 1.',
  },
];
