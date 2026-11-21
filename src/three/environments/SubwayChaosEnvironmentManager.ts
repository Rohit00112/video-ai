import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, lerp } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

type MachineMood = 'idle' | 'greedy' | 'evil' | 'smug';

/**
 * Brand-new Midnight Neon Synthwave Subway Comedy World ("Never Buy the $0.99 Mystery Snack at 2 AM"):
 * - Moody purple-and-teal tiled subway platform with flickering overhead neon tubes & 2:00 AM clock
 * - Roaring animated 3D Neon Subway Train blasting across the background tracks
 * - Towering Sentient 3D Vending Machine (VEND-O-TRON) with animated LED face & dangling golden snack
 * - Original 3D Sculpted Mint-Hoodie Character Milo (NOT a stickman!) with huge dark eyebags & coffee cup
 * - Chaotic physics eruption of bouncing neon balls, golden bowling ball, rubber duck, and tiny pretzel!
 */
export class SubwayChaosEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private vendingGroup!: THREE.Group;
  private faceCanvas!: HTMLCanvasElement;
  private faceTex!: THREE.CanvasTexture;
  private lastFaceKey = '';
  private danglingSnack!: THREE.Group;
  private miloGroup!: THREE.Group;
  private miloArmR!: THREE.Group;
  private subwayTrain!: THREE.Group;
  private ceilingLights: THREE.Mesh[] = [];
  private chaosBalls: { mesh: THREE.Object3D; vx: number; vy: number; vz: number; phase: number }[] = [];
  private tinyPretzel!: THREE.Group;

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'SubwayChaosRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildSubwayPlatform();
    this.buildSubwayTrain();
    this.buildSentientVendingMachine();
    this.buildHoodieMilo();
    this.buildChaosEruptionProps();
  }

  private createCheckeredFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const sq = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#241B3D' : '#17112B';
        ctx.fillRect(x * sq, y * sq, sq, sq);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createClockSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0B0718';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#FF2E93';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 140);
    ctx.fillStyle = '#2AF598';
    ctx.font = '900 84px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2:00 AM', 256, 84);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildSubwayPlatform(): void {
    // Checkered dark synthwave subway platform floor
    const floorMat = this.assets.createToonMaterial('mat-sub-floor', {
      color: '#FFFFFF',
      map: this.createCheckeredFloorTexture(),
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 14), floorMat);
    floor.position.set(0, -0.2, 2);
    floor.receiveShadow = true;
    this.root.add(floor);

    // Bright yellow platform safety edge line
    const safety = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.05, 0.45),
      new THREE.MeshBasicMaterial({ color: '#FFE047' })
    );
    safety.position.set(0, 0.03, -4.6);
    this.root.add(safety);

    // Deep dark track pit behind platform
    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 12),
      new THREE.MeshBasicMaterial({ color: '#090612' })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, -1.2, -9);
    this.root.add(trackFloor);

    // Subway tiled back wall across tracks
    const wallMat = this.assets.createToonMaterial('mat-sub-wall', { color: '#271A48' });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(34, 9.5, 0.6), wallMat);
    backWall.position.set(0, 3.8, -12.8);
    this.root.add(backWall);

    // Neon magenta wall stripe
    const neonMagenta = new THREE.MeshBasicMaterial({ color: '#FF2E93' });
    const neonMint = new THREE.MeshBasicMaterial({ color: '#2AF598' });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(34, 0.25, 0.12), neonMagenta);
    stripe.position.set(0, 3.2, -12.45);
    this.root.add(stripe);

    // Structural subway I-beam pillars
    const pillarMat = this.assets.createToonMaterial('mat-sub-pillar', { color: '#392861' });
    for (const px of [-5.2, 5.2]) {
      const p = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.7, 7.5, 0.7), pillarMat, { outlineScale: 1.05 });
      p.position.set(px, 3.75, -3.8);
      this.root.add(p);
    }

    // Glowing "2:00 AM" hanging subway clock sign
    const clockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.0, 0.2),
      new THREE.MeshBasicMaterial({ map: this.createClockSignTexture() })
    );
    clockMesh.position.set(-2.0, 4.95, -3.2);
    this.root.add(clockMesh);

    // Flickering overhead neon fluorescent tubes
    for (const lx of [-3.5, 0, 3.5]) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.24), neonMint.clone());
      tube.position.set(lx, 6.2, -1.0);
      this.root.add(tube);
      this.ceilingLights.push(tube);
    }
  }

  private buildSubwayTrain(): void {
    const train = new THREE.Group();
    const carMat = this.assets.createToonMaterial('mat-train-car', { color: '#35265C' });
    const winMat = new THREE.MeshBasicMaterial({ color: '#45F0DF' });
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#FF2E93' });

    for (let c = 0; c < 3; c++) {
      const cx = c * 11.2;
      const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(10.4, 3.4, 2.8), carMat, { outlineScale: 1.02 });
      body.position.set(cx, 1.1, 0);
      train.add(body);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.45, 0.28, 2.88), stripeMat);
      stripe.position.set(cx, 0.65, 0);
      train.add(stripe);

      for (let w = -3.4; w <= 3.4; w += 1.7) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.1, 2.9), winMat);
        win.position.set(cx + w, 1.7, 0);
        train.add(win);
      }
    }

    train.position.set(-28, -0.4, -8.5);
    train.visible = false;
    this.root.add(train);
    this.subwayTrain = train;
  }

  private buildSentientVendingMachine(): void {
    const vm = new THREE.Group();
    const chassisMat = this.assets.createToonMaterial('mat-vm-body', { color: '#3A1D6E' });
    const trimMagenta = new THREE.MeshBasicMaterial({ color: '#FF2E93' });
    const trimMint = new THREE.MeshBasicMaterial({ color: '#2AF598' });
    const darkGlass = this.assets.createToonMaterial('mat-vm-glass', { color: '#140C29' });

    // Towering vending machine cabinet
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.55, 4.15, 1.55), chassisMat, {
      outlineScale: 1.03,
    });
    body.position.y = 2.08;
    vm.add(body);

    // Neon glowing edge strips
    for (const sx of [-1.26, 1.26]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.1, 0.12), trimMagenta);
      strip.position.set(sx, 2.08, 0.78);
      vm.add(strip);
    }

    // Animated Sentient LED Face Display Screen at the top of the machine!
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 512;
    this.faceCanvas.height = 220;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 0.92),
      new THREE.MeshBasicMaterial({ map: this.faceTex })
    );
    faceMesh.position.set(0, 3.45, 0.8);
    vm.add(faceMesh);

    // Recessed snack showcase window
    const showcase = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.75, 0.14), darkGlass);
    showcase.position.set(-0.24, 1.98, 0.74);
    vm.add(showcase);

    // Colorful mystery snack packs inside showcase
    const snackCols = ['#FF5E5B', '#FFE047', '#2AF598', '#35A3E8', '#FF85C0'];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const pack = this.assets.createOutlinedMesh(
          new THREE.BoxGeometry(0.36, 0.48, 0.18),
          this.assets.createToonMaterial(`mat-snack-${row * 3 + col}`, { color: snackCols[(row * 3 + col) % 5] }),
          { outlineScale: 1.08 }
        );
        pack.position.set(-0.72 + col * 0.48, 2.42 - row * 0.76, 0.82);
        vm.add(pack);
      }
    }

    // Dangling Golden Glowing Mystery Snack stuck by 1 millimeter!
    const dangler = new THREE.Group();
    const goldPack = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(0.46, 0.58, 0.22),
      this.assets.createToonMaterial('mat-mystery-gold', {
        color: '#FFE047',
        emissive: '#FFAE00',
        emissiveIntensity: 0.65,
      }),
      { outlineScale: 1.08 }
    );
    dangler.add(goldPack);
    dangler.position.set(-0.24, 1.56, 0.98);
    dangler.visible = false;
    vm.add(dangler);
    this.danglingSnack = dangler;

    // Keypad & glowing "$0.99" button on right side
    const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.1), trimMint);
    keypad.position.set(0.86, 2.05, 0.78);
    vm.add(keypad);

    // Chomping delivery chute flap at bottom
    const chute = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.68, 0.16), darkGlass);
    chute.position.set(0, 0.56, 0.76);
    vm.add(chute);

    vm.position.set(1.25, 0, -1.8);
    vm.rotation.y = -0.22;
    this.root.add(vm);
    this.vendingGroup = vm;
  }

  private redrawVendingFace(mood: MachineMood, blink: boolean): void {
    const key = `${mood}|${blink ? 1 : 0}`;
    if (this.lastFaceKey === key) return;
    this.lastFaceKey = key;

    const ctx = this.faceCanvas.getContext('2d')!;
    ctx.fillStyle = '#0E0720';
    ctx.fillRect(0, 0, 512, 220);

    ctx.strokeStyle = mood === 'evil' ? '#FF2E93' : '#2AF598';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 204);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (mood === 'greedy') {
      ctx.fillStyle = '#2AF598';
      ctx.font = '900 104px "Arial Black", sans-serif';
      ctx.fillText('$   $', 256, 98);
      ctx.font = '900 38px "Courier New", monospace';
      ctx.fillText('MYSTERY $0.99', 256, 174);
    } else if (mood === 'evil') {
      ctx.fillStyle = '#FF2E93';
      ctx.font = '900 112px "Arial Black", sans-serif';
      ctx.fillText('> : D', 256, 102);
      ctx.fillStyle = '#FFE047';
      ctx.font = '900 34px "Arial Black", sans-serif';
      ctx.fillText('CHAOS MODE ENGAGED', 256, 178);
    } else if (mood === 'smug') {
      ctx.fillStyle = '#2AF598';
      ctx.fillRect(110, 52, 115, 58);
      ctx.fillRect(287, 52, 115, 58);
      ctx.fillRect(225, 72, 62, 16);
      ctx.strokeStyle = '#FFE047';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(256, 140, 48, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      // Idle mysterious glowing eyes
      ctx.fillStyle = '#2AF598';
      if (blink) {
        ctx.fillRect(132, 84, 72, 14);
        ctx.fillRect(308, 84, 72, 14);
      } else {
        ctx.beginPath();
        ctx.arc(168, 88, 32, 0, Math.PI * 2);
        ctx.arc(344, 88, 32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFE047';
      ctx.font = '900 38px "Courier New", monospace';
      ctx.fillText('MYSTERY  $0.99', 256, 172);
    }

    this.faceTex.needsUpdate = true;
  }

  private buildHoodieMilo(): void {
    // Original 3D Sculpted Lanky Mint-Hoodie Character (TOTALLY different silhouette from stickmen!)
    const milo = new THREE.Group();
    const hoodieMat = this.assets.createToonMaterial('mat-milo-hoodie', { color: '#3DE0A8' });
    const pantsMat = this.assets.createToonMaterial('mat-milo-pants', { color: '#272940' });
    const skinMat = this.assets.createToonMaterial('mat-milo-skin', { color: '#FFE0C4' });
    const hairMat = this.assets.createToonMaterial('mat-milo-hair', { color: '#231C30' });
    const bagMat = this.assets.createToonMaterial('mat-milo-bags', { color: '#6E5B94' });

    // Oversized triangular boxy hoodie torso
    const torso = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.68, 1.38, 6), hoodieMat, {
      outlineScale: 1.06,
    });
    torso.position.y = 1.38;
    milo.add(torso);

    // Sculpted hoodie collar ring around neck
    const hood = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.42, 0.15, 8, 12), hoodieMat, {
      outlineScale: 1.07,
    });
    hood.rotation.x = Math.PI / 2;
    hood.position.y = 1.98;
    milo.add(hood);

    // Tall quirky rectangular-rounded cartoon head
    const head = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.76, 0.86, 0.72), skinMat, {
      outlineScale: 1.06,
    });
    head.position.y = 2.46;
    milo.add(head);

    // Messy spiky hair tuft on top
    for (let i = -1; i <= 1; i++) {
      const tuft = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.22, 0.45, 5), hairMat, {
        outlineScale: 1.09,
      });
      tuft.position.set(i * 0.22, 3.04, 0);
      tuft.rotation.z = -i * 0.25;
      milo.add(tuft);
    }

    // Giant tired eyes + purple sleep-deprived eyebags!
    const eyeWhite = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#141414' });
    for (const side of [-1, 1]) {
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeWhite);
      ew.position.set(side * 0.19, 2.52, 0.35);
      milo.add(ew);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), pupilMat);
      p.position.set(side * 0.19, 2.52, 0.46);
      milo.add(p);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), bagMat);
      bag.position.set(side * 0.19, 2.34, 0.37);
      milo.add(bag);
    }

    // Left arm holding giant coffee cup + Right arm (taps machine / panics!)
    const armL = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.12, 0.11, 0.82, 6), hoodieMat, {
      outlineScale: 1.08,
    });
    armL.position.set(-0.56, 1.48, 0.12);
    armL.rotation.z = 0.35;
    milo.add(armL);

    const cup = this.assets.createOutlinedMesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.36, 8),
      this.assets.createToonMaterial('mat-coffee-cup', { color: '#FFFFFF' }),
      { outlineScale: 1.1 }
    );
    cup.position.set(-0.74, 1.15, 0.26);
    milo.add(cup);

    this.miloArmR = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.12, 0.11, 0.88, 6), hoodieMat, {
      outlineScale: 1.08,
    });
    this.miloArmR.position.set(0.58, 1.56, 0.16);
    this.miloArmR.rotation.z = -0.45;
    milo.add(this.miloArmR);

    // Lanky legs
    for (const lx of [-0.22, 0.22]) {
      const leg = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.13, 0.11, 0.92, 6), pantsMat, {
        outlineScale: 1.08,
      });
      leg.position.set(lx, 0.46, 0);
      milo.add(leg);
    }

    milo.position.set(-1.35, 0, -0.5);
    milo.rotation.y = 0.45;
    this.root.add(milo);
    this.miloGroup = milo;
  }

  private buildChaosEruptionProps(): void {
    const rng = createSeededRng(20002);
    const colors = ['#FF2E93', '#2AF598', '#FFE047', '#2BF5FF', '#FF7833', '#A96BFF'];

    // 24 neon bouncy balls + 1 giant golden bowling ball + 1 yellow rubber duck exploding from the chute!
    for (let i = 0; i < 26; i++) {
      let mesh: THREE.Object3D;
      if (i === 0) {
        // Giant shiny golden bowling ball!
        mesh = this.assets.createOutlinedMesh(
          new THREE.SphereGeometry(0.42, 12, 10),
          this.assets.createToonMaterial('mat-bowling', { color: '#F5C542' }),
          { outlineScale: 1.07 }
        );
      } else if (i === 1) {
        // Plump bright-yellow cartoon Rubber Duck!
        const duck = new THREE.Group();
        const yMat = this.assets.createToonMaterial('mat-duck-y', { color: '#FFE047' });
        const oMat = this.assets.createToonMaterial('mat-duck-o', { color: '#FF7833' });
        const db = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.32, 10, 8), yMat, { outlineScale: 1.08 });
        const dh = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.22, 10, 8), yMat, { outlineScale: 1.08 });
        dh.position.set(0.18, 0.28, 0);
        const bill = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.09, 0.2, 5), oMat, { outlineScale: 1.1 });
        bill.rotation.z = -Math.PI / 2;
        bill.position.set(0.38, 0.25, 0);
        duck.add(db, dh, bill);
        mesh = duck;
      } else {
        const bMat = this.assets.createToonMaterial(`mat-cball-${i % 6}`, { color: colors[i % 6] });
        mesh = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.16 + rng() * 0.1, 8, 8), bMat, {
          outlineScale: 1.1,
        });
      }

      mesh.visible = false;
      this.root.add(mesh);
      this.chaosBalls.push({
        mesh,
        vx: -2.6 + rng() * 4.0,
        vy: 3.2 + rng() * 3.2,
        vz: 0.9 + rng() * 2.1,
        phase: (i / 26) * 0.9,
      });
    }

    // Tiny lonely golden pretzel at the end!
    const pretzelMat = this.assets.createToonMaterial('mat-pretzel', { color: '#C67B2E' });
    this.tinyPretzel = this.assets.createOutlinedMesh(new THREE.TorusKnotGeometry(0.14, 0.045, 28, 6, 2, 3), pretzelMat, {
      outlineScale: 1.12,
    });
    this.tinyPretzel.position.set(0.45, 0.2, 0.35);
    this.tinyPretzel.visible = false;
    this.root.add(this.tinyPretzel);
  }

  public update(env: EnvironmentState, sceneProgress: number, globalSeconds: number): void {
    const isSubway = env.worldTheme === 'subway_chaos';
    this.root.visible = isSubway;
    if (!isSubway) return;

    const st = env.subwayState ?? {
      machineMood: 'idle',
      snackDangling: false,
      machineRageShake: false,
      eruptionActive: false,
      trainPassing: false,
      flickerLights: false,
      miloPose: 'staring',
      showTinyPretzel: false,
    };

    // 1. Update Sentient Vending Machine LED Face + rage shaking
    const blink = (globalSeconds % 3.1) > 2.94;
    this.redrawVendingFace(st.machineMood, blink);

    if (st.machineRageShake) {
      this.vendingGroup.position.set(
        1.25 + Math.sin(globalSeconds * 55) * 0.16,
        Math.abs(Math.sin(globalSeconds * 42)) * 0.14,
        -1.8
      );
      this.vendingGroup.rotation.z = Math.sin(globalSeconds * 48) * 0.06;
    } else {
      this.vendingGroup.position.set(1.25, 0, -1.8);
      this.vendingGroup.rotation.z = 0;
    }

    // 2. Dangling golden mystery snack swinging precariously by 1 millimeter!
    this.danglingSnack.visible = st.snackDangling;
    if (st.snackDangling) {
      this.danglingSnack.rotation.z = Math.sin(globalSeconds * 8.5) * 0.22;
    }

    // 3. Flickering fluorescent subway lights
    this.ceilingLights.forEach((tube, idx) => {
      const mat = tube.material as THREE.MeshBasicMaterial;
      const on = !st.flickerLights || Math.sin(globalSeconds * (24 + idx * 9)) > -0.35;
      mat.color.set(on ? '#2AF598' : '#18242E');
    });

    // 4. Roaring Neon Subway Train blasting across background tracks!
    this.subwayTrain.visible = st.trainPassing;
    if (st.trainPassing) {
      this.subwayTrain.position.x = lerp(-34, 24, sceneProgress);
    }

    // 5. Milo animations (staring, politely tapping machine, leaping back in panic, slumped defeated)
    if (st.miloPose === 'tapping') {
      this.miloGroup.position.set(-0.55, 0, -0.8);
      this.miloGroup.rotation.set(0, 0.72, 0);
      this.miloArmR.rotation.z = -1.25 + Math.sin(globalSeconds * 16) * 0.35;
    } else if (st.miloPose === 'panicking') {
      this.miloGroup.position.set(-1.95 + Math.sin(globalSeconds * 14) * 0.15, Math.abs(Math.sin(globalSeconds * 15)) * 0.28, 0.2);
      this.miloGroup.rotation.set(-0.14, 0.5, Math.sin(globalSeconds * 18) * 0.08);
      this.miloArmR.rotation.z = -2.4;
    } else if (st.miloPose === 'defeated') {
      this.miloGroup.position.set(-1.3, -0.22, -0.2);
      this.miloGroup.rotation.set(0.24, 0.55, 0);
      this.miloArmR.rotation.z = -0.2;
    } else {
      this.miloGroup.position.set(-1.35, Math.sin(globalSeconds * 3) * 0.03, -0.5);
      this.miloGroup.rotation.set(0, 0.55, 0);
      this.miloArmR.rotation.z = -0.45;
    }

    // 6. Ballistic eruption of neon balls, bowling ball, & rubber duck shooting out of vending chute!
    for (const b of this.chaosBalls) {
      b.mesh.visible = st.eruptionActive;
      if (!st.eruptionActive) continue;
      const t = (globalSeconds * 1.45 + b.phase) % 1.35;
      const g = -12.5;
      const rawY = 0.58 + b.vy * t + 0.5 * g * t * t;
      // Elastic floor bounce!
      const y = rawY < 0.22 ? 0.22 + Math.abs(rawY - 0.22) * 0.55 : rawY;
      b.mesh.position.set(1.1 + b.vx * t, clamp(y, 0.2, 6), -1.0 + b.vz * t);
      b.mesh.rotation.set(globalSeconds * 6, globalSeconds * 4, 0);
    }

    // 7. Tiny lonely pretzel on floor
    this.tinyPretzel.visible = st.showTinyPretzel;
    if (st.showTinyPretzel) {
      this.tinyPretzel.rotation.y = globalSeconds * 2.5;
    }
  }
}
