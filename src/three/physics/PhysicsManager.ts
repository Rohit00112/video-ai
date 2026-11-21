import * as THREE from 'three';
import { SmokePoofCue } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, easeOutCubic } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

interface PoofLobe {
  mesh: THREE.Group;
  dir: THREE.Vector3;
  baseRadius: number;
}

interface SparkleParticle {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  phase: number;
  speed: number;
}

interface WaterDrop {
  mesh: THREE.Mesh;
  phase: number;
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Deterministic closed-form physics for cartoon smoke poofs, ballistic water droplets,
 * and floating golden celebration sparkles.
 */
export class PhysicsManager {
  private readonly root = new THREE.Group();
  private readonly poofClusters: PoofLobe[][] = [];
  private readonly sparkles: SparkleParticle[] = [];
  private readonly waterDrops: WaterDrop[] = [];

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.root.name = 'PhysicsEffectsRoot';
    scene.add(this.root);

    const rng = createSeededRng(8080);

    // Pre-allocate 3 reusable cartoon smoke-poof clusters (9 puffy lobes each)
    const poofMat = assets.createToonMaterial('mat-poof-cloud', {
      color: '#EEF2F5',
      transparent: true,
      opacity: 0.92,
    });
    for (let c = 0; c < 3; c++) {
      const lobes: PoofLobe[] = [];
      for (let i = 0; i < 9; i++) {
        const theta = (i / 9) * Math.PI * 2 + rng() * 0.4;
        const elev = (rng() - 0.35) * 1.1;
        const dir = new THREE.Vector3(Math.cos(theta), elev, Math.sin(theta) * 0.5).normalize();
        const radius = 0.28 + rng() * 0.22;
        const lobe = assets.createOutlinedMesh(new THREE.IcosahedronGeometry(radius, 1), poofMat, {
          outlineScale: 1.07,
          castShadow: false,
          receiveShadow: false,
        });
        lobe.visible = false;
        this.root.add(lobe);
        lobes.push({ mesh: lobe, dir, baseRadius: radius });
      }
      this.poofClusters.push(lobes);
    }

    // Golden floating diamond sparkles (signature celebration cue in reference!)
    const sparkleMat = assets.createToonMaterial('mat-gold-sparkle', {
      color: '#F5C542',
      emissive: '#E8A81E',
      emissiveIntensity: 0.5,
    });
    const sparkleGeo = new THREE.OctahedronGeometry(0.11, 0);
    for (let i = 0; i < 22; i++) {
      const mesh = new THREE.Mesh(sparkleGeo, sparkleMat);
      mesh.visible = false;
      this.root.add(mesh);
      this.sparkles.push({
        mesh,
        origin: new THREE.Vector3(
          -4.5 + rng() * 8.5,
          0.6 + rng() * 1.2,
          -12.5 + rng() * 7.0
        ),
        phase: rng() * Math.PI * 2,
        speed: 0.45 + rng() * 0.45,
      });
    }

    // Ballistic blue water droplets splashing around the waterwheel & pipe spout
    const dropMat = assets.createToonMaterial('mat-water-drop', {
      color: '#5EC2F7',
      emissive: '#35A3E8',
      emissiveIntensity: 0.35,
    });
    const dropGeo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(dropGeo, dropMat);
      mesh.visible = false;
      this.root.add(mesh);
      this.waterDrops.push({
        mesh,
        phase: i / 20,
        vx: (rng() - 0.5) * 1.4,
        vy: 1.6 + rng() * 1.4,
        vz: (rng() - 0.5) * 1.2,
      });
    }
  }

  public update(params: {
    smokePoofs: SmokePoofCue[];
    sceneProgress: number;
    sceneDurationSeconds: number;
    globalSeconds: number;
    showSparkles: boolean;
    waterFlowing: boolean;
    leoEstateUpgraded: boolean;
    heroBucketActive: boolean;
  }): void {
    // 1. Update cartoon smoke poof bursts
    for (let c = 0; c < this.poofClusters.length; c++) {
      const cue = params.smokePoofs[c];
      const lobes = this.poofClusters[c];

      if (!cue) {
        for (const l of lobes) l.mesh.visible = false;
        continue;
      }

      const elapsedAfterTrigger = (params.sceneProgress - cue.triggerAtRatio) * params.sceneDurationSeconds;
      const poofDuration = 0.62;
      if (elapsedAfterTrigger < 0 || elapsedAfterTrigger > poofDuration) {
        for (const l of lobes) l.mesh.visible = false;
        continue;
      }

      const u = clamp(elapsedAfterTrigger / poofDuration, 0, 1);
      const expand = easeOutCubic(u);
      const scaleCurve = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75;

      for (const l of lobes) {
        l.mesh.visible = true;
        l.mesh.position.set(
          cue.worldPosition[0] + l.dir.x * expand * 1.15 * cue.scale,
          cue.worldPosition[1] + l.dir.y * expand * 0.95 * cue.scale + expand * 0.35,
          cue.worldPosition[2] + l.dir.z * expand * 0.65 * cue.scale
        );
        l.mesh.scale.setScalar(Math.max(0.01, scaleCurve * cue.scale * 1.25));
      }
    }

    // 2. Update golden celebration sparkles
    for (const sp of this.sparkles) {
      sp.mesh.visible = params.showSparkles;
      if (!params.showSparkles) continue;
      const cycle = (params.globalSeconds * sp.speed + sp.phase) % 1;
      const baseOrigin = params.heroBucketActive
        ? new THREE.Vector3(9.5 + (sp.origin.x % 2.4), 0.7, 6.0 + (sp.origin.z % 1.6))
        : sp.origin;
      sp.mesh.position.set(
        baseOrigin.x + Math.sin(params.globalSeconds * 2 + sp.phase) * 0.35,
        baseOrigin.y + cycle * 3.4,
        baseOrigin.z
      );
      sp.mesh.rotation.y = params.globalSeconds * 3.5 + sp.phase;
      sp.mesh.rotation.x = params.globalSeconds * 2.1;
      const fade = Math.sin(cycle * Math.PI);
      sp.mesh.scale.setScalar(Math.max(0.01, fade * 1.15));
    }

    // 3. Ballistic water droplets (gravity g = -9.8 m/s^2)
    const showDrops = params.waterFlowing || params.heroBucketActive;
    const emitter = params.heroBucketActive
      ? new THREE.Vector3(9.5, 1.05, 6.0)
      : params.leoEstateUpgraded
      ? new THREE.Vector3(0.75, 1.4, -9.7)
      : new THREE.Vector3(1.5, 0.95, -8.4);

    for (const d of this.waterDrops) {
      d.mesh.visible = showDrops;
      if (!showDrops) continue;
      const t = (params.globalSeconds * 1.55 + d.phase) % 0.8;
      const g = -9.2;
      d.mesh.position.set(
        emitter.x + d.vx * t,
        Math.max(0.06, emitter.y + d.vy * t + 0.5 * g * t * t),
        emitter.z + d.vz * t
      );
      const lifeFade = clamp(1 - t / 0.8, 0.1, 1);
      d.mesh.scale.setScalar(lifeFade);
    }
  }
}
