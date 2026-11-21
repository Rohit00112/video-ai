import { CompiledScene, ProductionPlan, ThoughtBubbleCue } from '../../services/scripting/schema.js';
import { clamp } from '../../utils/math.js';

export interface ActiveTimelineState {
  compiledScene: CompiledScene;
  sceneIndex: number;
  sceneLocalFrame: number;
  sceneProgress: number;
  sceneElapsedSeconds: number;
  sceneDurationSeconds: number;
  globalSeconds: number;
  activeThoughtBubbles: ThoughtBubbleCue[];
}

export class TimelineManager {
  private readonly plan: ProductionPlan;

  constructor(plan: ProductionPlan) {
    this.plan = plan;
  }

  public evaluate(frame: number): ActiveTimelineState {
    const safeFrame = clamp(frame, 0, Math.max(0, this.plan.totalFrames - 1));
    let sceneIndex = this.plan.scenes.length - 1;

    for (let i = 0; i < this.plan.scenes.length; i++) {
      const s = this.plan.scenes[i];
      if (safeFrame >= s.startFrame && safeFrame < s.startFrame + s.durationFrames) {
        sceneIndex = i;
        break;
      }
    }

    const compiledScene = this.plan.scenes[sceneIndex];
    const sceneLocalFrame = Math.max(0, safeFrame - compiledScene.startFrame);
    const sceneDurationSeconds = compiledScene.durationFrames / this.plan.fps;
    const sceneElapsedSeconds = sceneLocalFrame / this.plan.fps;
    const sceneProgress = clamp(
      sceneLocalFrame / Math.max(1, compiledScene.durationFrames - 1),
      0,
      1
    );
    const globalSeconds = safeFrame / this.plan.fps;

    const activeThoughtBubbles = compiledScene.scene.thoughtBubbles.filter(
      (b) => sceneProgress >= b.startAtRatio && sceneProgress <= b.endAtRatio
    );

    return {
      compiledScene,
      sceneIndex,
      sceneLocalFrame,
      sceneProgress,
      sceneElapsedSeconds,
      sceneDurationSeconds,
      globalSeconds,
      activeThoughtBubbles,
    };
  }
}
