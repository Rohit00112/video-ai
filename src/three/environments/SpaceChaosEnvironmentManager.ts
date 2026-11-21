import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, lerp, springPop } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

/**
 * Brand-new Retro-Futuristic 3D Space Station Comedy World ("The Pigeon CEO"):
 * - Starry cosmos + rotating 3D Planet Earth & Moon outside giant panoramic window
 * - Glossy neon-cyan spacecraft bridge + giant crimson DO NOT PRESS button
 * - Original 3D Sculpted Characters: Barnaby the Pigeon CEO, Astronaut Commander Buzz, AI Orb ASTRO-9000
 * - Zero-gravity floating pink-frosted donuts, coffee spheres, holographic stock bars, & breadcrumb rain!
 */
export class SpaceChaosEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private earthMesh!: THREE.Mesh;
  private moonMesh!: THREE.Mesh;
  private pigeonGroup!: THREE.Group;
  private pigeonWingL!: THREE.Group;
  private pigeonWingR!: THREE.Group;
  private pigeonHeadGroup!: THREE.Group;
  private pigeonCrown!: THREE.Group;
  private buzzGroup!: THREE.Group;
  private aiOrbGroup!: THREE.Group;
  private aiRingA!: THREE.Mesh;
  private aiRingB!: THREE.Mesh;
  private redButtonCap!: THREE.Group;
  private heroDonutGroup!: THREE.Group;
  private zeroGItems: { mesh: THREE.Object3D; base: THREE.Vector3; phase: number; spin: number }[] = [];
  private holoChartGroup!: THREE.Group;
  private holoBars: { mesh: THREE.Mesh; targetH: number }[] = [];
  private alertBeacons: THREE.Mesh[] = [];
  private breadcrumbs: { mesh: THREE.Mesh; bx: number; bz: number; phase: number }[] = [];

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'SpaceChaosRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildCosmosAndEarth();
    this.buildSpaceshipBridge();
    this.buildPigeonBarnaby();
    this.buildAstronautBuzz();
    this.buildAiOrbAstro9000();
    this.buildZeroGPropsAndHologram();
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(2099);

    // Rich cosmic ocean blue
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(0, 0, 512, 256);

    // Stylized emerald continents
    ctx.fillStyle = '#3CB371';
    for (let i = 0; i < 18; i++) {
      const x = rng() * 512;
      const y = 35 + rng() * 185;
      ctx.beginPath();
      ctx.ellipse(x, y, 22 + rng() * 55, 14 + rng() * 34, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Polar ice caps
    ctx.fillStyle = '#E8F6FF';
    ctx.fillRect(0, 0, 512, 22);
    ctx.fillRect(0, 234, 512, 22);

    // Swirling white atmospheric clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 24; i++) {
      const x = rng() * 512;
      const y = 24 + rng() * 208;
      ctx.beginPath();
      ctx.ellipse(x, y, 28 + rng() * 50, 5 + rng() * 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createButtonLabelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#F5C542';
    ctx.fillRect(0, 0, 512, 160);
    // Hazard diagonal stripes on top & bottom
    ctx.fillStyle = '#141414';
    for (let x = -40; x < 560; x += 48) {
      ctx.fillRect(x, 0, 24, 24);
      ctx.fillRect(x + 12, 136, 24, 24);
    }
    ctx.fillStyle = '#141414';
    ctx.font = '900 54px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DO NOT PRESS', 256, 82);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildCosmosAndEarth(): void {
    const rng = createSeededRng(40404);
    const starMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const starGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < 120; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (rng() - 0.5) * 65,
        -6 + rng() * 34,
        -22 - rng() * 28
      );
      star.scale.setScalar(0.4 + rng() * 1.1);
      this.root.add(star);
    }

    // Giant rotating 3D Planet Earth outside the panoramic bridge window!
    const earthMat = new THREE.MeshStandardMaterial({
      map: this.createEarthTexture(),
      roughness: 0.55,
      metalness: 0.05,
    });
    this.earthMesh = new THREE.Mesh(new THREE.SphereGeometry(7.2, 24, 18), earthMat);
    this.earthMesh.position.set(-2.2, 2.5, -24);
    this.root.add(this.earthMesh);

    // Glowing atmospheric halo ring around Earth
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(7.65, 24, 18),
      new THREE.MeshBasicMaterial({
        color: '#4DD8FF',
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
      })
    );
    halo.position.copy(this.earthMesh.position);
    this.root.add(halo);

    // Orbiting cartoon Moon
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 14, 12),
      this.assets.createToonMaterial('mat-moon', { color: '#D8DDE6' })
    );
    this.moonMesh.position.set(6.5, 6.2, -20);
    this.root.add(this.moonMesh);
  }

  private buildSpaceshipBridge(): void {
    const hullMat = this.assets.createToonMaterial('mat-ship-hull', { color: '#DCE6F2' });
    const darkMetal = this.assets.createToonMaterial('mat-ship-dark', { color: '#243046' });
    const cyanGlow = this.assets.createToonMaterial('mat-ship-cyan', {
      color: '#2BF5FF',
      emissive: '#00D8FF',
      emissiveIntensity: 0.9,
    });
    const alertMat = new THREE.MeshBasicMaterial({ color: '#FF2A44' });

    // Metallic spacecraft floor deck with glowing neon-cyan trim rails
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 18), darkMetal);
    floor.position.set(0, -0.2, 2);
    floor.receiveShadow = true;
    this.root.add(floor);

    for (const lx of [-3.4, 3.4]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 16), cyanGlow);
      strip.position.set(lx, 0.03, 2);
      this.root.add(strip);
    }

    // Panoramic spacecraft window pillars & ceiling arch (wide open view of Earth!)
    for (const px of [-5.8, 5.8]) {
      const pillar = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.2, 8.5, 1.4), hullMat, {
        outlineScale: 1.03,
      });
      pillar.position.set(px, 4.2, -5.8);
      this.root.add(pillar);
    }
    const topBeam = this.assets.createOutlinedMesh(new THREE.BoxGeometry(13.2, 1.1, 1.6), hullMat, {
      outlineScale: 1.02,
    });
    topBeam.position.set(0, 7.6, -5.8);
    this.root.add(topBeam);

    const sill = this.assets.createOutlinedMesh(new THREE.BoxGeometry(13.2, 1.4, 1.4), darkMetal, {
      outlineScale: 1.02,
    });
    sill.position.set(0, 0.7, -5.8);
    this.root.add(sill);

    // Flashing RED ALERT emergency beacons on upper pillars
    for (const bx of [-4.6, 4.6]) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), alertMat.clone());
      beacon.position.set(bx, 6.4, -5.0);
      this.root.add(beacon);
      this.alertBeacons.push(beacon);
    }

    // Sleek central Command Console Desk with glowing buttons & Giant Crimson DO NOT PRESS Button!
    const consoleBody = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, 1.15, 1.6), hullMat, {
      outlineScale: 1.03,
    });
    consoleBody.position.set(0, 0.58, -1.6);
    this.root.add(consoleBody);

    // Glowing cyan screen inset on desk
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), cyanGlow);
    screen.position.set(-1.1, 1.18, -1.6);
    this.root.add(screen);

    // DO NOT PRESS hazard plaque on front of console
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.62),
      new THREE.MeshBasicMaterial({ map: this.createButtonLabelTexture() })
    );
    labelMesh.position.set(0.95, 0.75, -0.78);
    this.root.add(labelMesh);

    // Giant Glowing Red Button Pedestal + Animated Pressable Dome Cap
    const btnRing = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.54, 0.6, 0.16, 14), darkMetal, {
      outlineScale: 1.06,
    });
    btnRing.position.set(0.95, 1.22, -1.55);
    this.root.add(btnRing);

    const btnMat = this.assets.createToonMaterial('mat-red-btn', {
      color: '#FF1E32',
      emissive: '#D90B1C',
      emissiveIntensity: 0.65,
    });
    this.redButtonCap = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 14), btnMat, {
      outlineScale: 1.06,
    });
    this.redButtonCap.position.set(0.95, 1.42, -1.55);
    this.root.add(this.redButtonCap);
  }

  private buildPigeonBarnaby(): void {
    // Original 3D Sculpted Chaotic Pigeon CEO!
    const pigeon = new THREE.Group();
    const greyMat = this.assets.createToonMaterial('mat-pigeon-grey', { color: '#8F9BB3' });
    const neckMat = this.assets.createToonMaterial('mat-pigeon-neck', { color: '#39B8A5' });
    const wingMat = this.assets.createToonMaterial('mat-pigeon-wing', { color: '#616E85' });
    const beakMat = this.assets.createToonMaterial('mat-pigeon-beak', { color: '#FFB72B' });
    const tieMat = this.assets.createToonMaterial('mat-pigeon-tie', { color: '#E62B2B' });
    const whiteMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const blackMat = new THREE.MeshBasicMaterial({ color: '#141414' });

    // Plump oval pigeon body
    const body = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.55, 12, 10), greyMat, { outlineScale: 1.06 });
    body.scale.set(0.92, 0.85, 1.25);
    body.position.set(0, 0.65, 0);
    pigeon.add(body);

    // Iridescent teal-purple pigeon neck collar
    const collar = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.28, 0.38, 0.28, 10), neckMat, {
      outlineScale: 1.08,
    });
    collar.position.set(0, 1.08, 0.22);
    pigeon.add(collar);

    // Crooked red executive power necktie dangling down pigeon chest!
    const tie = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.14, 0.54, 4), tieMat, { outlineScale: 1.1 });
    tie.rotation.x = Math.PI;
    tie.rotation.z = 0.14;
    tie.position.set(0.05, 0.68, 0.56);
    pigeon.add(tie);

    // Head group (bobs & pecks!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.38, 0.32);

    const head = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.36, 12, 10), greyMat, { outlineScale: 1.07 });
    headGroup.add(head);

    // Giant hilarious googly eyes!
    for (const side of [-1, 1]) {
      const eyeWhite = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.16, 10, 10), whiteMat, {
        outlineScale: 1.12,
        castShadow: false,
      });
      eyeWhite.position.set(side * 0.22, 0.06, 0.24);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), blackMat);
      pupil.position.set(side * (0.24 + (side > 0 ? 0.02 : -0.01)), 0.06 + (side > 0 ? 0.03 : -0.02), 0.38);
      headGroup.add(pupil);
    }

    // Bright orange-yellow beak
    const beak = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.11, 0.36, 6), beakMat, { outlineScale: 1.1 });
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.05, 0.44);
    headGroup.add(beak);

    // Popping Golden CEO Crown!
    const crown = new THREE.Group();
    const goldMat = this.assets.createToonMaterial('mat-ceo-crown', {
      color: '#FFD23F',
      emissive: '#E5A100',
      emissiveIntensity: 0.35,
    });
    const band = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.24, 0.2, 0.22, 8), goldMat, {
      outlineScale: 1.09,
    });
    crown.add(band);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const spike = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.07, 0.22, 5), goldMat, {
        outlineScale: 1.12,
      });
      spike.position.set(Math.cos(a) * 0.18, 0.18, Math.sin(a) * 0.18);
      crown.add(spike);
    }
    crown.position.set(0, 0.42, 0);
    crown.visible = false;
    headGroup.add(crown);
    this.pigeonCrown = crown;

    pigeon.add(headGroup);
    this.pigeonHeadGroup = headGroup;

    // Flapping Wings
    const wingGeo = new THREE.SphereGeometry(0.4, 8, 6);
    wingGeo.scale(0.32, 0.65, 1.25);
    this.pigeonWingL = this.assets.createOutlinedMesh(wingGeo, wingMat, { outlineScale: 1.08 });
    this.pigeonWingL.position.set(-0.52, 0.72, -0.05);
    pigeon.add(this.pigeonWingL);

    this.pigeonWingR = this.assets.createOutlinedMesh(wingGeo, wingMat, { outlineScale: 1.08 });
    this.pigeonWingR.position.set(0.52, 0.72, -0.05);
    pigeon.add(this.pigeonWingR);

    // Tiny orange pigeon legs
    for (const lx of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), beakMat);
      leg.position.set(lx, 0.18, 0);
      pigeon.add(leg);
    }

    pigeon.position.set(-0.35, 1.16, -1.55);
    this.root.add(pigeon);
    this.pigeonGroup = pigeon;
  }

  private buildAstronautBuzz(): void {
    // Original 3D Sculpted Retro-Cartoon Astronaut!
    const buzz = new THREE.Group();
    const suitWhite = this.assets.createToonMaterial('mat-eva-white', { color: '#F4F7FA' });
    const suitOrange = this.assets.createToonMaterial('mat-eva-orange', { color: '#FF6B2B' });
    const visorMat = this.assets.createToonMaterial('mat-eva-visor', {
      color: '#19B5FE',
      emissive: '#0B7DC2',
      emissiveIntensity: 0.45,
    });

    // Chunky backpack
    const pack = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.82, 0.96, 0.44), suitOrange, { outlineScale: 1.06 });
    pack.position.set(0, 1.38, -0.42);
    buzz.add(pack);

    // Space suit torso
    const torso = this.assets.createOutlinedMesh(new THREE.CapsuleGeometry(0.46, 0.65, 6, 10), suitWhite, {
      outlineScale: 1.06,
    });
    torso.position.set(0, 1.35, 0);
    buzz.add(torso);

    // Orange chest strap
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 10), suitOrange);
    belt.position.set(0, 1.02, 0);
    buzz.add(belt);

    // Oversized spherical Astronaut Helmet + Glowing Blue Visor!
    const helmet = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.62, 14, 12), suitWhite, {
      outlineScale: 1.055,
    });
    helmet.position.set(0, 2.38, 0);
    buzz.add(helmet);

    const visor = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.48, 12, 10), visorMat, {
      outlineScale: 1.05,
    });
    visor.scale.set(1.0, 0.78, 0.65);
    visor.position.set(0, 2.4, 0.34);
    buzz.add(visor);

    // Limbs
    for (const side of [-1, 1]) {
      const arm = this.assets.createOutlinedMesh(new THREE.CapsuleGeometry(0.14, 0.56, 4, 8), suitWhite, {
        outlineScale: 1.08,
      });
      arm.position.set(side * 0.68, 1.48, 0.1);
      arm.rotation.z = side * 0.55;
      buzz.add(arm);

      const leg = this.assets.createOutlinedMesh(new THREE.CapsuleGeometry(0.16, 0.62, 4, 8), suitWhite, {
        outlineScale: 1.08,
      });
      leg.position.set(side * 0.24, 0.48, 0);
      buzz.add(leg);
    }

    buzz.position.set(-2.5, 0, -0.6);
    this.root.add(buzz);
    this.buzzGroup = buzz;
  }

  private buildAiOrbAstro9000(): void {
    const orb = new THREE.Group();
    const coreMat = this.assets.createToonMaterial('mat-ai-core', {
      color: '#10243C',
      emissive: '#0B4A6E',
      emissiveIntensity: 0.6,
    });
    const glowCyan = new THREE.MeshBasicMaterial({ color: '#2BF5FF' });

    const sphere = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.52, 14, 12), coreMat, {
      outlineScale: 1.06,
    });
    orb.add(sphere);

    // Digital glowing cyan eyes on orb front
    for (const ex of [-0.18, 0.18]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), glowCyan);
      eye.position.set(ex, 0.06, 0.48);
      orb.add(eye);
    }

    this.aiRingA = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.045, 8, 22), glowCyan);
    orb.add(this.aiRingA);

    this.aiRingB = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.035, 8, 22), new THREE.MeshBasicMaterial({ color: '#FF3EB5' }));
    this.aiRingB.rotation.x = Math.PI / 2;
    orb.add(this.aiRingB);

    orb.position.set(2.5, 2.7, -2.0);
    this.root.add(orb);
    this.aiOrbGroup = orb;
  }

  private createDonut(scale = 1.0): THREE.Group {
    const donut = new THREE.Group();
    const doughMat = this.assets.createToonMaterial('mat-donut-dough', { color: '#E3A857' });
    const icingMat = this.assets.createToonMaterial('mat-donut-icing', { color: '#FF6BB5' });
    const base = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.38, 0.18, 10, 18), doughMat, {
      outlineScale: 1.07,
    });
    donut.add(base);
    const icing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.16, 10, 18), icingMat);
    icing.position.z = 0.04;
    donut.add(icing);

    const sprinkleColors = ['#FFE047', '#2BF5FF', '#FFFFFF', '#4DFF88'];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.12, 0.05),
        new THREE.MeshBasicMaterial({ color: sprinkleColors[i % 4] })
      );
      sp.position.set(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.19);
      sp.rotation.z = a + 0.5;
      donut.add(sp);
    }

    donut.scale.setScalar(scale);
    return donut;
  }

  private buildZeroGPropsAndHologram(): void {
    // Giant Hero Pink Sprinkle Donut
    this.heroDonutGroup = this.createDonut(1.35);
    this.heroDonutGroup.position.set(0.95, 2.35, -1.5);
    this.root.add(this.heroDonutGroup);

    // Zero-G floating donuts & coffee spheres
    const rng = createSeededRng(7001);
    const coffeeMat = this.assets.createToonMaterial('mat-coffee-orb', { color: '#593318' });
    for (let i = 0; i < 9; i++) {
      const mesh = i < 4 ? this.createDonut(0.65) : this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.18, 10, 8), coffeeMat, { outlineScale: 1.09 });
      const base = new THREE.Vector3(-3.2 + rng() * 6.4, 1.4 + rng() * 3.2, -3.5 + rng() * 4.5);
      mesh.position.copy(base);
      mesh.visible = false;
      this.root.add(mesh);
      this.zeroGItems.push({ mesh, base, phase: rng() * Math.PI * 2, spin: 1.2 + rng() * 2.2 });
    }

    // Holographic Neon-Green Rising +9000% Stock Chart!
    const chart = new THREE.Group();
    const barMat = new THREE.MeshBasicMaterial({ color: '#39FF88', transparent: true, opacity: 0.85 });
    const heights = [0.6, 1.1, 1.8, 2.7, 3.8];
    heights.forEach((h, i) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.0, 0.18), barMat);
      bar.position.set(-1.1 + i * 0.55, 0.5, 0);
      chart.add(bar);
      this.holoBars.push({ mesh: bar, targetH: h });
    });
    chart.position.set(0, 2.2, -3.2);
    chart.visible = false;
    this.root.add(chart);
    this.holoChartGroup = chart;

    // Golden Breadcrumb Rain particles!
    const crumbMat = this.assets.createToonMaterial('mat-crumb', { color: '#F5C542', emissive: '#D49A1A', emissiveIntensity: 0.35 });
    const crumbGeo = new THREE.DodecahedronGeometry(0.12, 0);
    for (let i = 0; i < 32; i++) {
      const m = new THREE.Mesh(crumbGeo, crumbMat);
      m.visible = false;
      this.root.add(m);
      this.breadcrumbs.push({ mesh: m, bx: -4.2 + rng() * 8.4, bz: -3.5 + rng() * 5.0, phase: rng() });
    }
  }

  public update(env: EnvironmentState, sceneProgress: number, sceneElapsedSeconds: number, globalSeconds: number): void {
    const isSpace = env.worldTheme === 'space_chaos';
    this.root.visible = isSpace;
    if (!isSpace) return;

    const st = env.spaceState ?? {
      redAlert: false,
      zeroGravity: false,
      buttonPressed: false,
      pigeonCrown: false,
      buzzFloatingOutside: false,
      showHologramChart: false,
      breadcrumbRain: false,
      pigeonPecking: false,
      donutFocus: false,
    };

    // 1. Rotate Earth & orbit Moon majestically
    this.earthMesh.rotation.y = globalSeconds * 0.12;
    this.moonMesh.position.set(
      -2.2 + Math.cos(globalSeconds * 0.25) * 10.5,
      5.8 + Math.sin(globalSeconds * 0.25) * 2.2,
      -22
    );

    // 2. Red Alert pulsing bridge beacons
    const alertPulse = st.redAlert ? (Math.sin(globalSeconds * 14) > 0 ? 1 : 0.2) : 0.15;
    for (const b of this.alertBeacons) {
      const mat = b.material as THREE.MeshBasicMaterial;
      mat.color.setRGB(st.redAlert ? alertPulse : 0.15, st.redAlert ? 0.08 : 0.85, st.redAlert ? 0.12 : 0.95);
    }

    // 3. Red button depressed state
    this.redButtonCap.position.y = st.buttonPressed ? 1.28 : 1.42;

    // 4. Pigeon CEO Barnaby animation (pecking, wing flapping, zero-G bobbing, golden crown pop!)
    const bobY = st.zeroGravity ? Math.sin(globalSeconds * 3.5) * 0.25 + 0.25 : Math.abs(Math.sin(globalSeconds * 7)) * 0.06;
    this.pigeonGroup.position.set(st.buttonPressed ? 0.65 : -0.35, 1.16 + bobY, -1.55);
    this.pigeonGroup.rotation.y = Math.sin(globalSeconds * 2.2) * 0.28;
    const flap = st.zeroGravity || st.pigeonPecking ? Math.sin(globalSeconds * 22) * 0.7 : Math.sin(globalSeconds * 4) * 0.12;
    this.pigeonWingL.rotation.z = flap;
    this.pigeonWingR.rotation.z = -flap;
    this.pigeonHeadGroup.rotation.x = st.pigeonPecking ? Math.abs(Math.sin(globalSeconds * 18)) * 0.72 : Math.sin(globalSeconds * 6) * 0.12;

    this.pigeonCrown.visible = st.pigeonCrown;
    if (st.pigeonCrown) {
      const cp = springPop(sceneElapsedSeconds, 260, 14);
      this.pigeonCrown.scale.setScalar(clamp(cp, 0.01, 1.2));
    }

    // 5. Astronaut Commander Buzz (standing -> tumbling upside down in zero-G -> floating outside window!)
    if (st.buzzFloatingOutside) {
      this.buzzGroup.position.set(-2.6 + Math.sin(globalSeconds * 1.4) * 0.5, 3.0 + Math.sin(globalSeconds * 2.2) * 0.45, -7.8);
      this.buzzGroup.rotation.set(Math.sin(globalSeconds * 1.8) * 0.35, 0.3, Math.sin(globalSeconds * 1.5) * 0.4);
    } else if (st.zeroGravity) {
      this.buzzGroup.position.set(-2.1 + Math.sin(globalSeconds * 1.6) * 0.8, 2.7 + Math.cos(globalSeconds * 2.1) * 0.5, -0.8);
      this.buzzGroup.rotation.set(globalSeconds * 1.4, globalSeconds * 1.1, globalSeconds * 1.8);
    } else {
      this.buzzGroup.position.set(-2.4, 0, -0.5);
      this.buzzGroup.rotation.set(0, 0.45, 0);
    }

    // 6. ASTRO-9000 AI Orb hovering & spinning holographic gyro rings
    this.aiOrbGroup.position.y = 2.85 + Math.sin(globalSeconds * 3.2) * 0.22;
    this.aiRingA.rotation.x = globalSeconds * 2.2;
    this.aiRingA.rotation.y = globalSeconds * 1.5;
    this.aiRingB.rotation.z = -globalSeconds * 2.6;

    // 7. Hero Donut & Zero-G floating debris
    this.heroDonutGroup.visible = st.donutFocus || st.zeroGravity;
    this.heroDonutGroup.position.y = 2.35 + Math.sin(globalSeconds * 3.0) * 0.2;
    this.heroDonutGroup.rotation.set(globalSeconds * 1.4, globalSeconds * 2.1, 0);

    for (const item of this.zeroGItems) {
      item.mesh.visible = st.zeroGravity;
      if (!st.zeroGravity) continue;
      item.mesh.position.set(
        item.base.x + Math.sin(globalSeconds * 1.5 + item.phase) * 0.55,
        item.base.y + Math.cos(globalSeconds * 1.8 + item.phase) * 0.45,
        item.base.z
      );
      item.mesh.rotation.set(globalSeconds * item.spin, globalSeconds * item.spin * 0.8, 0);
    }

    // 8. Holographic +9000% rising bar chart
    this.holoChartGroup.visible = st.showHologramChart;
    if (st.showHologramChart) {
      const grow = clamp(sceneProgress * 1.3, 0.05, 1);
      for (const b of this.holoBars) {
        const curH = Math.max(0.1, b.targetH * grow);
        b.mesh.scale.set(1, curH, 1);
        b.mesh.position.y = curH * 0.5;
      }
    }

    // 9. Golden Breadcrumb Rain
    for (const c of this.breadcrumbs) {
      c.mesh.visible = st.breadcrumbRain;
      if (!st.breadcrumbRain) continue;
      const t = (globalSeconds * 0.45 + c.phase) % 1;
      c.mesh.position.set(c.bx + Math.sin(globalSeconds * 3 + c.phase * 6) * 0.3, 6.2 - t * 6.0, c.bz);
      c.mesh.rotation.set(globalSeconds * 3, globalSeconds * 2.2, 0);
    }
  }
}
