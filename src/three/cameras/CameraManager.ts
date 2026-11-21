import * as THREE from 'three';
import { SceneScript } from '../../services/scripting/schema.js';
import { clamp, easeInOutCubic, easeInOutQuint, easeOutCubic } from '../../utils/math.js';

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
  distance: number;
}

const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutBackSoft = (t: number): number => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Smooth deterministic pseudo-noise (sum of incommensurate sines), range ≈ [-1, 1] */
function smoothNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 1.31 + seed * 1.7) * 0.5 +
    Math.sin(t * 2.17 + seed * 3.1) * 0.3 +
    Math.sin(t * 3.73 + seed * 5.3) * 0.2
  );
}

/**
 * Cinematic deterministic camera rig.
 * - Eased start→end interpolation per movement type
 * - Retention moves: punch_in, orbit_hero, whip_reveal, low_angle_rise, drone_dive
 * - Organic handheld float (deterministic, no jitter between renders)
 * - Impact "hits": FOV kick + decaying shake, exposed for post-FX chromatic punch
 */
export class CameraManager {
  public readonly camera: THREE.PerspectiveCamera;
  /** 0..1 strength of the most recent camera impact, decays quickly (used by post-FX) */
  public impactStrength = 0;

  private readonly tmpStartPos = new THREE.Vector3();
  private readonly tmpEndPos = new THREE.Vector3();
  private readonly tmpStartLook = new THREE.Vector3();
  private readonly tmpEndLook = new THREE.Vector3();
  private readonly currentLook = new THREE.Vector3();
  private readonly tmpOffset = new THREE.Vector3();
  private readonly tmpProject = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 260);
  }

  public update(scene: SceneScript, sceneProgress: number, globalSeconds: number, sceneDurationSeconds = 4): void {
    const camCfg = scene.camera;
    this.tmpStartPos.set(...camCfg.startPosition);
    this.tmpEndPos.set(...camCfg.endPosition);
    this.tmpStartLook.set(...camCfg.startLookAt);
    this.tmpEndLook.set(...camCfg.endLookAt);

    const p = sceneProgress;
    let t: number;
    switch (camCfg.movement) {
      case 'crane_pull_out':
        t = easeInOutQuint(p);
        break;
      case 'wide_pull_back':
        t = easeOutCubic(p);
        break;
      case 'punch_in':
        // Snap in over the first ~22% then a slow creeping push for the rest
        t = p < 0.22 ? easeOutBackSoft(p / 0.22) * 0.85 : 0.85 + 0.15 * easeOutCubic((p - 0.22) / 0.78);
        break;
      case 'whip_reveal':
        // Hold on start framing, then whip to the reveal with an overshoot settle
        t = p < 0.18 ? 0 : easeOutBackSoft(clamp((p - 0.18) / 0.32, 0, 1));
        break;
      case 'drone_dive':
        t = easeOutExpo(clamp(p * 1.15, 0, 1));
        break;
      case 'low_angle_rise':
        t = easeInOutCubic(p);
        break;
      default:
        t = easeInOutCubic(p);
        break;
    }

    this.camera.position.lerpVectors(this.tmpStartPos, this.tmpEndPos, t);
    this.currentLook.lerpVectors(this.tmpStartLook, this.tmpEndLook, t);

    if (camCfg.movement === 'orbit_gentle' || camCfg.movement === 'orbit_hero') {
      const sweep = camCfg.movement === 'orbit_hero' ? 1.05 : 0.25;
      const angle = (easeInOutCubic(p) - 0.5) * sweep;
      this.tmpOffset.copy(this.camera.position).sub(this.currentLook);
      this.tmpOffset.applyAxisAngle(CameraManager.UP, angle);
      this.camera.position.copy(this.currentLook).add(this.tmpOffset);
    } else if (camCfg.movement === 'crane_down') {
      const arc = Math.sin(t * Math.PI) * 1.15;
      this.camera.position.y += arc * 0.6;
      this.camera.position.x += Math.sin(globalSeconds * 0.4) * 0.04;
    } else if (camCfg.movement === 'drone_dive') {
      this.camera.position.y += Math.sin(t * Math.PI) * 0.8;
    }

    // Organic handheld float (sub-degree, deterministic in globalSeconds)
    const handheld = camCfg.handheld ?? 1;
    if (handheld > 0) {
      const amp = 0.035 * handheld;
      this.camera.position.x += smoothNoise(globalSeconds * 0.9, 1) * amp;
      this.camera.position.y += smoothNoise(globalSeconds * 0.8, 2) * amp * 0.7;
      this.currentLook.x += smoothNoise(globalSeconds * 0.7, 3) * amp * 1.4;
      this.currentLook.y += smoothNoise(globalSeconds * 0.6, 4) * amp;
    }

    // Impact hits: decaying shake + FOV kick
    let impact = 0;
    const elapsed = p * sceneDurationSeconds;
    for (const r of camCfg.impacts ?? []) {
      const dt = elapsed - r * sceneDurationSeconds;
      if (dt >= 0 && dt < 0.7) {
        impact = Math.max(impact, Math.exp(-dt * 7.5));
      }
    }
    this.impactStrength = impact;
    if (impact > 0.001) {
      const s = impact * 0.16;
      this.camera.position.x += Math.sin(globalSeconds * 71) * s;
      this.camera.position.y += Math.cos(globalSeconds * 63) * s * 0.8;
    }

    const fov = camCfg.fov * (1 - impact * 0.1);
    if (Math.abs(this.camera.fov - fov) > 0.001) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this.currentLook);
    // Tiny dutch roll from handheld, stronger roll on impacts
    this.camera.rotateZ(smoothNoise(globalSeconds * 0.5, 9) * 0.004 * handheld + Math.sin(globalSeconds * 40) * impact * 0.02);
    this.camera.updateMatrixWorld(true);
  }

  public projectWorldToScreen(
    worldPos: [number, number, number],
    viewportWidth: number,
    viewportHeight: number
  ): ProjectedPoint {
    const v = this.tmpProject.set(worldPos[0], worldPos[1], worldPos[2]);
    const distance = this.camera.position.distanceTo(v);
    v.project(this.camera);
    const visible = v.z >= -1 && v.z <= 1;
    const x = (v.x * 0.5 + 0.5) * viewportWidth;
    const y = (-v.y * 0.5 + 0.5) * viewportHeight;
    return { x, y, visible, distance };
  }
}
