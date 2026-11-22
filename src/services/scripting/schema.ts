import { z } from 'zod';

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const CharacterIdSchema = z.enum([
  'sam',
  'maya',
  'leo',
  'sam_kid',
  'maya_kid',
  'leo_kid',
  'finn',
  'finn_mate',
  'cora',
  'cora_mate',
  'kai',
  'kai_mate',
  'mayor',
  'alex',
  'chloe',
  'granny',
  'worker',
  'chef',
  'ravi',
  'warden',
  'guard',
]);
export type CharacterId = z.infer<typeof CharacterIdSchema>;

export const ExpressionSchema = z.enum([
  'neutral',
  'worried',
  'happy',
  'excited',
  'surprised',
  'exhausted',
  'skeptical',
  'proud',
  'peaceful',
]);
export type Expression = z.infer<typeof ExpressionSchema>;

export const PoseSchema = z.enum([
  'idle',
  'holding_bucket',
  'carrying_heavy',
  'running_bucket',
  'slumped_tired',
  'hands_on_hips',
  'building_pipe',
  'operating_valve',
  'lounging',
  'pointing',
  'celebrating',
  'watering_can',
  'shrugging',
  'holding_oar',
  'holding_map',
  'holding_spyglass',
  'holding_suitcase',
  'holding_cash',
  'holding_megaphone',
  'dancing_party',
  'covering_ears',
]);
export type Pose = z.infer<typeof PoseSchema>;

export const OutfitSchema = z.enum([
  'default',
  'worker_vest',
  'straw_hat',
  'sweatband',
  'rain_hat',
  'captain_hat',
  'harbor_vest',
  'sunglasses_hat',
  'top_hat',
  'hard_hat',
  'chef_hat',
  'cool_shades',
  'mars_suit',
  'lab_coat',
  'time_goggles',
]);
export type Outfit = z.infer<typeof OutfitSchema>;

export const EmotionSchema = z.enum([
  'curious',
  'playful',
  'energetic',
  'suspense',
  'sad',
  'confident',
  'warm_triumph',
]);
export type Emotion = z.infer<typeof EmotionSchema>;

export const CameraMovementSchema = z.enum([
  'crane_down',
  'static_subtle_push',
  'dolly_in',
  'dolly_out',
  'pan_right',
  'pan_left',
  'crane_pull_out',
  'orbit_gentle',
  'wide_pull_back',
  // Retention-focused dynamic moves
  'punch_in',
  'orbit_hero',
  'whip_reveal',
  'low_angle_rise',
  'drone_dive',
]);
export type CameraMovement = z.infer<typeof CameraMovementSchema>;

export const TransitionTypeSchema = z.enum([
  'cut',
  'whip_fade',
  'crossfade',
  'white_flash',
  'zoom_punch',
  'whip_pan',
  'glitch',
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export const SfxIdSchema = z.enum([
  'pop',
  'poof',
  'whoosh',
  'ding',
  'splash',
  'tick',
  'wood_snap',
  'water_flow',
  'sigh_down',
  'sparkle_chime',
  'ui_click',
  'impact_boom',
  'cash_register',
  'boing',
  'record_scratch',
  'riser',
  'crowd_cheer',
  'bite_crunch',
  'bird_squawk',
]);
export type SfxId = z.infer<typeof SfxIdSchema>;

export const ThoughtBubbleKindSchema = z.enum([
  'question',
  'splash_text',
  'zero_liters',
  'empty_barrel',
  'calendar',
  'lightbulb',
  'half_drop',
  'pipe_icon',
  'counter',
  'heart',
  'sweat_empty',
  'one_bucket',
  'seed_icon',
  'year_calendar',
  'roots_icon',
  'daisy_icon',
  'zero_cm',
  'blank_map',
  'secret_lock',
  'zero_fish',
  'one_boat',
  'map_pins',
  'lighthouse_icon',
  'puzzle',
  'clock',
  'zzz',
]);
export type ThoughtBubbleKind = z.infer<typeof ThoughtBubbleKindSchema>;

export const ThoughtBubbleCueSchema = z.object({
  id: z.string(),
  anchorCharacter: CharacterIdSchema.optional(),
  worldPosition: Vec3Schema.optional(),
  kind: ThoughtBubbleKindSchema,
  label: z.string().optional(),
  startAtRatio: z.number().min(0).max(1),
  endAtRatio: z.number().min(0).max(1),
  counterStart: z.number().optional(),
  counterEnd: z.number().optional(),
  counterSuffix: z.string().optional(),
});
export type ThoughtBubbleCue = z.infer<typeof ThoughtBubbleCueSchema>;

export const SmokePoofCueSchema = z.object({
  worldPosition: Vec3Schema,
  triggerAtRatio: z.number().min(0).max(1),
  scale: z.number().default(1.0),
});
export type SmokePoofCue = z.infer<typeof SmokePoofCueSchema>;

export const SfxCueSchema = z.object({
  sfx: SfxIdSchema,
  atRatio: z.number().min(0).max(1),
  volume: z.number().min(0).max(1).default(0.65),
});
export type SfxCue = z.infer<typeof SfxCueSchema>;

export const CharacterBeatSchema = z.object({
  characterId: CharacterIdSchema,
  position: Vec3Schema,
  endPosition: Vec3Schema.optional(),
  moveStartRatio: z.number().min(0).max(1).optional(),
  moveEndRatio: z.number().min(0).max(1).optional(),
  facing: z.enum(['front', 'left', 'right']).default('front'),
  expression: ExpressionSchema,
  secondaryExpression: ExpressionSchema.optional(),
  expressionSwitchRatio: z.number().min(0).max(1).optional(),
  pose: PoseSchema,
  secondaryPose: PoseSchema.optional(),
  poseSwitchRatio: z.number().min(0).max(1).optional(),
  outfit: OutfitSchema.default('default'),
  secondaryOutfit: OutfitSchema.optional(),
  outfitSwitchRatio: z.number().min(0).max(1).optional(),
  visible: z.boolean().default(true),
  scale: z.number().default(1.0),
});
export type CharacterBeat = z.infer<typeof CharacterBeatSchema>;

export const EnvironmentStateSchema = z.object({
  samBarrelFill: z.number().min(0).max(1).default(0),
  samBarrelEndFill: z.number().min(0).max(1).optional(),
  mayaBarrelFill: z.number().min(0).max(1).default(0),
  mayaBarrelEndFill: z.number().min(0).max(1).optional(),
  mayaBigBucket: z.boolean().default(false),
  leoPipeProgress: z.number().min(0).max(1).default(0),
  leoPipeEndProgress: z.number().min(0).max(1).optional(),
  leoEstateUpgraded: z.boolean().default(false),
  waterFlowing: z.boolean().default(false),
  showHelpSign: z.boolean().default(false),
  showHeroBucket: z.boolean().default(false),
  showSparkles: z.boolean().default(false),
  showSubscribeCta: z.boolean().default(false),
  samRunningLoop: z.boolean().default(false),
  // Bamboo Roots story mode props (optional so earlier stories stay concise & bit-identical)
  gardenMode: z.boolean().optional(),
  showHeroSproutPot: z.boolean().optional(),
  mayaFlowersActive: z.boolean().optional(),
  leoRootsVisible: z.boolean().optional(),
  leoBambooGrowth: z.number().min(0).max(1).optional(),
  leoBambooEndGrowth: z.number().min(0).max(1).optional(),
  leoPavilionVisible: z.boolean().optional(),
  // Coastal Harbor Community world mode props
  worldTheme: z
    .enum([
      'village',
      'harbor',
      'city_experiment',
      'space_chaos',
      'subway_chaos',
      'mars_colony',
      'dino_time',
      'gravity_town',
      'dream_city',
      'pizza_town',
      'live_footage',
      'prison',
    ])
    .optional(),
  showHeroBoat: z.boolean().optional(),
  showMapBoard: z.boolean().optional(),
  harborMapPinsProgress: z.number().min(0).max(1).optional(),
  harborMapPinsEndProgress: z.number().min(0).max(1).optional(),
  harborFleetProgress: z.number().min(0).max(1).optional(),
  harborFleetEndProgress: z.number().min(0).max(1).optional(),
  lighthouseUpgraded: z.boolean().optional(),
  finnCrateFishCount: z.number().min(0).max(1).optional(),
  coraBoatExploring: z.boolean().optional(),
  // City Experiment world mode props (RnS8S-d2aOI multi-location style)
  citySignTitle: z.string().optional(),
  citySignSubtitle: z.string().optional(),
  cityFlagText: z.string().optional(),
  cityChaosCars: z.boolean().optional(),
  cityPartySpeakers: z.boolean().optional(),
  cityMoneyRain: z.boolean().optional(),
  interiorWifiBroken: z.boolean().optional(),
  interiorThermometerLevel: z.number().min(0).max(1).optional(),
  interiorThermometerEndLevel: z.number().min(0).max(1).optional(),
  rainActive: z.boolean().optional(),
  // Space Chaos (Pigeon CEO) bespoke 3D state
  spaceState: z
    .object({
      redAlert: z.boolean().default(false),
      zeroGravity: z.boolean().default(false),
      buttonPressed: z.boolean().default(false),
      pigeonCrown: z.boolean().default(false),
      buzzFloatingOutside: z.boolean().default(false),
      showHologramChart: z.boolean().default(false),
      breadcrumbRain: z.boolean().default(false),
      pigeonPecking: z.boolean().default(false),
      donutFocus: z.boolean().default(false),
    })
    .optional(),
  // Subway Chaos (Haunted Vending Machine) bespoke 3D state
  subwayState: z
    .object({
      machineMood: z.enum(['idle', 'greedy', 'evil', 'smug']).default('idle'),
      snackDangling: z.boolean().default(false),
      machineRageShake: z.boolean().default(false),
      eruptionActive: z.boolean().default(false),
      trainPassing: z.boolean().default(false),
      flickerLights: z.boolean().default(false),
      miloPose: z.enum(['staring', 'tapping', 'panicking', 'defeated']).default('staring'),
      showTinyPretzel: z.boolean().default(false),
    })
    .optional(),
  // Mars Colony Resume Lie state (beloved stickman cast on bold-outlined 3D Mars!)
  marsState: z
    .object({
      rocketLaunching: z.boolean().default(false),
      roverRunaway: z.boolean().default(false),
      potatoesFlying: z.boolean().default(false),
      solarPanelsSpinning: z.boolean().default(false),
      waterGeyserActive: z.boolean().default(false),
      redMarsAlarm: z.boolean().default(false),
      showResumeBoard: z.boolean().default(false),
    })
    .optional(),
  // Dino Time-Travel Butterfly Effect state (beloved stickman cast in 3D Prehistoric Jungle & Dino City!)
  dinoState: z
    .object({
      zone: z.enum(['jungle', 'dino_city']).default('jungle'),
      portalActive: z.boolean().default(true),
      dinoCuriosity: z.boolean().default(false),
      phoneOnGround: z.boolean().default(false),
      volcanoErupting: z.boolean().default(false),
      showRuleSign: z.boolean().default(false),
      businessDinosActive: z.boolean().default(false),
    })
    .optional(),
  // Zero-Gravity Town Switch state
  gravityState: z
    .object({
      gravityOff: z.boolean().default(false),
      floatIntensity: z.number().min(0).max(1).default(0),
      showLeverBoard: z.boolean().default(false),
      leverBoardMode: z.enum(['on', 'off', 'no_sandwich']).default('on'),
      towerRedAlarm: z.boolean().default(false),
      tetherRopesActive: z.boolean().default(false),
      mattressPadActive: z.boolean().default(false),
      floatingWaterOrbs: z.boolean().default(false),
      floatingFood: z.boolean().default(false),
    })
    .optional(),
  // Dream Rent Tax City & Cloud World state
  dreamState: z
    .object({
      zone: z.enum(['city_night', 'dream_clouds']).default('city_night'),
      towerPulsing: z.boolean().default(true),
      towerExploding: z.boolean().default(false),
      showBillBoard: z.boolean().default(false),
      billBoardMode: z.enum(['dream_tax', 'loophole', 'canceled']).default('dream_tax'),
      espressoStandActive: z.boolean().default(false),
      dreamMode: z.enum(['luxury', 'priced', 'boring_boxes', 'celebration']).default('luxury'),
      pillowsActive: z.boolean().default(false),
    })
    .optional(),
  // Pizza Town (pizza-as-currency) bespoke 3D state
  pizzaState: z
    .object({
      heroPizzaDrop: z.boolean().default(false),
      pizzaRain: z.boolean().default(false),
      boxStackLevel: z.number().min(0).max(1).default(0),
      boxStackEndLevel: z.number().min(0).max(1).optional(),
      ovenBlazing: z.boolean().default(false),
      moldLevel: z.number().min(0).max(1).default(0),
      moldEndLevel: z.number().min(0).max(1).optional(),
      seagullHeist: z.boolean().default(false),
      vaultOpen: z.boolean().default(false),
      freezerReveal: z.boolean().default(false),
      tacoReveal: z.boolean().default(false),
      stageActive: z.boolean().default(false),
      confetti: z.boolean().default(false),
      signTitle: z.string().optional(),
      signLines: z.array(z.string()).optional(),
    })
    .optional(),
  // Prison state (Infinite IQ in Prison)
  prisonState: z
    .object({
      zone: z.enum(['cell', 'laundry', 'warden_office', 'gates', 'city_street', 'return_gate']).default('cell'),
      barsVisible: z.boolean().default(true),
      rainStreaks: z.boolean().default(true),
      cellLightOn: z.boolean().default(false),
      puzzleSolved: z.boolean().default(false),
      gatesOpenRatio: z.number().min(0).max(1).default(0),
      laundrySearchlight: z.boolean().default(false),
      searchlightAngle: z.number().default(0),
      evidenceBoardActive: z.boolean().default(false),
      clockSpeed: z.number().default(1.0),
      intercomBuzzing: z.boolean().default(false),
    })
    .optional(),
});
export type EnvironmentState = z.infer<typeof EnvironmentStateSchema>;

/** Rigged 2D storytime puppets (illustrated mode): animated characters drawn over painted backgrounds */
export const PuppetActionSchema = z.enum([
  'idle', 'talk', 'point', 'wave', 'shrug', 'cheer', 'hands_hips', 'cross_arms',
  'think', 'surprised', 'facepalm', 'slump', 'dance', 'walk',
]);
export type PuppetAction = z.infer<typeof PuppetActionSchema>;
export const PuppetExpressionSchema = z.enum([
  'happy', 'happy_closed', 'excited', 'neutral', 'surprised', 'sad', 'worried', 'annoyed', 'tired', 'smug', 'determined',
]);
export type PuppetExpression = z.infer<typeof PuppetExpressionSchema>;
export const PuppetBeatSchema = z.object({
  id: z.enum(['alex', 'chloe', 'mayor', 'chef', 'granny', 'ravi', 'warden', 'guard']),
  /** Feet position as a fraction of the frame (x 0..1, y 0..1) */
  x: z.number(),
  y: z.number(),
  /** 1 ≈ 560 px tall on a 1920 px frame */
  scale: z.number().default(1),
  facing: z.enum(['front', 'left', 'right']).default('front'),
  expression: PuppetExpressionSchema.default('happy'),
  outfit: z.enum(['default', 'labcoat', 'tophat']).default('default'),
  /** Timeline of actions; `at` is scene progress 0..1. `walk` moves to `toX`. */
  actions: z
    .array(z.object({ at: z.number(), action: PuppetActionSchema, toX: z.number().optional(), expression: PuppetExpressionSchema.optional() }))
    .default([]),
});
export type PuppetBeat = z.infer<typeof PuppetBeatSchema>;

export const SceneScriptSchema = z.object({
  sceneNumber: z.number().int().positive(),
  id: z.string(),
  title: z.string(),
  targetDurationSeconds: z.number().positive(),
  padAfterSeconds: z.number().min(0).default(0.25),
  narration: z.string(),
  emotion: EmotionSchema,
  voiceSettings: z.object({
    stability: z.number().min(0).max(1),
    similarityBoost: z.number().min(0).max(1),
    style: z.number().min(0).max(1),
    speed: z.number().min(0.7).max(1.25).default(1.04),
  }),
  camera: z.object({
    startPosition: Vec3Schema,
    endPosition: Vec3Schema,
    startLookAt: Vec3Schema,
    endLookAt: Vec3Schema,
    fov: z.number().default(42),
    movement: CameraMovementSchema,
    /** Scene-progress ratios where the camera "hits": FOV kick + shake + chromatic punch */
    impacts: z.array(z.number().min(0).max(1)).optional(),
    /** Handheld micro-motion amount (0 = locked off, 1 = default documentary float) */
    handheld: z.number().min(0).max(3).optional(),
  }),
  lightingPreset: z
    .enum([
      'daylight',
      'warm_golden',
      'crisp_noon',
      'soft_overcast',
      'sunset_golden',
      'storm_rain',
      'indoor_cozy',
      'space_neon',
      'space_alert',
      'subway_noir',
      'mars_day',
      'jungle_sun',
      'dream_night',
      'dream_sky',
      'mediterranean_day',
      'pizza_sunset',
      'freezer_glow',
    ])
    .default('daylight'),
  chaosHud: z
    .object({
      bannerText: z.string().optional(),
      bannerTone: z.enum(['red_alert', 'cyan_holo', 'neon_magenta', 'gold_ceo']).optional(),
      calloutText: z.string().optional(),
      receiptPopup: z.boolean().optional(),
      shakeIntensity: z.number().min(0).max(1).optional(),
    })
    .optional(),
  experimentOverlay: z
    .object({
      calendarFlip: z
        .object({
          fromHeader: z.string(),
          toHeader: z.string(),
          fromIcon: z.enum(['sun_heart', 'money']),
          toIcon: z.enum(['rain_cloud', 'empty_box']),
        })
        .optional(),
      stamp: z
        .object({
          text: z.string(),
          color: z.enum(['green', 'red']),
          atRatio: z.number().min(0).max(1),
        })
        .optional(),
      gauge: z
        .object({
          label: z.string(),
          startVal: z.number(),
          endVal: z.number(),
          prefix: z.string().optional(),
          suffix: z.string().optional(),
        })
        .optional(),
      noWifiPopup: z.boolean().optional(),
    })
    .optional(),
  /** Retention HUD: big top title, emoji bursts, highlighted caption keywords */
  hud: z
    .object({
      topTitle: z.string().optional(),
      topTitleTone: z.enum(['yellow', 'red', 'green', 'white']).optional(),
      emojiBurst: z
        .object({ emoji: z.string(), atRatio: z.number().min(0).max(1), count: z.number().int().min(1).max(14).default(7) })
        .optional(),
      captionHighlights: z.array(z.string()).optional(),
    })
    .optional(),
  /** Pre-rendered shot (e.g. Blender render) under public/, played instead of the Three.js world */
  footage: z.string().optional(),
  /** Blender shot direction (blender/scripts/render_scene.py), turned into `footage` by scripts/produce-blender.ts */
  shot: z
    .object({
      set: z.enum(['street', 'park', 'home', 'kitchen']),
      camera: z.any().optional(),
      chars: z.array(z.any()),
      /** Props (blender/lib/toonprops.py): placed, held (hand-attached), swapped, animated; times are scene ratios */
      props: z.array(z.any()).optional(),
      /** Time-of-day grade rendered in Blender (glows stay bright) */
      time: z.enum(['day', 'evening', 'night', 'party']).optional(),
      /** Set-piece name prefixes to hide for this shot (e.g. a tree blocking the camera) */
      hide: z.array(z.string()).optional(),
      /** Frozen-time grade between scene ratios (ripple on the snap / unfreeze) */
      freeze: z.object({ from: z.number().min(0).max(1).optional(), to: z.number().min(0).max(1).optional() }).optional(),
    })
    .optional(),
  /**
   * Painted-scene mode (concept.renderMode = 'illustrated'): one 9:16 illustration per scene, generated from
   * `prompt` (e.g. in the Gemini app) and ingested to public/illustrations/<storyId>/scene-NN.jpg.
   */
  illustration: z
    .object({
      prompt: z.string(),
      /** 2.5D camera move applied to the still */
      motion: z.enum(['push_in', 'pull_out', 'pan_left', 'pan_right', 'drift_up', 'hold']).default('push_in'),
      /** Normalised point (0..1) the push-in zooms toward, usually the speaker's face */
      focus: z.tuple([z.number(), z.number()]).default([0.5, 0.4]),
      /** Speaker mouth position in the image (0..1) and width as a fraction of image width, for lip-sync */
      mouth: z
        .object({
          x: z.number(),
          y: z.number(),
          w: z.number().default(0.05),
          /** Width (fraction of image width) of the painted mouth to hide while talking */
          coverW: z.number().optional(),
          /** Face skin colour sampled next to the painted mouth, used to hide it while talking */
          skin: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  characters: z.array(CharacterBeatSchema),
  /** Illustrated mode: animated puppets drawn over the painted background (backgrounds then contain no people) */
  puppets: z.array(PuppetBeatSchema).optional(),
  /** V3: character whose mouth moves in sync with the narration in this scene */
  speaker: CharacterIdSchema.optional(),
  environment: EnvironmentStateSchema,
  thoughtBubbles: z.array(ThoughtBubbleCueSchema).default([]),
  smokePoofs: z.array(SmokePoofCueSchema).default([]),
  soundEffects: z.array(SfxCueSchema).default([]),
  musicEnergy: z.enum(['gentle', 'driving', 'suspense', 'triumphant', 'outro']).default('gentle'),
  transition: TransitionTypeSchema.default('cut'),
  visualObjective: z.string(),
});
export type SceneScript = z.infer<typeof SceneScriptSchema>;

export const StoryConceptSchema = z.object({
  id: z.string(),
  title: z.string(),
  centralPremise: z.string(),
  openingHook: z.string(),
  mainCharacter: z.string(),
  supportingCharacters: z.array(z.string()),
  environment: z.string(),
  conflict: z.string(),
  escalation: z.string(),
  climax: z.string(),
  ending: z.string(),
  emotionalObjective: z.string(),
  visualStorytellingOpportunities: z.array(z.string()),
  /** Background score style: calm pastoral marimba or upbeat funky Shorts groove */
  musicStyle: z.enum(['pastoral', 'funky', 'documentary']).optional(),
  /** Caption look: bold karaoke (default) or clean documentary white (zackdfilms-style) */
  captionStyle: z.enum(['karaoke', 'documentary', 'storytime']).optional(),
  /** 'storytime' = reference look (Ricks Clips-style): warm grade, background blur, brown ink, calm audio, 1-word captions */
  visualStyle: z.enum(['cel', 'storytime']).optional(),
  /** 'three' = procedural Three.js world (default); 'illustrated' = painted stills with 2.5D motion */
  renderMode: z.enum(['three', 'illustrated']).optional(),
  /** Shared character design notes prepended to every illustration prompt (keeps characters consistent) */
  illustrationStyle: z.string().optional(),
  /** 'v3' opts the story into REFERENCE_STYLE_BIBLE_V3 pacing rules (enforced by storyLint) */
  styleVersion: z.enum(['v2', 'v3']).optional(),
});
export type StoryConcept = z.infer<typeof StoryConceptSchema>;

export const WordTimestampSchema = z.object({
  word: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
});
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

export const CaptionChunkSchema = z.object({
  text: z.string(),
  startFrame: z.number().int(),
  endFrame: z.number().int(),
  /** Per-word start frames (scene-local) enabling karaoke-style active-word highlighting */
  words: z.array(z.object({ text: z.string(), startFrame: z.number().int() })).optional(),
});
export type CaptionChunk = z.infer<typeof CaptionChunkSchema>;

export const CompiledSceneSchema = z.object({
  scene: SceneScriptSchema,
  startFrame: z.number().int(),
  durationFrames: z.number().int(),
  audioFile: z.string().nullable(),
  audioDurationSeconds: z.number(),
  words: z.array(WordTimestampSchema),
  captions: z.array(CaptionChunkSchema),
  /** Per-frame narration loudness 0..1 (drives the speaker's lip-sync) */
  mouthEnvelope: z.array(z.number()).optional(),
  /** Per-frame mouth shape (Preston Blair / Rhubarb letters A–H, X = rest), from ElevenLabs character timing */
  visemes: z.string().optional(),
  /** Frames where the speaker stresses a highlighted word (brow raise) */
  emphasisFrames: z.array(z.number().int()).optional(),
});
export type CompiledScene = z.infer<typeof CompiledSceneSchema>;

export const ProductionPlanSchema = z.object({
  projectId: z.string(),
  createdAt: z.string(),
  referenceStyleBible: z.string(),
  concept: StoryConceptSchema,
  fps: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  totalFrames: z.number().int(),
  totalDurationSeconds: z.number(),
  voiceId: z.string(),
  musicFile: z.string(),
  ambienceFile: z.string(),
  scenes: z.array(CompiledSceneSchema),
});
export type ProductionPlan = z.infer<typeof ProductionPlanSchema>;
