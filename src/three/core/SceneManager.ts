import * as THREE from 'three';
import { ProductionPlan, ThoughtBubbleCue } from '../../services/scripting/schema.js';
import { AssetManager } from './AssetManager.js';
import { TimelineManager, ActiveTimelineState } from './TimelineManager.js';
import { LightingManager } from '../lighting/LightingManager.js';
import { CameraManager } from '../cameras/CameraManager.js';
import { EnvironmentManager } from '../environments/EnvironmentManager.js';
import { HarborEnvironmentManager } from '../environments/HarborEnvironmentManager.js';
import { CityExperimentEnvironmentManager } from '../environments/CityExperimentEnvironmentManager.js';
import { SpaceChaosEnvironmentManager } from '../environments/SpaceChaosEnvironmentManager.js';
import { SubwayChaosEnvironmentManager } from '../environments/SubwayChaosEnvironmentManager.js';
import { MarsColonyEnvironmentManager } from '../environments/MarsColonyEnvironmentManager.js';
import { DinoTimeEnvironmentManager } from '../environments/DinoTimeEnvironmentManager.js';
import { GravityTownEnvironmentManager } from '../environments/GravityTownEnvironmentManager.js';
import { DreamCloudEnvironmentManager } from '../environments/DreamCloudEnvironmentManager.js';
import { CharacterManager } from '../characters/CharacterManager.js';
import { AnimationManager } from '../animation/AnimationManager.js';
import { PhysicsManager } from '../physics/PhysicsManager.js';
import { PizzaTownEnvironmentManager } from '../environments/PizzaTownEnvironmentManager.js';
import { PrisonEnvironmentManager } from '../environments/PrisonEnvironmentManager.js';
import { PostFxPipeline } from './PostFxPipeline.js';
import { EnvironmentState } from '../../services/scripting/schema.js';

export interface ProjectedBubbleState {
  cue: ThoughtBubbleCue;
  screenX: number;
  screenY: number;
  scale: number;
  localProgress: number;
  elapsedSinceStart: number;
}

export interface RenderedFrameOutput {
  timeline: ActiveTimelineState;
  bubbles: ProjectedBubbleState[];
}

/**
 * Master Three.js 3D Production Engine coordinating every required subsystem:
 * SceneManager, AssetManager, LightingManager, CameraManager, EnvironmentManager,
 * CharacterManager, AnimationManager, PhysicsManager, and TimelineManager.
 */
type WorldTheme = NonNullable<EnvironmentState['worldTheme']>;

interface WorldFrameContext {
  env: EnvironmentState;
  sceneProgress: number;
  sceneElapsedSeconds: number;
  globalSeconds: number;
}

/**
 * Master Three.js 3D Production Engine.
 *
 * Performance: only the worlds referenced by the plan's scenes are constructed and updated
 * (previously all nine worlds were built and ticked on every frame in every render tab).
 * Visuals: frames go through PostFxPipeline (MSAA, HDR bloom, cinematic grade, grain, impact CA).
 */
export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly assets: AssetManager;
  public readonly lighting: LightingManager;
  public readonly cameraManager: CameraManager;
  public readonly characters: CharacterManager;
  public readonly physics: PhysicsManager;
  public readonly timeline: TimelineManager;
  private readonly animations: AnimationManager | null;
  private readonly postFx: PostFxPipeline;
  private readonly worldUpdaters: ((ctx: WorldFrameContext) => void)[] = [];

  constructor(canvas: HTMLCanvasElement, plan: ProductionPlan, width: number, height: number) {
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // MSAA handled by the composer render target
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.assets = new AssetManager();
    this.lighting = new LightingManager(this.scene);
    this.cameraManager = new CameraManager(width / height);

    const themes = new Set<WorldTheme>(
      plan.scenes.map((s) => (s.scene.environment.worldTheme ?? 'village') as WorldTheme)
    );

    let village: EnvironmentManager | null = null;
    if (themes.has('village')) {
      village = new EnvironmentManager(this.scene, this.assets);
      const v = village;
      this.worldUpdaters.push((c) => v.update(c.env, c.sceneProgress, c.sceneElapsedSeconds, c.globalSeconds));
    }
    if (themes.has('harbor')) {
      const w = new HarborEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.sceneProgress, c.sceneElapsedSeconds, c.globalSeconds));
    }
    if (themes.has('city_experiment')) {
      const w = new CityExperimentEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.globalSeconds));
    }
    if (themes.has('space_chaos')) {
      const w = new SpaceChaosEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.sceneProgress, c.sceneElapsedSeconds, c.globalSeconds));
    }
    if (themes.has('subway_chaos')) {
      const w = new SubwayChaosEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.sceneProgress, c.globalSeconds));
    }
    if (themes.has('mars_colony')) {
      const w = new MarsColonyEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.sceneProgress, c.globalSeconds));
    }
    if (themes.has('dino_time')) {
      const w = new DinoTimeEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.globalSeconds));
    }
    if (themes.has('gravity_town')) {
      const w = new GravityTownEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.globalSeconds));
    }
    if (themes.has('dream_city')) {
      const w = new DreamCloudEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.globalSeconds));
    }
    if (themes.has('pizza_town')) {
      const w = new PizzaTownEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env, c.sceneProgress, c.sceneElapsedSeconds, c.globalSeconds));
    }
    if (themes.has('prison')) {
      const w = new PrisonEnvironmentManager(this.scene, this.assets);
      this.worldUpdaters.push((c) => w.update(c.env.prisonState, c.globalSeconds));
    }

    const storytime = plan.concept.visualStyle === 'storytime';
    this.characters = new CharacterManager(this.scene, { inkColor: storytime ? '#3B2416' : undefined });
    this.animations = village ? new AnimationManager(village) : null;
    this.physics = new PhysicsManager(this.scene, this.assets);
    this.timeline = new TimelineManager(plan);
    this.postFx = new PostFxPipeline(this.renderer, this.scene, this.cameraManager.camera, width, height, storytime ? 'storytime' : 'cel');
  }

  public renderAtFrame(frame: number, viewportWidth: number, viewportHeight: number): RenderedFrameOutput {
    const state = this.timeline.evaluate(frame);
    const { scene: sceneScript } = state.compiledScene;

    this.lighting.applyPreset(sceneScript.lightingPreset);
    this.cameraManager.update(sceneScript, state.sceneProgress, state.globalSeconds, state.sceneDurationSeconds);

    const ctx: WorldFrameContext = {
      env: sceneScript.environment,
      sceneProgress: state.sceneProgress,
      sceneElapsedSeconds: state.sceneElapsedSeconds,
      globalSeconds: state.globalSeconds,
    };
    for (const update of this.worldUpdaters) update(ctx);

    // V3 talking mouth: the speaker talks while a narration caption chunk is on screen
    const talking = state.compiledScene.captions.some(
      (c) => state.sceneLocalFrame >= c.startFrame && state.sceneLocalFrame <= c.endFrame
    );
    this.characters.update(
      sceneScript.characters,
      state.sceneProgress,
      state.globalSeconds,
      this.cameraManager.camera.position,
      sceneScript.environment.samRunningLoop,
      {
        sceneDurationSeconds: state.sceneDurationSeconds,
        speaker: sceneScript.speaker,
        talking,
        // Real lip-sync: narration loudness for this frame (undefined → fall back to timed flap)
        mouthLevel: state.compiledScene.mouthEnvelope?.[state.sceneLocalFrame],
      }
    );

    this.animations?.update(state.globalSeconds);

    this.physics.update({
      smokePoofs: sceneScript.smokePoofs,
      sceneProgress: state.sceneProgress,
      sceneDurationSeconds: state.sceneDurationSeconds,
      globalSeconds: state.globalSeconds,
      showSparkles: sceneScript.environment.showSparkles,
      waterFlowing: sceneScript.environment.waterFlowing,
      leoEstateUpgraded: sceneScript.environment.leoEstateUpgraded,
      heroBucketActive:
        sceneScript.environment.showHeroBucket ||
        (sceneScript.environment.showHeroSproutPot ?? false) ||
        (sceneScript.environment.showHeroBoat ?? false),
    });

    this.postFx.render(
      this.lighting.getGrade(sceneScript.lightingPreset),
      frame,
      this.cameraManager.impactStrength
    );

    const bubbles: ProjectedBubbleState[] = [];
    for (const cue of state.activeThoughtBubbles) {
      let worldPos: [number, number, number] | null = cue.worldPosition ?? null;
      if (!worldPos && cue.anchorCharacter) {
        worldPos = this.characters.getHeadWorldPosition(cue.anchorCharacter);
      }
      if (!worldPos) continue;

      const projected = this.cameraManager.projectWorldToScreen(worldPos, viewportWidth, viewportHeight);
      if (!projected.visible) continue;

      const span = Math.max(0.01, cue.endAtRatio - cue.startAtRatio);
      const localProgress = Math.max(0, Math.min(1, (state.sceneProgress - cue.startAtRatio) / span));
      const elapsedSinceStart = (state.sceneProgress - cue.startAtRatio) * state.sceneDurationSeconds;
      const distScale = Math.max(0.55, Math.min(1.18, 6.4 / Math.max(2.5, projected.distance)));

      bubbles.push({
        cue,
        screenX: projected.x,
        screenY: projected.y,
        scale: distScale,
        localProgress,
        elapsedSinceStart,
      });
    }

    return { timeline: state, bubbles };
  }

  public dispose(): void {
    this.postFx.dispose();
    this.characters.dispose();
    this.lighting.dispose();
    this.assets.dispose();
    this.renderer.dispose();
  }
}
