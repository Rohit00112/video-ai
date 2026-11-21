import * as THREE from 'three';
import { EnvironmentManager } from '../environments/EnvironmentManager.js';

/**
 * Deterministic Three.js AnimationMixer + KeyframeTrack + Quaternion interpolation controller.
 * Always evaluated via explicit `mixer.setTime(globalSeconds)` so frame N yields bit-identical transforms.
 */
export class AnimationManager {
  private readonly mixers: THREE.AnimationMixer[] = [];
  private readonly environment: EnvironmentManager;

  constructor(environment: EnvironmentManager) {
    this.environment = environment;
    this.setupWaterwheelClip();
    this.setupHeroBucketClip();
  }

  private setupWaterwheelClip(): void {
    const wheel = this.environment.getWaterwheelGroup();
    const times = [0, 1.0, 2.0, 3.0, 4.0];
    const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0);
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 0.5);
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI);
    const q3 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 1.5);
    const q4 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 2);

    const values = [
      q0.x, q0.y, q0.z, q0.w,
      q1.x, q1.y, q1.z, q1.w,
      q2.x, q2.y, q2.z, q2.w,
      q3.x, q3.y, q3.z, q3.w,
      q4.x, q4.y, q4.z, q4.w,
    ];

    const track = new THREE.QuaternionKeyframeTrack('.quaternion', times, values);
    const clip = new THREE.AnimationClip('WaterwheelSpin', 4.0, [track]);
    const mixer = new THREE.AnimationMixer(wheel);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    this.mixers.push(mixer);
  }

  private setupHeroBucketClip(): void {
    const bucket = this.environment.getHeroBucketGroup();
    const times = [0, 0.75, 1.5, 2.25, 3.0];
    const qA = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.18, 0.04));
    const qB = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.16, -0.04));
    const values = [
      qA.x, qA.y, qA.z, qA.w,
      qB.x, qB.y, qB.z, qB.w,
      qA.x, qA.y, qA.z, qA.w,
      qB.x, qB.y, qB.z, qB.w,
      qA.x, qA.y, qA.z, qA.w,
    ];

    const track = new THREE.QuaternionKeyframeTrack('.quaternion', times, values);
    const clip = new THREE.AnimationClip('HeroBucketSway', 3.0, [track]);
    const mixer = new THREE.AnimationMixer(bucket);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    this.mixers.push(mixer);
  }

  public update(globalSeconds: number): void {
    for (const mixer of this.mixers) {
      mixer.setTime(globalSeconds);
    }

    // Procedural butterfly fluttering
    for (const b of this.environment.getButterflyGroups()) {
      const t = globalSeconds * 1.4 + b.phase;
      b.group.position.set(
        b.base.x + Math.sin(t) * 0.9,
        b.base.y + Math.sin(t * 2.2) * 0.35,
        b.base.z + Math.cos(t * 0.8) * 0.7
      );
      b.group.rotation.y = Math.atan2(Math.cos(t) * 0.9, -Math.sin(t * 0.8) * 0.7);
      const flap = Math.sin(globalSeconds * 24 + b.phase) * 0.95;
      b.wingL.rotation.y = flap;
      b.wingR.rotation.y = -flap;
    }
  }
}
