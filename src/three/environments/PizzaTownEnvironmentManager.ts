import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, easeInOutCubic, easeOutCubic, lerp, springPop } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

type PizzaState = NonNullable<EnvironmentState['pizzaState']>;

const DEFAULT_STATE: PizzaState = {
  heroPizzaDrop: false,
  pizzaRain: false,
  boxStackLevel: 0,
  ovenBlazing: false,
  moldLevel: 0,
  seagullHeist: false,
  vaultOpen: false,
  freezerReveal: false,
  tacoReveal: false,
  stageActive: false,
  confetti: false,
};

const BANK_Z = -14;
const FACADE_Z = BANK_Z + 3; // front face of the bank body
const MOLD_GREEN = new THREE.Color('#8FD14F');
const WHITE = new THREE.Color('#FFFFFF');

/** HDR "emissive" basic material: values > 1 survive the HalfFloat target and feed the bloom pass */
function glowMaterial(hex: string, intensity: number, opts: { transparent?: boolean; opacity?: number } = {}): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    depthWrite: !(opts.transparent ?? false),
  });
  m.color.multiplyScalar(intensity);
  return m;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, h = size): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawPizza(ctx: CanvasRenderingContext2D, s: number, moldy: boolean, seed: number): void {
  const rng = createSeededRng(seed);
  const c = s / 2;
  ctx.clearRect(0, 0, s, s);
  // Crust
  ctx.fillStyle = '#C9822F';
  ctx.beginPath();
  ctx.arc(c, c, c * 0.99, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E3A24A';
  ctx.beginPath();
  ctx.arc(c, c, c * 0.93, 0, Math.PI * 2);
  ctx.fill();
  // Sauce
  ctx.fillStyle = '#D8352A';
  ctx.beginPath();
  ctx.arc(c, c, c * 0.84, 0, Math.PI * 2);
  ctx.fill();
  // Cheese blobs
  ctx.fillStyle = '#FFD45C';
  ctx.beginPath();
  ctx.arc(c, c, c * 0.79, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * c * 0.7;
    ctx.fillStyle = rng() > 0.5 ? '#FFE48A' : '#F7BE3E';
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 14 + rng() * 26, 10 + rng() * 18, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pepperoni
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rng() * 0.4;
    const r = (i % 3 === 0 ? 0.22 : 0.55) * c + rng() * 20;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    const pr = s * 0.065;
    ctx.fillStyle = '#A61E22';
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C7342F';
    ctx.beginPath();
    ctx.arc(x - pr * 0.15, y - pr * 0.15, pr * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7E1316';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x + (rng() - 0.5) * pr, y + (rng() - 0.5) * pr, pr * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Basil
  ctx.fillStyle = '#2E8B3A';
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * c * 0.6;
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 16, 8, a, 0, Math.PI * 2);
    ctx.fill();
  }
  if (moldy) {
    // Fuzzy green-grey mold colonies
    for (let i = 0; i < 34; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * c * 0.85;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      const rr = 18 + rng() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rng() > 0.5 ? 'rgba(122,176,58,0.95)' : 'rgba(170,190,150,0.9)');
      g.addColorStop(1, 'rgba(90,140,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ink rim
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = s * 0.018;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.985, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Pizza Town — sun-drenched Italian piazza where pizza is the national currency.
 * Hero set pieces: Pizza Bank (columns + spinning pizza emblem + pizza vault door),
 * wood-fired "money printer" oven, glowing freezer, mayor stage, dynamic law board,
 * HDR string lights, pizza rain, rising pizza-box mountains, mold mode, seagull heist,
 * giant taco reveal, confetti, and a Leaning Tower of Pizza on the horizon.
 */
export class PizzaTownEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private pizzaTex!: THREE.CanvasTexture;
  private moldyTex!: THREE.CanvasTexture;
  private readonly pizzaTopMaterials: THREE.MeshToonMaterial[] = [];

  private clouds: { obj: THREE.Object3D; baseX: number; speed: number }[] = [];
  private bulbs: { mat: THREE.MeshBasicMaterial; base: THREE.Color; phase: number }[] = [];
  private emblem!: THREE.Object3D;
  private vaultDoor!: THREE.Group;

  private ovenFire!: THREE.Mesh;
  private ovenFireMat!: THREE.MeshBasicMaterial;
  private ovenSmoke: THREE.Mesh[] = [];
  private ovenFlyers: THREE.Object3D[] = [];

  private boxInstances!: THREE.InstancedMesh;
  private boxOutline!: THREE.InstancedMesh;
  private boxCount = 0;

  private rainSlices!: THREE.InstancedMesh;
  private rainData: { x: number; z: number; phase: number; speed: number; spin: number }[] = [];
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpScale = new THREE.Vector3();

  private heroPizza!: THREE.Group;
  private heroPizzaFace!: THREE.Group;
  private dustRing!: THREE.Mesh;

  private stinkClouds: { mesh: THREE.Mesh; x: number; z: number; phase: number }[] = [];
  private gulls: { group: THREE.Group; wingL: THREE.Object3D; wingR: THREE.Object3D; loot: THREE.Object3D; seed: number }[] = [];
  private gullGroup!: THREE.Group;

  private freezer!: THREE.Group;
  private freezerLid!: THREE.Group;
  private freezerGlowMat!: THREE.MeshBasicMaterial;
  private frostPuffs: THREE.Mesh[] = [];

  private stage!: THREE.Group;
  private taco!: THREE.Group;

  private confetti!: THREE.InstancedMesh;
  private confettiData: { x: number; z: number; phase: number; speed: number; spin: number }[] = [];

  private signCanvas!: HTMLCanvasElement;
  private signTex!: THREE.CanvasTexture;
  private signGroup!: THREE.Group;
  private lastSignKey = '';

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'PizzaTownRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.pizzaTex = canvasTexture(512, (ctx, s) => drawPizza(ctx, s, false, 77));
    this.moldyTex = canvasTexture(512, (ctx, s) => drawPizza(ctx, s, true, 77));

    this.buildGroundAndBackdrop();
    this.buildBuildings();
    this.buildBank();
    this.buildStringLights();
    this.buildOven();
    this.buildBoxStacks();
    this.buildPizzaRain();
    this.buildHeroPizza();
    this.buildStink();
    this.buildSeagulls();
    this.buildFreezer();
    this.buildStageAndTaco();
    this.buildConfetti();
    this.buildSignBoard();
  }

  // ---------------------------------------------------------------- helpers

  private toon(key: string, color: string): THREE.MeshToonMaterial {
    return this.assets.createToonMaterial(`pz-${key}`, { color });
  }

  /** Pizza disc / wedge: cylinder whose top cap UV maps the full pizza texture */
  private makePizzaMesh(radius: number, thickness: number, thetaStart = 0, thetaLength = Math.PI * 2): THREE.Group {
    const top = new THREE.MeshToonMaterial({
      color: '#FFFFFF',
      map: this.pizzaTex,
      gradientMap: this.assets.getToonGradientMap(),
    });
    this.pizzaTopMaterials.push(top);
    const crust = this.toon('crust', '#C9822F');
    const geo = new THREE.CylinderGeometry(radius, radius, thickness, 40, 1, false, thetaStart, thetaLength);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geo, [crust, top, crust]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const outline = new THREE.Mesh(geo, this.assets.getOutlineMaterial());
    outline.scale.set(1.04, 1.25, 1.04);
    group.add(outline);
    return group;
  }

  private makeSliceGeometry(): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(0.55, 0.55, 0.07, 10, 1, false, -Math.PI / 8, Math.PI / 4);
  }

  // ---------------------------------------------------------------- build

  private buildGroundAndBackdrop(): void {
    const cobble = canvasTexture(512, (ctx, s) => {
      const rng = createSeededRng(311);
      ctx.fillStyle = '#B88A62';
      ctx.fillRect(0, 0, s, s);
      const cell = s / 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const ox = (y % 2) * cell * 0.5;
          const shade = 0.85 + rng() * 0.25;
          const r = Math.floor(222 * shade);
          const g = Math.floor(186 * shade);
          const b = Math.floor(140 * shade);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.roundRect(x * cell + ox + 4, y * cell + 4, cell - 8, cell - 8, 14);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.roundRect(x * cell + ox + 10, y * cell + 9, cell * 0.45, cell * 0.18, 8);
          ctx.fill();
        }
      }
    });
    cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
    cobble.repeat.set(14, 14);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      this.assets.createToonMaterial('pz-cobble', { color: '#FFFFFF', map: cobble })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    // Rolling Tuscan hills
    const hillColors = ['#7FBF4D', '#6AAE3F', '#8CCB5A'];
    const hillRng = createSeededRng(912);
    for (let i = 0; i < 7; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.toon(`hill-${i % 3}`, hillColors[i % 3]));
      const w = 14 + hillRng() * 12;
      hill.scale.set(w, 5 + hillRng() * 5, 10);
      hill.position.set(-48 + i * 16, -1.5, -62 - hillRng() * 10);
      this.root.add(hill);
    }

    // Cypress trees
    const cypressMat = this.toon('cypress', '#2F6B2C');
    const trunkMat = this.toon('trunk', '#5C3A1B');
    for (let i = 0; i < 12; i++) {
      const x = -36 + i * 6.5 + (i % 2) * 1.5;
      if (Math.abs(x) < 9) continue;
      const tree = new THREE.Group();
      const cone = this.assets.createOutlinedMesh(new THREE.ConeGeometry(1.1, 6.5, 10), cypressMat, { outlineScale: 1.06 });
      cone.position.y = 4.2;
      tree.add(cone);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6), trunkMat);
      trunk.position.y = 0.6;
      tree.add(trunk);
      tree.position.set(x, 0, -30 - (i % 3) * 3);
      this.root.add(tree);
    }

    // Leaning Tower of Pizza easter egg
    const tower = new THREE.Group();
    const marble = this.toon('marble', '#F3EBDD');
    for (let t = 0; t < 6; t++) {
      const tier = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.9, 1.9, 2.1, 18), marble, { outlineScale: 1.03 });
      tier.position.y = 1.05 + t * 2.2;
      tower.add(tier);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.22, 18), this.toon('marble-ring', '#D9CDB8'));
      ring.position.y = 2.15 + t * 2.2;
      tower.add(ring);
    }
    const topPizza = this.makePizzaMesh(2.3, 0.35);
    topPizza.position.y = 13.6;
    tower.add(topPizza);
    tower.position.set(-19, 0, -42);
    tower.rotation.z = -0.14;
    this.root.add(tower);

    // Puffy clouds
    const cloudMat = this.toon('cloud', '#FFFFFF');
    const rng = createSeededRng(5150);
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + rng() * 1.1, 14, 10), cloudMat);
        puff.position.set((k - 2) * 1.5, Math.sin(k) * 0.5, rng() * 0.8);
        g.add(puff);
      }
      const baseX = -40 + i * 13;
      g.position.set(baseX, 19 + rng() * 7, -48 - rng() * 12);
      g.scale.setScalar(1.2 + rng() * 0.8);
      this.root.add(g);
      this.clouds.push({ obj: g, baseX, speed: 0.25 + rng() * 0.3 });
    }
  }

  private buildBuildings(): void {
    const palette = ['#F2A65A', '#F7D488', '#EF8A7A', '#9ED6C4', '#F4B6C2', '#E9C46A', '#B5D99C', '#F6C28B'];
    const roofMat = this.toon('roof', '#C4532D');
    const shutterMat = this.toon('shutter', '#2E7D5B');
    const windowMat = this.toon('window', '#2B3A4A');
    const flowerMat = this.toon('flower', '#E63946');
    const potMat = this.toon('pot', '#A0522D');
    const awningTex = canvasTexture(256, (ctx, s) => {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#D62828' : '#FFFFFF';
        ctx.fillRect((i * s) / 8, 0, s / 8, s);
      }
    });
    const awningMat = this.assets.createToonMaterial('pz-awning', { color: '#FFFFFF', map: awningTex });

    let idx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = 8 - i * 6.2;
        const h = 7.5 + ((i + (side > 0 ? 1 : 0)) % 3) * 1.8;
        const w = 5.2;
        const d = 5.8;
        const x = side * 12.4;
        const b = new THREE.Group();
        const body = this.assets.createOutlinedMesh(
          new THREE.BoxGeometry(w, h, d),
          this.toon(`bldg-${idx % palette.length}`, palette[idx % palette.length]),
          { outlineScale: 1.015 }
        );
        body.position.y = h / 2;
        b.add(body);

        const roof = this.assets.createOutlinedMesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.25, 1.8, 4), roofMat, { outlineScale: 1.03 });
        roof.rotation.y = Math.PI / 4;
        roof.position.y = h + 0.9;
        b.add(roof);

        // Facade facing the plaza (local +x for left side, -x for right side)
        const fx = -side * (w / 2 + 0.02);
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const wy = h * 0.5 + r * 2.2;
            const wz = (c - 0.5) * 2.4;
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.85), windowMat);
            win.position.set(fx, wy, wz);
            b.add(win);
            for (const sz of [-0.62, 0.62]) {
              const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.36), shutterMat);
              sh.position.set(fx - side * 0.03, wy, wz + sz);
              b.add(sh);
            }
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 1.0), potMat);
            box.position.set(fx - side * 0.15, wy - 0.85, wz);
            b.add(box);
            for (let f = 0; f < 3; f++) {
              const fl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), flowerMat);
              fl.position.set(fx - side * 0.2, wy - 0.62, wz + (f - 1) * 0.3);
              b.add(fl);
            }
          }
        }
        // Striped café awning + door
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 3.4), awningMat);
        awning.position.set(fx - side * 0.65, 2.7, 0);
        awning.rotation.z = side * 0.32;
        awning.castShadow = true;
        b.add(awning);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 1.2), this.toon('door', '#6B3E26'));
        door.position.set(fx, 1.1, 0);
        b.add(door);

        b.position.set(x, 0, z);
        this.root.add(b);
        idx++;
      }
    }

    // Lamp posts with HDR lanterns
    const postMat = this.toon('lamp-post', '#2B2B2B');
    for (const side of [-1, 1]) {
      for (const z of [5, -3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.2, 8), postMat);
        post.position.set(side * 8.2, 2.1, z);
        post.castShadow = true;
        this.root.add(post);
        const lampMat = glowMaterial('#FFD27A', 2.6);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), lampMat);
        lamp.position.set(side * 8.2, 4.4, z);
        this.root.add(lamp);
        this.bulbs.push({ mat: lampMat, base: lampMat.color.clone(), phase: z });
      }
    }
  }

  private buildBank(): void {
    const bank = new THREE.Group();
    const stone = this.toon('bank-stone', '#F5EBDA');
    const stoneShade = this.toon('bank-shade', '#E2D3BA');
    const gold = this.toon('gold', '#F2C14E');

    // Steps
    for (let s = 0; s < 3; s++) {
      const step = this.assets.createOutlinedMesh(new THREE.BoxGeometry(16 - s * 0.8, 0.35, 2.2 - s * 0.5), stoneShade, {
        outlineScale: 1.01,
      });
      step.position.set(0, 0.175 + s * 0.35, FACADE_Z + 2.6 - s * 0.55);
      bank.add(step);
    }
    // Body
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(15, 8, 6), stone, { outlineScale: 1.01 });
    body.position.set(0, 4, BANK_Z);
    bank.add(body);
    // Columns
    for (let i = 0; i < 6; i++) {
      if (i === 2 || i === 3) continue; // leave the vault door visible
      const col = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.45, 0.52, 7, 14), stone, { outlineScale: 1.05 });
      col.position.set(-6.25 + i * 2.5, 4.05, FACADE_Z + 1.3);
      bank.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), stoneShade);
      cap.position.set(-6.25 + i * 2.5, 7.6, FACADE_Z + 1.3);
      bank.add(cap);
    }
    // Entablature + pediment
    const beam = this.assets.createOutlinedMesh(new THREE.BoxGeometry(16, 0.9, 3.4), stoneShade, { outlineScale: 1.01 });
    beam.position.set(0, 8.2, FACADE_Z + 0.4);
    bank.add(beam);
    const pedGeo = new THREE.CylinderGeometry(4.6, 4.6, 3.2, 3, 1);
    const ped = this.assets.createOutlinedMesh(pedGeo, stone, { outlineScale: 1.02 });
    ped.rotation.x = Math.PI / 2;
    ped.rotation.y = Math.PI / 2;
    ped.scale.set(1, 1, 0.38);
    ped.position.set(0, 9.6, FACADE_Z + 0.2);
    bank.add(ped);

    // Spinning golden-rim pizza emblem on the pediment
    const emblem = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 8, 32), gold);
    emblem.add(rim);
    const disc = this.makePizzaMesh(1.18, 0.12);
    disc.rotation.x = Math.PI / 2;
    emblem.add(disc);
    emblem.position.set(0, 10.1, FACADE_Z + 2.0);
    this.emblem = emblem;
    bank.add(emblem);

    // "PIZZA BANK" gold sign on the beam
    const signTex = canvasTexture(
      1024,
      (ctx, s) => {
        ctx.fillStyle = '#8E1B1B';
        ctx.fillRect(0, 0, s, 160);
        ctx.strokeStyle = '#F2C14E';
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, s - 20, 140);
        ctx.fillStyle = '#FFD86B';
        ctx.font = '900 104px "Arial Rounded MT Bold", "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍕 PIZZA BANK 🍕', s / 2, 84);
      },
      160
    );
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.5), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 8.2, FACADE_Z + 2.12);
    bank.add(sign);

    // Giant pizza vault door (hinged on its left edge)
    const hinge = new THREE.Group();
    hinge.position.set(-2.3, 3.0, FACADE_Z + 0.25);
    const door = new THREE.Group();
    const steelRim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.22, 10, 40), this.toon('steel', '#9AA5B1'));
    door.add(steelRim);
    const pizzaDoor = this.makePizzaMesh(2.2, 0.3);
    pizzaDoor.rotation.x = Math.PI / 2;
    door.add(pizzaDoor);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 6, 20), gold);
    wheel.position.z = 0.26;
    door.add(wheel);
    for (let k = 0; k < 3; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), gold);
      spoke.position.z = 0.26;
      spoke.rotation.z = (k * Math.PI) / 3;
      door.add(spoke);
    }
    door.position.x = 2.3;
    hinge.add(door);
    this.vaultDoor = hinge;
    bank.add(hinge);
    // Dark vault interior behind the door, glowing gold piles
    const interior = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#1A0F08' }));
    interior.position.set(0, 3.0, FACADE_Z + 0.02);
    bank.add(interior);
    const goldGlow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), glowMaterial('#FFB938', 1.8));
    goldGlow.position.set(0, 2.2, FACADE_Z + 0.04);
    goldGlow.scale.y = 0.45;
    bank.add(goldGlow);

    this.root.add(bank);
  }

  private buildStringLights(): void {
    const wireMat = new THREE.MeshBasicMaterial({ color: '#222222' });
    const colors = ['#FFE08A', '#FF9F6E', '#FFF4C2', '#FF6F91'];
    for (const z of [3.5, -2.5, -8]) {
      const a = new THREE.Vector3(-9.8, 6.6, z);
      const b = new THREE.Vector3(9.8, 6.6, z);
      const mid = new THREE.Vector3(0, 5.0, z);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.025, 4, false), wireMat);
      this.root.add(wire);
      for (let i = 1; i < 18; i++) {
        const p = curve.getPoint(i / 18);
        const mat = glowMaterial(colors[i % colors.length], 3.2);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
        bulb.position.copy(p).add(new THREE.Vector3(0, -0.16, 0));
        this.root.add(bulb);
        this.bulbs.push({ mat, base: mat.color.clone(), phase: i * 1.7 + z });
      }
    }
  }

  private buildOven(): void {
    const oven = new THREE.Group();
    const brick = this.toon('brick', '#B5523B');
    const base = this.assets.createOutlinedMesh(new THREE.BoxGeometry(3.4, 1.3, 3.2), this.toon('oven-base', '#8C8C8C'), { outlineScale: 1.02 });
    base.position.y = 0.65;
    oven.add(base);
    const dome = this.assets.createOutlinedMesh(new THREE.SphereGeometry(1.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brick, { outlineScale: 1.04 });
    dome.position.y = 1.3;
    oven.add(dome);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#160A05' }));
    arch.position.set(0, 1.32, 1.52);
    oven.add(arch);
    this.ovenFireMat = glowMaterial('#FF7A1A', 3.0);
    this.ovenFire = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16, 0, Math.PI), this.ovenFireMat);
    this.ovenFire.position.set(0, 1.33, 1.54);
    oven.add(this.ovenFire);
    const chimney = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 10), brick, { outlineScale: 1.06 });
    chimney.position.set(0, 3.2, -0.3);
    oven.add(chimney);
    const smokeMat = new THREE.MeshToonMaterial({ color: '#E8E8E8', transparent: true, opacity: 0.75, gradientMap: this.assets.getToonGradientMap() });
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), smokeMat.clone());
      oven.add(puff);
      this.ovenSmoke.push(puff);
    }
    // Pizzas launching out of the "money printer"
    for (let i = 0; i < 6; i++) {
      const flyer = this.makePizzaMesh(0.55, 0.08);
      flyer.visible = false;
      oven.add(flyer);
      this.ovenFlyers.push(flyer);
    }
    oven.position.set(-6.4, 0, -5.2);
    oven.rotation.y = 0.5;
    this.root.add(oven);
  }

  private buildBoxStacks(): void {
    const boxTex = canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = '#F1E3C8';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#D62828';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PIZZA', s / 2, s / 2);
      ctx.strokeStyle = '#B08D57';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, s - 8, s - 8);
    });
    const side = this.toon('box-side', '#E3CFA8');
    const top = this.assets.createToonMaterial('pz-box-top', { color: '#FFFFFF', map: boxTex });
    const geo = new THREE.BoxGeometry(1.15, 0.2, 1.15);
    const mats = [side, side, top, side, side, side];

    const stacks: [number, number][] = [
      [-4.6, -0.5], [4.6, -0.8], [-3.2, -7.5], [3.4, -7.8], [-7.2, 2.2], [7.0, 1.8], [-5.8, -9.2], [5.9, -9.4], [0, -9.0], [-8.0, -2.2], [8.2, -2.6],
    ];
    const layers = 16;
    const total = stacks.length * layers;
    this.boxInstances = new THREE.InstancedMesh(geo, mats, total);
    this.boxInstances.castShadow = true;
    this.boxInstances.receiveShadow = true;
    this.boxOutline = new THREE.InstancedMesh(geo, this.assets.getOutlineMaterial(), total);
    const rng = createSeededRng(4040);
    let n = 0;
    // Fill layer by layer so `count` grows every stack evenly
    for (let l = 0; l < layers; l++) {
      for (const [sx, sz] of stacks) {
        const jitterX = (rng() - 0.5) * 0.16;
        const jitterZ = (rng() - 0.5) * 0.16;
        const rot = (rng() - 0.5) * 0.35;
        this.tmpPos.set(sx + jitterX, 0.1 + l * 0.205, sz + jitterZ);
        this.tmpQuat.setFromEuler(this.tmpEuler.set(0, rot, 0));
        this.tmpScale.set(1, 1, 1);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.boxInstances.setMatrixAt(n, this.tmpMatrix);
        this.tmpScale.set(1.06, 1.3, 1.06);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.boxOutline.setMatrixAt(n, this.tmpMatrix);
        n++;
      }
    }
    this.boxCount = total;
    this.boxInstances.count = 0;
    this.boxOutline.count = 0;
    this.root.add(this.boxInstances, this.boxOutline);
  }

  private buildPizzaRain(): void {
    const top = new THREE.MeshToonMaterial({ color: '#FFFFFF', map: this.pizzaTex, gradientMap: this.assets.getToonGradientMap() });
    this.pizzaTopMaterials.push(top);
    const crust = this.toon('crust', '#C9822F');
    const count = 70;
    this.rainSlices = new THREE.InstancedMesh(this.makeSliceGeometry(), [crust, top, crust], count);
    this.rainSlices.castShadow = true;
    const rng = createSeededRng(2626);
    for (let i = 0; i < count; i++) {
      this.rainData.push({
        x: (rng() - 0.5) * 22,
        z: -12 + rng() * 18,
        phase: rng(),
        speed: 0.22 + rng() * 0.2,
        spin: 1 + rng() * 3,
      });
    }
    this.rainSlices.visible = false;
    this.root.add(this.rainSlices);
  }

  private buildHeroPizza(): void {
    this.heroPizza = new THREE.Group();
    this.heroPizzaFace = this.makePizzaMesh(3.0, 0.42);
    this.heroPizzaFace.rotation.x = Math.PI / 2;
    this.heroPizza.add(this.heroPizzaFace);
    this.heroPizza.visible = false;
    this.root.add(this.heroPizza);
    this.dustRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.0, 40),
      new THREE.MeshBasicMaterial({ color: '#F5E6CC', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    this.dustRing.rotation.x = -Math.PI / 2;
    this.dustRing.visible = false;
    this.root.add(this.dustRing);
  }

  private buildStink(): void {
    const mat = new THREE.MeshBasicMaterial({ color: '#C6FF7A', transparent: true, opacity: 0.38, depthWrite: false, fog: false });
    const rng = createSeededRng(6612);
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5 + rng() * 0.5, 12, 8), mat.clone());
      mesh.visible = false;
      this.root.add(mesh);
      this.stinkClouds.push({ mesh, x: (rng() - 0.5) * 20, z: -12 + rng() * 8, phase: rng() });
    }
  }

  private buildSeagulls(): void {
    this.gullGroup = new THREE.Group();
    const white = this.toon('gull', '#FFFFFF');
    const grey = this.toon('gull-wing', '#AEB7C2');
    const beakMat = this.toon('beak', '#F4A62A');
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#141414' });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const body = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.45, 14, 10), white, { outlineScale: 1.08 });
      body.scale.set(0.8, 0.7, 1.4);
      g.add(body);
      const head = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.3, 12, 10), white, { outlineScale: 1.08 });
      head.position.set(0, 0.25, 0.6);
      g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), beakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.2, 0.98);
      g.add(beak);
      for (const ex of [-0.14, 0.14]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
        eye.position.set(ex, 0.34, 0.82);
        g.add(eye);
      }
      const mkWing = (dir: number) => {
        const pivot = new THREE.Group();
        const wing = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.3, 0.06, 0.55), grey, { outlineScale: 1.08 });
        wing.position.x = dir * 0.65;
        pivot.add(wing);
        pivot.position.set(dir * 0.25, 0.12, 0);
        g.add(pivot);
        return pivot;
      };
      const wingL = mkWing(-1);
      const wingR = mkWing(1);
      const loot = this.makePizzaMesh(0.5, 0.06, -Math.PI / 8, Math.PI / 4);
      loot.position.set(0, -0.05, 1.25);
      loot.rotation.x = 0.2;
      g.add(loot);
      g.scale.setScalar(1.25);
      this.gullGroup.add(g);
      this.gulls.push({ group: g, wingL, wingR, loot, seed: i });
    }
    this.gullGroup.visible = false;
    this.root.add(this.gullGroup);
  }

  private buildFreezer(): void {
    const f = new THREE.Group();
    const shell = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.8, 1.35, 1.5), this.toon('freezer', '#F4F8FB'), { outlineScale: 1.03 });
    shell.position.y = 0.68;
    f.add(shell);
    const label = canvasTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#2F80ED';
        ctx.fillRect(0, 0, s, 128);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 64px "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄ GRANNY ❄', s / 2, 66);
      },
      128
    );
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: label }));
    plate.position.set(0, 0.78, 0.76);
    f.add(plate);
    // Glowing interior + frozen pizza stack
    this.freezerGlowMat = glowMaterial('#7FD8FF', 3.0);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 1.2), this.freezerGlowMat);
    glow.position.y = 1.36;
    f.add(glow);
    const frozenTop = this.toon('frozen-box', '#BFE7FF');
    for (let k = 0; k < 4; k++) {
      const box = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.0, 0.16, 1.0), frozenTop, { outlineScale: 1.05 });
      box.position.set(-0.55 + (k % 2) * 1.1, 1.45 + Math.floor(k / 2) * 0.17, 0);
      f.add(box);
    }
    // Hinged lid
    const lid = new THREE.Group();
    lid.position.set(0, 1.38, -0.75);
    const lidMesh = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.85, 0.16, 1.55), this.toon('freezer-lid', '#E6EEF4'), { outlineScale: 1.03 });
    lidMesh.position.z = 0.75;
    lid.add(lidMesh);
    f.add(lid);
    this.freezerLid = lid;
    const frostMat = new THREE.MeshBasicMaterial({ color: '#DFF6FF', transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), frostMat.clone());
      f.add(puff);
      this.frostPuffs.push(puff);
    }
    f.position.set(5.0, 0, -3.2);
    f.rotation.y = -0.35;
    f.visible = false;
    this.freezer = f;
    this.root.add(f);
  }

  private buildStageAndTaco(): void {
    const stage = new THREE.Group();
    const wood = this.toon('stage-wood', '#A0663A');
    const deck = this.assets.createOutlinedMesh(new THREE.BoxGeometry(6.4, 0.7, 3.2), wood, { outlineScale: 1.02 });
    deck.position.y = 0.35;
    stage.add(deck);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(6.45, 0.55, 0.05), this.toon('skirt', '#C1121F'));
    skirt.position.set(0, 0.36, 1.63);
    stage.add(skirt);
    // Bunting
    const flagColors = ['#D62828', '#FFFFFF', '#2A9D8F'];
    for (let i = 0; i < 11; i++) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), this.toon(`flag-${i % 3}`, flagColors[i % 3]));
      flag.rotation.x = Math.PI;
      const x = -3 + i * 0.6;
      flag.position.set(x, 3.6 - Math.cos((x / 3) * Math.PI * 0.5) * 0.25, 1.2);
      stage.add(flag);
    }
    for (const px of [-3.1, 3.1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), this.toon('pole', '#3A3A3A'));
      pole.position.set(px, 2.2, 1.2);
      stage.add(pole);
    }
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), this.toon('pole', '#3A3A3A'));
    mic.position.set(0.9, 1.4, 0.9);
    stage.add(mic);
    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), this.toon('mic', '#222222'));
    micHead.position.set(0.9, 2.15, 0.9);
    stage.add(micHead);
    stage.position.set(0, 0, -5.4);
    stage.visible = false;
    this.stage = stage;
    this.root.add(stage);

    // Giant taco (next currency!)
    const taco = new THREE.Group();
    const shellMat = new THREE.MeshToonMaterial({ color: '#F2C14E', side: THREE.DoubleSide, gradientMap: this.assets.getToonGradientMap() });
    const shellGeo = new THREE.CylinderGeometry(1.7, 1.7, 1.3, 32, 1, true, -Math.PI / 2, Math.PI);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.rotation.x = Math.PI / 2;
    shell.castShadow = true;
    taco.add(shell);
    const shellOutline = new THREE.Mesh(shellGeo, this.assets.getOutlineMaterial());
    shellOutline.rotation.x = Math.PI / 2;
    shellOutline.scale.set(1.04, 1.02, 1.04);
    taco.add(shellOutline);
    const meat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), this.toon('meat', '#7A3E1D'));
    meat.position.y = -0.25;
    taco.add(meat);
    const lettuceMat = this.toon('lettuce', '#6CC04A');
    for (let i = 0; i < 9; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), lettuceMat);
      l.scale.y = 0.6;
      l.position.set(-1.45 + i * 0.36, 0.1 + Math.sin(i * 1.7) * 0.08, 0);
      taco.add(l);
    }
    const tomatoMat = this.toon('tomato', '#E63946');
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), tomatoMat);
      t.position.set(-1.2 + i * 0.48, 0.28, (i % 2) * 0.2 - 0.1);
      t.rotation.set(i, i * 0.7, 0);
      taco.add(t);
    }
    taco.position.set(0, 5.2, -6.6);
    taco.visible = false;
    this.taco = taco;
    this.root.add(taco);
  }

  private buildConfetti(): void {
    const count = 140;
    const geo = new THREE.PlaneGeometry(0.16, 0.28);
    const mat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide });
    this.confetti = new THREE.InstancedMesh(geo, mat, count);
    const palette = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#FF8FAB'].map((c) => new THREE.Color(c).multiplyScalar(1.3));
    const rng = createSeededRng(7171);
    for (let i = 0; i < count; i++) {
      this.confetti.setColorAt(i, palette[i % palette.length]);
      this.confettiData.push({ x: (rng() - 0.5) * 16, z: -8 + rng() * 12, phase: rng(), speed: 0.18 + rng() * 0.14, spin: 2 + rng() * 6 });
    }
    this.confetti.visible = false;
    this.root.add(this.confetti);
  }

  private buildSignBoard(): void {
    const g = new THREE.Group();
    this.signCanvas = document.createElement('canvas');
    this.signCanvas.width = 768;
    this.signCanvas.height = 640;
    this.signTex = new THREE.CanvasTexture(this.signCanvas);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), new THREE.MeshBasicMaterial({ map: this.signTex }));
    board.position.y = 3.2;
    g.add(board);
    const frame = this.assets.createOutlinedMesh(new THREE.BoxGeometry(3.85, 3.25, 0.12), this.toon('sign-frame', '#6B3E26'), { outlineScale: 1.02 });
    frame.position.set(0, 3.2, -0.08);
    g.add(frame);
    for (const px of [-1.4, 1.4]) {
      const post = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), this.toon('sign-frame', '#6B3E26'), { outlineScale: 1.06 });
      post.position.set(px, 0.9, -0.1);
      g.add(post);
    }
    g.position.set(-3.6, 0, -1.4);
    g.rotation.y = 0.32;
    g.visible = false;
    this.signGroup = g;
    this.root.add(g);
  }

  private redrawSign(title: string, lines: string[]): void {
    const key = `${title}|${lines.join('|')}`;
    if (key === this.lastSignKey) return;
    this.lastSignKey = key;
    const ctx = this.signCanvas.getContext('2d')!;
    const w = this.signCanvas.width;
    const h = this.signCanvas.height;
    ctx.fillStyle = '#FFF8E7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#D62828';
    ctx.fillRect(0, 0, w, 150);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 76px "Arial Rounded MT Bold", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, 80);
    ctx.fillStyle = '#141414';
    ctx.font = '900 66px "Arial Rounded MT Bold", "Arial Black", sans-serif';
    lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, w / 2, 230 + i * 104));
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    this.signTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- update

  public update(env: EnvironmentState, sceneProgress: number, sceneElapsedSeconds: number, globalSeconds: number): void {
    const active = env.worldTheme === 'pizza_town';
    this.root.visible = active;
    if (!active) return;
    const st: PizzaState = { ...DEFAULT_STATE, ...(env.pizzaState ?? {}) };
    const p = sceneProgress;

    for (const c of this.clouds) {
      c.obj.position.x = c.baseX + Math.sin(globalSeconds * 0.05 * c.speed + c.baseX) * 3 + globalSeconds * c.speed * 0.3;
    }
    for (const b of this.bulbs) {
      const tw = 0.82 + 0.18 * Math.sin(globalSeconds * 3.1 + b.phase);
      b.mat.color.copy(b.base).multiplyScalar(tw);
    }
    this.emblem.rotation.z = globalSeconds * 0.9;

    // Vault door swing
    const openT = st.vaultOpen ? easeOutCubic(clamp(p / 0.45, 0, 1)) : 0;
    this.vaultDoor.rotation.y = -openT * 1.75;

    // Oven fire, smoke & money-printer flyers
    const blaze = st.ovenBlazing ? 1 : 0;
    const flicker = 0.85 + 0.15 * Math.sin(globalSeconds * 23) * Math.sin(globalSeconds * 7.3);
    this.ovenFire.scale.setScalar((1 + blaze * 0.25) * flicker);
    this.ovenFireMat.color.setRGB(1, 0.48, 0.1).multiplyScalar((3 + blaze * 4) * flicker);
    this.ovenSmoke.forEach((puff, i) => {
      const t = (globalSeconds * (0.35 + blaze * 0.4) + i / this.ovenSmoke.length) % 1;
      puff.position.set(Math.sin(t * 5 + i) * 0.3, 4.0 + t * 3.5, -0.3);
      puff.scale.setScalar(0.6 + t * (1.4 + blaze));
      (puff.material as THREE.MeshToonMaterial).opacity = 0.75 * (1 - t);
    });
    this.ovenFlyers.forEach((fl, i) => {
      fl.visible = st.ovenBlazing;
      if (!fl.visible) return;
      const t = (globalSeconds * 0.9 + i / this.ovenFlyers.length) % 1;
      fl.position.set(Math.sin(i * 2.1) * 1.8 * t, 1.4 + Math.sin(t * Math.PI) * 3.2, 1.6 + t * 4.5);
      fl.rotation.set(t * 9 + i, t * 4, 0);
    });

    // Pizza-box mountains
    const boxLevel = lerp(st.boxStackLevel, st.boxStackEndLevel ?? st.boxStackLevel, easeInOutCubic(p));
    const shown = Math.floor(this.boxCount * clamp(boxLevel, 0, 1));
    this.boxInstances.count = shown;
    this.boxOutline.count = shown;
    this.boxInstances.visible = shown > 0;
    this.boxOutline.visible = shown > 0;

    // Mold: tint every pizza top + swap to moldy texture
    const mold = clamp(lerp(st.moldLevel, st.moldEndLevel ?? st.moldLevel, easeInOutCubic(p)), 0, 1);
    for (const m of this.pizzaTopMaterials) {
      const tex = mold > 0.3 ? this.moldyTex : this.pizzaTex;
      if (m.map !== tex) {
        m.map = tex;
        m.needsUpdate = true;
      }
      m.color.copy(WHITE).lerp(MOLD_GREEN, mold * 0.55);
    }
    this.stinkClouds.forEach((c, i) => {
      c.mesh.visible = mold > 0.25;
      if (!c.mesh.visible) return;
      const t = (globalSeconds * 0.25 + c.phase) % 1;
      c.mesh.position.set(c.x + Math.sin(globalSeconds * 1.3 + i) * 0.6, 0.6 + t * 5.5, c.z);
      c.mesh.scale.setScalar((0.5 + t * 1.1) * mold);
      (c.mesh.material as THREE.MeshBasicMaterial).opacity = 0.38 * (1 - t * 0.8);
    });

    // Pizza rain
    this.rainSlices.visible = st.pizzaRain;
    if (st.pizzaRain) {
      this.rainData.forEach((d, i) => {
        const t = (globalSeconds * d.speed + d.phase) % 1;
        this.tmpPos.set(d.x + Math.sin(t * 6 + i) * 0.6, 16 - t * 16.5, d.z);
        this.tmpQuat.setFromEuler(this.tmpEuler.set(globalSeconds * d.spin + i, globalSeconds * d.spin * 0.6, i));
        this.tmpScale.setScalar(1.3);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.rainSlices.setMatrixAt(i, this.tmpMatrix);
      });
      this.rainSlices.instanceMatrix.needsUpdate = true;
    }

    // Hero pizza meteor drop → squash → settle
    this.heroPizza.visible = st.heroPizzaDrop;
    this.dustRing.visible = false;
    if (st.heroPizzaDrop) {
      const landAt = 0.16;
      const fallT = clamp(p / landAt, 0, 1);
      const y = lerp(26, 0.0, fallT * fallT);
      const since = (p - landAt) * 4.5;
      let squash = 1;
      if (p >= landAt) {
        squash = 1 - 0.45 * Math.exp(-since * 6) * Math.cos(since * 22);
        this.dustRing.visible = since < 1.2;
        const ringS = 2 + since * 9;
        this.dustRing.scale.setScalar(ringS);
        this.dustRing.position.set(0, 0.05, -3.4);
        (this.dustRing.material as THREE.MeshBasicMaterial).opacity = clamp(0.85 - since * 0.75, 0, 0.85);
      }
      // Wrapper squashes in world space; the face (standing on its crust edge) spins in then wobbles like a coin
      this.heroPizza.position.set(0, y + 3.0 * squash, -3.4);
      this.heroPizza.scale.set(1 / Math.sqrt(squash), squash, 1);
      const wobble = p >= landAt ? Math.exp(-since * 3) * Math.sin(since * 14) * 0.35 : 0;
      this.heroPizzaFace.rotation.set(Math.PI / 2 + (p < landAt ? (1 - fallT) * 4 : 0), 0, wobble);
    }

    // Seagull heist: dive into the vault, flap away with slices
    this.gullGroup.visible = st.seagullHeist;
    if (st.seagullHeist) {
      for (const g of this.gulls) {
        const rng = createSeededRng(900 + g.seed);
        const t = (globalSeconds * 0.32 + g.seed * 0.11) % 1;
        const p0 = new THREE.Vector3(-22 + rng() * 6, 13 + rng() * 4, -2 - rng() * 6);
        const p1 = new THREE.Vector3((rng() - 0.5) * 3, 0.8, FACADE_Z + 1.2);
        const p2 = new THREE.Vector3(22 - rng() * 6, 12 + rng() * 5, 2 - rng() * 6);
        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
        const pos = curve.getPoint(t);
        const ahead = curve.getPoint(Math.min(1, t + 0.02));
        g.group.position.copy(pos);
        g.group.lookAt(ahead);
        const flap = Math.sin(globalSeconds * 16 + g.seed) * 0.75;
        g.wingL.rotation.z = flap;
        g.wingR.rotation.z = -flap;
        g.loot.visible = t > 0.5;
      }
    }

    // Granny's freezer reveal
    this.freezer.visible = st.freezerReveal;
    if (st.freezerReveal) {
      const pop = clamp(springPop(sceneElapsedSeconds, 260, 12), 0.01, 1.15);
      this.freezer.scale.setScalar(pop);
      const lidT = easeOutCubic(clamp((sceneElapsedSeconds - 0.35) / 0.6, 0, 1));
      this.freezerLid.rotation.x = -lidT * 1.9;
      this.freezerGlowMat.color.setRGB(0.5, 0.85, 1).multiplyScalar(2.2 + lidT * 3 + Math.sin(globalSeconds * 5) * 0.5);
      this.frostPuffs.forEach((f, i) => {
        const t = (globalSeconds * 0.5 + i / this.frostPuffs.length) % 1;
        f.visible = lidT > 0.1;
        f.position.set(Math.sin(i * 2.4) * 1.0, 1.5 + t * 1.8, Math.cos(i * 1.7) * 0.4);
        f.scale.setScalar(0.35 + t * 0.8);
        (f.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      });
    }

    this.stage.visible = st.stageActive || st.tacoReveal;

    // Taco reveal: rise, spin, sparkle-pop
    this.taco.visible = st.tacoReveal;
    if (st.tacoReveal) {
      // Pops on the "...tacos." beat, ~55% through the scene
      const sceneDur = p > 0.001 ? sceneElapsedSeconds / p : 0;
      const pop = clamp(springPop(Math.max(0, sceneElapsedSeconds - sceneDur * 0.55), 240, 11), 0, 1.2);
      this.taco.visible = pop > 0.001;
      this.taco.scale.setScalar(Math.max(0.001, pop * 0.95));
      this.taco.position.y = 3.6 + pop * 1.8 + Math.sin(globalSeconds * 2.2) * 0.15;
      this.taco.rotation.set(0.38, Math.sin(globalSeconds * 1.4) * 0.5, 0);
    }

    // Confetti
    this.confetti.visible = st.confetti;
    if (st.confetti) {
      this.confettiData.forEach((d, i) => {
        const t = (globalSeconds * d.speed + d.phase) % 1;
        this.tmpPos.set(d.x + Math.sin(globalSeconds * 2 + i) * 0.5, 12 - t * 12.5, d.z);
        this.tmpQuat.setFromEuler(this.tmpEuler.set(globalSeconds * d.spin, globalSeconds * d.spin * 0.7, i));
        this.tmpScale.setScalar(1.4);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.confetti.setMatrixAt(i, this.tmpMatrix);
      });
      this.confetti.instanceMatrix.needsUpdate = true;
    }

    // Law board
    this.signGroup.visible = Boolean(st.signTitle);
    if (st.signTitle) {
      this.redrawSign(st.signTitle, st.signLines ?? []);
      const pop = clamp(springPop(sceneElapsedSeconds, 300, 13), 0.01, 1.12);
      this.signGroup.scale.setScalar(pop);
    }
  }
}
