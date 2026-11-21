import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { createSeededRng } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

/**
 * Dual-Zone Bold-Outlined Cel-Shaded 3D World for "What Happens If a City Charges Rent for Dreams?":
 *  - Zone 1 (city_night): Twilight starry plaza with crescent moon, Dream Scanner Tower, Espresso Bar, Pillows & Dynamic Law Board
 *  - Zone 2 (dream_clouds): Surreal pastel floating cloud world with Golden Castle, Giant Flying Donuts, Price Tags, and Boring Grey Tax-Audit Boxes!
 */
export class DreamCloudEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private nightZone!: THREE.Group;
  private cloudZone!: THREE.Group;

  private towerSpire!: THREE.Group;
  private towerRings: THREE.Mesh[] = [];
  private espressoGroup!: THREE.Group;
  private espressoSteam: THREE.Object3D[] = [];
  private pillowsGroup!: THREE.Group;

  private billBoardGroup!: THREE.Group;
  private billCanvas!: HTMLCanvasElement;
  private billTex!: THREE.CanvasTexture;
  private lastBillMode = '';

  private luxuryGroup!: THREE.Group;
  private floatingDonuts: { obj: THREE.Object3D; baseY: number; phase: number }[] = [];
  private castleGroup!: THREE.Group;
  private priceTagsGroup!: THREE.Group;
  private boringBoxesGroup!: THREE.Group;
  private boringProps: { obj: THREE.Object3D; baseY: number; phase: number }[] = [];

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'DreamCloudRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildNightCityZone();
    this.buildDreamCloudsZone();
  }

  private buildNightCityZone(): void {
    const zone = new THREE.Group();
    this.nightZone = zone;

    // Deep slate twilight avenue
    const roadMat = this.assets.createToonMaterial('mat-dn-road', { color: '#394056' });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 52), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    zone.add(road);

    // Sidewalks
    const walkMat = this.assets.createToonMaterial('mat-dn-walk', { color: '#7D829E' });
    for (const sx of [-8.8, 8.8]) {
      const sw = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, 0.22, 52), walkMat, {
        outlineScale: 1.008,
        castShadow: false,
      });
      sw.position.set(sx, 0.08, 0);
      zone.add(sw);
    }

    // Crisp crosswalk bars
    const zebraMat = this.assets.createToonMaterial('mat-dn-zebra', { color: '#E2E8F0' });
    for (let x = -4.2; x <= 4.2; x += 1.65) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 2.8), zebraMat);
      bar.position.set(x, 0.02, 2.2);
      zone.add(bar);
    }

    // Cozy twilight apartments with warm glowing amber windows
    const bColors = ['#4B4A73', '#5D4E7A', '#435275', '#685075'];
    const glowWin = new THREE.MeshBasicMaterial({ color: '#FDE68A' });
    const darkWin = this.assets.createToonMaterial('mat-dn-dwin', { color: '#262942' });

    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const bz = 8.0 - i * 6.8;
        const h = 7.8 + (i % 2) * 2.2;
        const bMat = this.assets.createToonMaterial(`mat-dn-b-${i}`, { color: bColors[i] });
        const bldg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, h, 5.6), bMat, {
          outlineScale: 1.02,
        });
        bldg.position.set(side * 10.2, h * 0.5, bz);
        zone.add(bldg);

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const wz = (c - 1) * 1.4;
            const lit = (i + r + c) % 2 === 0;
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.82), lit ? glowWin : darkWin);
            w.position.set(side * 7.96, 2.3 + r * 2.0, bz + wz);
            zone.add(w);
          }
        }
      }
    }

    // Giant glowing gold Moon & twinkling stars high in the indigo night sky
    const moonMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
    const moon = this.assets.createOutlinedMesh(new THREE.SphereGeometry(2.1, 16, 12), moonMat, {
      outlineScale: 1.05,
      castShadow: false,
      receiveShadow: false,
    });
    moon.position.set(6.5, 13.5, -24.0);
    zone.add(moon);

    const rng = createSeededRng(8802);
    const starMat = new THREE.MeshBasicMaterial({ color: '#FFFBEB' });
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + rng() * 0.16, 0), starMat);
      s.position.set((rng() - 0.5) * 26, 8.5 + rng() * 10.0, -25.0);
      zone.add(s);
    }

    // Dream Meter Scanner Tower centering the skyline!
    const tower = new THREE.Group();
    const metalMat = this.assets.createToonMaterial('mat-dtower-metal', { color: '#CBD5E1' });
    const purpleMat = this.assets.createToonMaterial('mat-dtower-purp', { color: '#7C3AED' });

    const base = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.4, 2.3, 4.4, 8), purpleMat, {
      outlineScale: 1.03,
    });
    base.position.y = 2.2;
    tower.add(base);

    const spire = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.32, 1.0, 7.6, 8), metalMat, {
      outlineScale: 1.04,
    });
    spire.position.y = 8.0;
    tower.add(spire);

    const tip = this.assets.createOutlinedMesh(
      new THREE.SphereGeometry(0.85, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#F472B6' }),
      { outlineScale: 1.07, castShadow: false }
    );
    tip.position.y = 12.1;
    tower.add(tip);

    // 3 expanding glowing radar rings pulsing outward from the Dream Tower
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.14, 8, 22),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#F472B6' : '#38BDF8', transparent: true, opacity: 0.85 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 11.8;
      tower.add(ring);
      this.towerRings.push(ring);
    }
    tower.position.set(0, 0, -14.8);
    this.towerSpire = tower;
    zone.add(tower);

    // Giant 3D Espresso Stand (shown during the sleepless coffee rebellion!)
    const espresso = new THREE.Group();
    const standMat = this.assets.createToonMaterial('mat-esp-wood', { color: '#854D27' });
    const redMat = this.assets.createToonMaterial('mat-esp-red', { color: '#DC2626' });
    const cupMat = this.assets.createToonMaterial('mat-esp-cup', { color: '#FFFDF8' });
    const coffeeMat = this.assets.createToonMaterial('mat-esp-cof', { color: '#3E2012' });

    const counter = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.6, 1.25, 1.35), standMat, {
      outlineScale: 1.04,
    });
    counter.position.y = 0.62;
    espresso.add(counter);

    const roof = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.9, 0.32, 1.65), redMat, {
      outlineScale: 1.05,
    });
    roof.position.y = 2.65;
    espresso.add(roof);

    for (const px of [-1.15, 1.15]) {
      const pole = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6), standMat, {
        outlineScale: 1.08,
      });
      pole.position.set(px, 1.9, -0.5);
      espresso.add(pole);
    }

    // Giant steaming 3D white coffee mug on top of the stand!
    const mug = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.68, 0.56, 1.05, 14), cupMat, {
      outlineScale: 1.05,
    });
    mug.position.y = 3.35;
    espresso.add(mug);
    const handle = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.32, 0.08, 8, 12), cupMat, {
      outlineScale: 1.08,
    });
    handle.position.set(0.68, 3.35, 0);
    espresso.add(handle);
    const brew = new THREE.Mesh(new THREE.CircleGeometry(0.62, 14), coffeeMat);
    brew.rotation.x = -Math.PI / 2;
    brew.position.y = 3.89;
    espresso.add(brew);

    const steamMat = this.assets.createToonMaterial('mat-esp-steam', { color: '#F1F5F9' });
    for (let i = 0; i < 3; i++) {
      const puff = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.24, 8, 8), steamMat, {
        outlineScale: 1.08,
        castShadow: false,
      });
      puff.position.set((i - 1) * 0.25, 4.3 + i * 0.4, 0);
      espresso.add(puff);
      this.espressoSteam.push(puff);
    }

    espresso.position.set(2.8, 0, -1.5);
    espresso.rotation.y = -0.35;
    espresso.visible = false;
    this.espressoGroup = espresso;
    zone.add(espresso);

    // Row of fluffy 3D Sleeping Pillows for the Great Tax-Audit Nap!
    const pillows = new THREE.Group();
    const pillowMat = this.assets.createToonMaterial('mat-dn-pillow', { color: '#F8FAFC' });
    const trimMat = this.assets.createToonMaterial('mat-dn-pblue', { color: '#93C5FD' });
    for (const px of [-2.2, -0.75, 0.75, 2.2]) {
      const p = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.05, 0.34, 0.72), pillowMat, {
        outlineScale: 1.06,
      });
      p.position.set(px, 0.18, 0.6);
      pillows.add(p);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.74), trimMat);
      stripe.position.set(px, 0.18, 0.6);
      pillows.add(stripe);
    }
    pillows.visible = false;
    this.pillowsGroup = pillows;
    zone.add(pillows);

    // Dynamic Centered Civic Billboard (posts STRICTLY BEHIND at z = -0.18!)
    const boardGroup = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-dn-bpost', { color: '#334155' });
    for (const px of [-1.25, 1.25]) {
      const post = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.09, 2.9, 8), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(px, 1.45, -0.18);
      boardGroup.add(post);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 480;
    this.billCanvas = canvas;
    this.billTex = new THREE.CanvasTexture(canvas);
    this.billTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: this.billTex });
    const backMat = this.assets.createToonMaterial('mat-dn-bback', { color: '#1E1B4B' });

    const board = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(3.45, 2.15, 0.14),
      [backMat, backMat, backMat, backMat, faceMat, backMat] as unknown as THREE.Material,
      { outlineScale: 1.03 }
    );
    board.position.set(0, 2.38, 0);
    boardGroup.add(board);

    boardGroup.position.set(0, 0, -2.4);
    boardGroup.visible = false;
    this.billBoardGroup = boardGroup;
    zone.add(boardGroup);
    this.redrawBillBoard('dream_tax');

    this.root.add(zone);
  }

  private redrawBillBoard(mode: 'dream_tax' | 'loophole' | 'canceled'): void {
    if (this.lastBillMode === mode) return;
    this.lastBillMode = mode;

    const ctx = this.billCanvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 768, 480);

    if (mode === 'dream_tax') {
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#7C3AED';
      ctx.strokeRect(11, 11, 746, 458);
      ctx.fillStyle = '#7C3AED';
      ctx.fillRect(22, 22, 724, 114);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 52px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CITY DREAM TAX ACT', 384, 79);

      ctx.textAlign = 'left';
      ctx.font = '900 42px "Arial", sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText('FLYING DREAM:', 62, 200);
      ctx.fillStyle = '#DC2626';
      ctx.fillText('$500', 565, 200);

      ctx.fillStyle = '#111827';
      ctx.fillText('GIANT DONUTS:', 62, 286);
      ctx.fillStyle = '#DC2626';
      ctx.fillText('$99', 585, 286);

      ctx.fillStyle = '#111827';
      ctx.fillText('BLANK WALL:', 62, 372);
      ctx.fillStyle = '#16A34A';
      ctx.fillText('FREE', 560, 372);
    } else if (mode === 'loophole') {
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#16A34A';
      ctx.strokeRect(11, 11, 746, 458);
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(22, 22, 724, 114);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 48px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SECTION 4 FINE PRINT', 384, 79);

      ctx.fillStyle = '#111827';
      ctx.font = '900 54px "Arial Black", sans-serif';
      ctx.fillText('BORING DREAMS', 384, 226);
      ctx.fillStyle = '#15803D';
      ctx.fillText('EARN A CASH', 384, 304);
      ctx.fillText('CITY REBATE!', 384, 382);
    } else {
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#0284C7';
      ctx.strokeRect(11, 11, 746, 458);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(22, 22, 724, 114);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 50px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OFFICIAL NOTICE', 384, 79);

      ctx.fillStyle = '#16A34A';
      ctx.font = '900 66px "Arial Black", sans-serif';
      ctx.fillText('DREAM TAX', 384, 232);
      ctx.fillText('CANCELED! ✓', 384, 326);
    }

    this.billTex.needsUpdate = true;
  }

  private createPriceTagMesh(label: string, color: string): THREE.Object3D {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 384, 192);
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(8, 8, 368, 176);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = label.length > 6 ? '900 54px "Arial Black", sans-serif' : '900 84px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 192, 98);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const back = this.assets.createToonMaterial(`mat-ptag-${color}`, { color });
    return this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(2.1, 1.05, 0.14),
      [back, back, back, back, mat, back] as unknown as THREE.Material,
      { outlineScale: 1.04, castShadow: false }
    );
  }

  private buildDreamCloudsZone(): void {
    const zone = new THREE.Group();
    zone.visible = false;
    this.cloudZone = zone;

    // Fluffy bold-outlined white cloud island floor
    const cloudMat = this.assets.createToonMaterial('mat-dcloud-white', { color: '#FFFFFF' });
    const mainPlatform = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(6.4, 5.8, 0.9, 18), cloudMat, {
      outlineScale: 1.025,
      castShadow: false,
    });
    mainPlatform.position.set(0, -0.45, 0);
    zone.add(mainPlatform);

    // Puffy cloud bumps encircling the floor
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const puff = this.assets.createOutlinedMesh(new THREE.SphereGeometry(1.7, 10, 8), cloudMat, {
        outlineScale: 1.04,
        castShadow: false,
      });
      puff.position.set(Math.cos(a) * 5.6, -0.5, Math.sin(a) * 5.6);
      puff.scale.set(1.2, 0.65, 1.2);
      zone.add(puff);
    }

    // Distant floating background clouds
    const bgCoords: [number, number, number][] = [
      [-9, 4.5, -14],
      [9, 5.2, -13],
      [-7, 8.0, -18],
      [7, 7.6, -18],
    ];
    for (const [cx, cy, cz] of bgCoords) {
      const c = this.assets.createOutlinedMesh(new THREE.SphereGeometry(2.4, 10, 8), cloudMat, {
        outlineScale: 1.04,
        castShadow: false,
      });
      c.position.set(cx, cy, cz);
      c.scale.set(1.6, 0.65, 1.0);
      zone.add(c);
    }

    // LUXURY DREAM GROUP: Golden Castle + Giant Pink Frosted Flying Donuts!
    const luxury = new THREE.Group();
    const goldMat = this.assets.createToonMaterial('mat-dcastle-gold', { color: '#FACC15' });
    const pinkMat = this.assets.createToonMaterial('mat-dcastle-pink', { color: '#F472B6' });
    const doughMat = this.assets.createToonMaterial('mat-donut-dough', { color: '#E2A052' });
    const icingMat = this.assets.createToonMaterial('mat-donut-icing', { color: '#FB7185' });

    const castle = new THREE.Group();
    const keep = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, 3.6, 2.8), goldMat, {
      outlineScale: 1.03,
    });
    keep.position.y = 1.8;
    castle.add(keep);

    for (const tx of [-2.1, 0, 2.1]) {
      const th = tx === 0 ? 5.6 : 4.4;
      const turret = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.68, 0.76, th, 10), goldMat, {
        outlineScale: 1.04,
      });
      turret.position.set(tx, th * 0.5, 0);
      castle.add(turret);

      const spire = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.92, 1.85, 10), pinkMat, {
        outlineScale: 1.04,
      });
      spire.position.set(tx, th + 0.9, 0);
      castle.add(spire);
    }
    castle.position.set(0, 1.4, -7.2);
    this.castleGroup = castle;
    luxury.add(castle);

    // 4 Giant Pink-Glazed Flying Donuts!
    const donutCoords: [number, number, number][] = [
      [-3.1, 3.6, -2.8],
      [3.1, 3.4, -2.5],
      [-2.4, 5.4, -5.0],
      [2.5, 5.2, -4.8],
    ];
    for (let i = 0; i < donutCoords.length; i++) {
      const [dx, dy, dz] = donutCoords[i];
      const dg = new THREE.Group();
      const ring = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.85, 0.36, 10, 18), doughMat, {
        outlineScale: 1.05,
      });
      dg.add(ring);
      const icing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.38, 8, 18), icingMat);
      icing.position.z = 0.08;
      dg.add(icing);
      dg.position.set(dx, dy, dz);
      luxury.add(dg);
      this.floatingDonuts.push({ obj: dg, baseY: dy, phase: i * 1.5 });
    }
    this.luxuryGroup = luxury;
    zone.add(luxury);

    // RED PRICE TAGS + TINY FREE GREY BOX (when dreamMode === 'priced')
    const priceTags = new THREE.Group();
    const castleTag = this.createPriceTagMesh('$500!', '#DC2626');
    castleTag.position.set(0, 5.8, -4.8);
    priceTags.add(castleTag);

    const donutTag = this.createPriceTagMesh('$99!', '#DC2626');
    donutTag.position.set(2.5, 2.3, -1.6);
    priceTags.add(donutTag);

    const freeBoxMat = this.assets.createToonMaterial('mat-free-box', { color: '#9CA3AF' });
    const freeBox = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.15, 1.05, 1.15), freeBoxMat, {
      outlineScale: 1.05,
    });
    freeBox.position.set(-2.3, 0.54, 0.8);
    priceTags.add(freeBox);

    const freeTag = this.createPriceTagMesh('FREE', '#16A34A');
    freeTag.scale.setScalar(0.65);
    freeTag.position.set(-2.3, 1.7, 0.8);
    priceTags.add(freeTag);

    priceTags.visible = false;
    this.priceTagsGroup = priceTags;
    zone.add(priceTags);

    // BORING GREY TAX-AUDIT BOXES & FILING CABINETS (when dreamMode === 'boring_boxes')
    const boring = new THREE.Group();
    const greyMat = this.assets.createToonMaterial('mat-boring-grey', { color: '#94A3B8' });
    const beigeMat = this.assets.createToonMaterial('mat-boring-beige', { color: '#CBD5E1' });
    const handleMat = this.assets.createToonMaterial('mat-boring-handle', { color: '#334155' });

    const boxPositions: [number, number, number][] = [
      [-2.6, 2.4, -3.5],
      [2.6, 2.8, -3.2],
      [0.0, 3.2, -5.2],
      [-2.2, 4.6, -6.2],
      [2.4, 4.8, -6.0],
    ];
    for (let i = 0; i < boxPositions.length; i++) {
      const [bx, by, bz] = boxPositions[i];
      const cab = new THREE.Group();
      const body = this.assets.createOutlinedMesh(
        new THREE.BoxGeometry(1.45, 2.2, 1.1),
        i % 2 === 0 ? greyMat : beigeMat,
        { outlineScale: 1.04 }
      );
      cab.add(body);
      for (const dy of [-0.6, 0.0, 0.6]) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.14), handleMat);
        handle.position.set(0, dy, 0.56);
        cab.add(handle);
      }
      cab.position.set(bx, by, bz);
      boring.add(cab);
      this.boringProps.push({ obj: cab, baseY: by, phase: i * 1.3 });
    }

    const auditTag = this.createPriceTagMesh('TAX FORM!', '#475569');
    auditTag.scale.setScalar(1.3);
    auditTag.position.set(0, 5.2, -4.4);
    boring.add(auditTag);

    boring.visible = false;
    this.boringBoxesGroup = boring;
    zone.add(boring);

    this.root.add(zone);
  }

  public update(env: EnvironmentState, globalSeconds: number): void {
    const active = env.worldTheme === 'dream_city';
    this.root.visible = active;
    if (!active) return;

    const d = env.dreamState ?? {
      zone: 'city_night' as const,
      towerPulsing: true,
      towerExploding: false,
      showBillBoard: false,
      billBoardMode: 'dream_tax' as const,
      espressoStandActive: false,
      dreamMode: 'luxury' as const,
      pillowsActive: false,
    };

    const isCloud = d.zone === 'dream_clouds';
    this.nightZone.visible = !isCloud;
    this.cloudZone.visible = isCloud;

    if (!isCloud) {
      // Animate pulsing Dream Scanner Tower rings or overheating wobble!
      if (d.towerExploding) {
        this.towerSpire.rotation.z = 0.14 + Math.sin(globalSeconds * 28) * 0.06;
        for (const r of this.towerRings) {
          r.visible = true;
          (r.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
          r.scale.setScalar(1.5 + Math.sin(globalSeconds * 18) * 0.4);
        }
      } else {
        this.towerSpire.rotation.z = 0;
        for (let i = 0; i < this.towerRings.length; i++) {
          const r = this.towerRings[i];
          r.visible = d.towerPulsing;
          const u = (globalSeconds * 0.8 + i * 0.33) % 1.0;
          r.scale.setScalar(0.8 + u * 2.4);
          r.position.y = 11.4 + u * 2.0;
          (r.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.85;
        }
      }

      // Espresso stand steam puffs
      this.espressoGroup.visible = d.espressoStandActive;
      if (d.espressoStandActive) {
        for (let i = 0; i < this.espressoSteam.length; i++) {
          const u = (globalSeconds * 1.1 + i * 0.33) % 1.0;
          this.espressoSteam[i].position.y = 4.0 + u * 1.4;
          this.espressoSteam[i].position.x = Math.sin(globalSeconds * 2.5 + i) * 0.25;
        }
      }

      this.pillowsGroup.visible = d.pillowsActive;
      this.billBoardGroup.visible = d.showBillBoard;
      if (d.showBillBoard) {
        this.redrawBillBoard(d.billBoardMode);
      }
    } else {
      const isBoring = d.dreamMode === 'boring_boxes';
      this.luxuryGroup.visible = !isBoring;
      this.priceTagsGroup.visible = d.dreamMode === 'priced';
      this.boringBoxesGroup.visible = isBoring;

      if (!isBoring) {
        this.castleGroup.position.y = 1.4 + Math.sin(globalSeconds * 1.4) * 0.25;
        for (const dn of this.floatingDonuts) {
          dn.obj.position.y = dn.baseY + Math.sin(globalSeconds * 2.0 + dn.phase) * 0.35;
          dn.obj.rotation.y = globalSeconds * 1.1 + dn.phase;
          dn.obj.rotation.x = Math.sin(globalSeconds * 1.5 + dn.phase) * 0.35;
        }
      } else {
        for (const bp of this.boringProps) {
          bp.obj.position.y = bp.baseY + Math.sin(globalSeconds * 1.2 + bp.phase) * 0.28;
          bp.obj.rotation.y = Math.sin(globalSeconds * 0.6 + bp.phase) * 0.35;
        }
      }
    }
  }
}
