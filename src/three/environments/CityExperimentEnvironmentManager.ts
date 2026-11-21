import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { createSeededRng } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

/**
 * Multi-location 3D world implementing the high-retention RnS8S-d2aOI production language:
 *  - Zone A (0, 0, 0):    European City Crosswalk with tram rails, trees, pastel facades, & turquoise-domed cathedral
 *  - Zone B (0, 0, -36):  Aerial Town Island surrounded by blue water with giant waving milestone flag
 *  - Zone C (22, 0, 0):   Town Entrance Plaza Gate with crisp red-bordered dynamic Rule Signboard
 *  - Zone D (-26, 0, 0):  Cozy Wood-Paneled Interior Room with warm lamp, bed, desk, sparking Wi-Fi router
 *  - Zone E (22, 0, -24): Golden-Hour Celebration Party Deck overlooking the sunset water & distant island
 */
export class CityExperimentEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private chaosCarsGroup!: THREE.Group;
  private speakersGroup!: THREE.Group;
  private moneyBills: { mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }[] = [];
  private wifiSparksGroup!: THREE.Group;
  private flagBannerMesh!: THREE.Mesh;
  private flagCanvas!: HTMLCanvasElement;
  private flagTex!: THREE.CanvasTexture;
  private signFaceMesh!: THREE.Mesh;
  private signCanvas!: HTMLCanvasElement;
  private signTex!: THREE.CanvasTexture;
  private lastSignKey = '';
  private lastFlagText = '';

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'CityExperimentRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildZoneA_CityCrosswalk();
    this.buildZoneB_AerialIsland();
    this.buildZoneC_EntranceGate();
    this.buildZoneD_CozyInterior();
    this.buildZoneE_SunsetPartyDeck();
  }

  private buildZoneA_CityCrosswalk(): void {
    const zone = new THREE.Group();

    // Grey asphalt street
    const roadMat = this.assets.createToonMaterial('mat-city-road', { color: '#6E7278' });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 48), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    zone.add(road);

    // Sidewalks left & right
    const walkMat = this.assets.createToonMaterial('mat-city-walk', { color: '#C8C5BC' });
    for (const sx of [-7.8, 7.8]) {
      const sw = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.2, 0.24, 48), walkMat, {
        outlineScale: 1.008,
        castShadow: false,
      });
      sw.position.set(sx, 0.08, 0);
      zone.add(sw);
    }

    // Crisp white zebra crosswalk stripes at z = 4.5
    const stripeMat = this.assets.createToonMaterial('mat-zebra', { color: '#F6F7F8' });
    for (let x = -4.8; x <= 4.8; x += 1.6) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 3.2), stripeMat);
      stripe.position.set(x, 0.02, 4.5);
      stripe.receiveShadow = true;
      zone.add(stripe);
    }

    // Parallel metallic tram rails running straight down the avenue (iconic RnS8S-d2aOI detail!)
    const railMat = this.assets.createToonMaterial('mat-tram-rail', { color: '#2E3238' });
    for (const rx of [-2.4, -0.7, 0.7, 2.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 46), railMat);
      rail.position.set(rx, 0.025, -2);
      zone.add(rail);
    }

    // Pastel European apartment facades lining both sides of the boulevard
    const buildingColors = ['#E8C99B', '#D9A07A', '#C8D8B8', '#E2B49A', '#D6CEBA'];
    const winMat = this.assets.createToonMaterial('mat-city-win', { color: '#394D63' });
    const awningRed = this.assets.createToonMaterial('mat-city-awn-r', { color: '#C9382E' });
    const awningGreen = this.assets.createToonMaterial('mat-city-awn-g', { color: '#2F8548' });

    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const bz = 12 - i * 6.5;
        const h = 7.5 + (i % 3) * 1.6;
        const bMat = this.assets.createToonMaterial(`mat-bldg-${i % 5}`, {
          color: buildingColors[i % 5],
        });
        const bldg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, h, 5.8), bMat, {
          outlineScale: 1.02,
        });
        bldg.position.set(side * 9.8, h * 0.5, bz);
        zone.add(bldg);

        // Windows grid facing street
        for (let row = 0; row < 3; row++) {
          for (const wz of [-1.4, 0, 1.4]) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.78), winMat);
            win.position.set(side * 7.56, 2.7 + row * 1.9, bz + wz);
            zone.add(win);
          }
        }

        // Ground-floor café awning
        const awn = this.assets.createOutlinedMesh(
          new THREE.BoxGeometry(1.1, 0.2, 4.4),
          i % 2 === 0 ? awningRed : awningGreen,
          { outlineScale: 1.05 }
        );
        awn.position.set(side * 7.1, 2.0, bz);
        zone.add(awn);
      }

      // Lush boulevard street trees lining sidewalks
      const trunkMat = this.assets.createToonMaterial('mat-city-trunk', { color: '#5A3A1E' });
      const leafMat = this.assets.createToonMaterial('mat-city-leaf', { color: '#3A801A' });
      for (let tz = 10; tz >= -16; tz -= 5.2) {
        const tr = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 6), trunkMat, {
          outlineScale: 1.08,
        });
        tr.position.set(side * 5.9, 1.1, tz);
        zone.add(tr);
        const canopy = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(1.45, 1), leafMat, {
          outlineScale: 1.05,
        });
        canopy.position.set(side * 5.9, 3.1, tz);
        zone.add(canopy);
      }
    }

    // Monumental White & Turquoise-Domed Cathedral centering the vanishing point!
    const cath = new THREE.Group();
    const stoneMat = this.assets.createToonMaterial('mat-cath-stone', { color: '#F2EFE6' });
    const domeMat = this.assets.createToonMaterial('mat-cath-dome', { color: '#4DB6AC' });
    const base = this.assets.createOutlinedMesh(new THREE.BoxGeometry(11, 7.5, 6), stoneMat, { outlineScale: 1.02 });
    base.position.y = 3.75;
    cath.add(base);
    const drum = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.6, 2.8, 3.0, 12), stoneMat, {
      outlineScale: 1.03,
    });
    drum.position.y = 8.8;
    cath.add(drum);
    const dome = this.assets.createOutlinedMesh(
      new THREE.SphereGeometry(2.65, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat,
      { outlineScale: 1.035 }
    );
    dome.position.y = 10.2;
    cath.add(dome);
    cath.position.set(0, 0, -24.5);
    zone.add(cath);

    // Optional Chaos Cars parked sideways across the crosswalk (for Zero-Rules Town!)
    const chaosCars = new THREE.Group();
    const carColors = ['#E03B2D', '#F2B632', '#2E86DE'];
    const carSpecs: [number, number, number][] = [
      [-1.8, 2.5, 0.65],
      [1.7, 1.2, -0.82],
      [-0.3, -1.5, 1.4],
    ];
    carSpecs.forEach(([cx, cz, rot], i) => {
      const car = new THREE.Group();
      const cMat = this.assets.createToonMaterial(`mat-car-${i}`, { color: carColors[i] });
      const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.3, 0.72, 1.2), cMat, { outlineScale: 1.05 });
      body.position.y = 0.56;
      car.add(body);
      const cab = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.25, 0.58, 1.06), cMat, { outlineScale: 1.05 });
      cab.position.set(-0.1, 1.15, 0);
      car.add(cab);
      const wheelMat = this.assets.createToonMaterial('mat-wheel', { color: '#22262A' });
      for (const [wx, wz] of [[-0.72, 0.6], [0.72, 0.6], [-0.72, -0.6], [0.72, -0.6]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.24, wz);
        car.add(w);
      }
      car.position.set(cx, 0, cz);
      car.rotation.y = rot;
      chaosCars.add(car);
    });
    chaosCars.visible = false;
    zone.add(chaosCars);
    this.chaosCarsGroup = chaosCars;

    // Optional Giant Concert Speakers blasting on street
    const speakers = new THREE.Group();
    const spkMat = this.assets.createToonMaterial('mat-spk', { color: '#262B32' });
    const coneMat = this.assets.createToonMaterial('mat-spk-cone', { color: '#58626E' });
    for (const sx of [-3.4, 3.4]) {
      const spk = new THREE.Group();
      const box = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.2, 2.2, 0.9), spkMat, { outlineScale: 1.05 });
      box.position.y = 1.1;
      spk.add(box);
      for (const cy of [0.65, 1.55]) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.24, 0.12, 12), coneMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, cy, 0.45);
        spk.add(cone);
      }
      spk.position.set(sx, 0, 2.0);
      speakers.add(spk);
    }
    speakers.visible = false;
    zone.add(speakers);
    this.speakersGroup = speakers;

    // Floating Green Dollar Bills raining down on the crosswalk (for Free Million video!)
    const rng = createSeededRng(1000000);
    const billMat = this.assets.createToonMaterial('mat-dollar', { color: '#45B85A' });
    const billGeo = new THREE.BoxGeometry(0.42, 0.03, 0.22);
    for (let i = 0; i < 28; i++) {
      const bill = new THREE.Mesh(billGeo, billMat);
      const bx = -4.2 + rng() * 8.4;
      const bz = 1.5 + rng() * 6.5;
      bill.visible = false;
      zone.add(bill);
      this.moneyBills.push({ mesh: bill, baseX: bx, baseZ: bz, phase: rng() * Math.PI * 2 });
    }

    this.root.add(zone);
  }

  private buildZoneB_AerialIsland(): void {
    // High-angle aerial island at (0, 0, -48) surrounded by sparkling blue water
    const zone = new THREE.Group();
    zone.position.set(0, 0, -48);

    const waterMat = this.assets.createToonMaterial('mat-aerial-sea', { color: '#247BA8' });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), waterMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.35;
    zone.add(sea);

    const sandMat = this.assets.createToonMaterial('mat-aerial-sand', { color: '#DEC48C' });
    const grassMat = this.assets.createToonMaterial('mat-aerial-grass', { color: '#4C9A2A' });
    const islBase = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(7.2, 8.4, 0.8, 12), sandMat, {
      outlineScale: 1.02,
      castShadow: false,
    });
    islBase.position.y = 0.05;
    zone.add(islBase);

    const islTop = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(6.1, 6.7, 0.55, 12), grassMat, {
      outlineScale: 1.02,
      castShadow: false,
    });
    islTop.position.y = 0.52;
    zone.add(islTop);

    // Cozy miniature town houses + trees on the island
    const redRoof = this.assets.createToonMaterial('mat-mini-red', { color: '#C92B22' });
    const creamWall = this.assets.createToonMaterial('mat-mini-wall', { color: '#F4EFE4' });
    const treeMat = this.assets.createToonMaterial('mat-mini-tree', { color: '#2D6B18' });

    for (const [hx, hz] of [[-2.4, 1.4], [2.2, 2.0], [-1.8, -2.2], [2.4, -1.6]]) {
      const b = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.7, 1.2, 1.3), creamWall, { outlineScale: 1.05 });
      b.position.set(hx, 1.35, hz);
      zone.add(b);
      const r = this.assets.createOutlinedMesh(new THREE.ConeGeometry(1.4, 0.9, 4), redRoof, { outlineScale: 1.05 });
      r.rotation.y = Math.PI / 4;
      r.position.set(hx, 2.4, hz);
      zone.add(r);
    }

    for (const [tx, tz] of [[-4.2, 0], [4.1, 0.4], [0, 3.8], [-3.6, -3.2], [3.5, -3.4], [0.4, -4.1]]) {
      const tr = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(0.85, 1), treeMat, { outlineScale: 1.07 });
      tr.position.set(tx, 1.65, tz);
      zone.add(tr);
    }

    // Giant waving milestone flag right in the center!
    const poleMat = this.assets.createToonMaterial('mat-flag-pole', { color: '#D8DCE0' });
    const pole = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.09, 0.11, 5.2, 8), poleMat, {
      outlineScale: 1.1,
    });
    pole.position.set(0, 3.3, 0);
    zone.add(pole);

    this.flagCanvas = document.createElement('canvas');
    this.flagCanvas.width = 512;
    this.flagCanvas.height = 256;
    this.flagTex = new THREE.CanvasTexture(this.flagCanvas);
    this.flagTex.colorSpace = THREE.SRGBColorSpace;
    const flagMat = new THREE.MeshBasicMaterial({ map: this.flagTex, side: THREE.DoubleSide });
    this.flagBannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), flagMat);
    this.flagBannerMesh.position.set(2.2, 4.7, 0);
    zone.add(this.flagBannerMesh);

    this.root.add(zone);
  }

  private buildZoneC_EntranceGate(): void {
    // Town Gate & Signpost Stage at (26, 0, 0)
    const zone = new THREE.Group();
    zone.position.set(26, 0, 0);

    const plazaMat = this.assets.createToonMaterial('mat-gate-plaza', { color: '#C6955A' });
    const deck = this.assets.createOutlinedMesh(new THREE.BoxGeometry(14, 0.3, 14), plazaMat, {
      outlineScale: 1.005,
      castShadow: false,
    });
    deck.position.y = -0.15;
    zone.add(deck);

    const grassMat = this.assets.createToonMaterial('mat-gate-grass', { color: '#4E9A24' });
    const bgGrass = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), grassMat);
    bgGrass.rotation.x = -Math.PI / 2;
    bgGrass.position.y = -0.32;
    zone.add(bgGrass);

    // White picket fence gate beside the signboard
    const whiteMat = this.assets.createToonMaterial('mat-picket', { color: '#F6F7F8' });
    for (let px = -3.8; px <= -1.2; px += 0.42) {
      const slat = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.22, 1.45, 0.1), whiteMat, {
        outlineScale: 1.08,
      });
      slat.position.set(px, 0.72, -1.6);
      zone.add(slat);
    }

    // Crisp Red-Bordered Rule Signboard centered cleanly at x = 0 (posts safely behind the board!)
    const postMat = this.assets.createToonMaterial('mat-sign-wood', { color: '#613B1A' });
    for (const sx of [-0.95, 0.95]) {
      const post = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(sx, 1.3, -2.18);
      zone.add(post);
    }

    this.signCanvas = document.createElement('canvas');
    this.signCanvas.width = 512;
    this.signCanvas.height = 340;
    this.signTex = new THREE.CanvasTexture(this.signCanvas);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: this.signTex });
    const boardGeo = new THREE.BoxGeometry(2.65, 1.75, 0.12);
    this.signFaceMesh = new THREE.Mesh(boardGeo, [postMat, postMat, postMat, postMat, faceMat, postMat]);
    this.signFaceMesh.position.set(0, 2.55, -2.0);
    zone.add(this.signFaceMesh);

    const outline = new THREE.Mesh(boardGeo, this.assets.getOutlineMaterial());
    outline.position.copy(this.signFaceMesh.position);
    outline.scale.set(1.04, 1.05, 1.25);
    zone.add(outline);

    // Background trees behind gate
    const leafMat = this.assets.createToonMaterial('mat-gate-tree', { color: '#2F7018' });
    for (const [tx, tz] of [[-4.5, -5.5], [-1.0, -6.5], [3.5, -6.0], [5.8, -4.5]]) {
      const t = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(1.5, 1), leafMat, { outlineScale: 1.05 });
      t.position.set(tx, 2.6, tz);
      zone.add(t);
    }

    this.root.add(zone);
  }

  private buildZoneD_CozyInterior(): void {
    // Cozy wood-paneled interior room at (-28, 0, 0) for indoor sleep / router / crisis gags
    const zone = new THREE.Group();
    zone.position.set(-28, 0, 0);

    const woodTex = this.assets.getWoodPlankTexture('#8B5B34', '#5A381B', 'tex-interior-wall');
    const wallMat = this.assets.createToonMaterial('mat-int-wall', { color: '#FFFFFF', map: woodTex });
    const floorMat = this.assets.createToonMaterial('mat-int-floor', { color: '#6E4524' });

    // Back wall, side walls, floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    zone.add(floor);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 6.5, 0.3), wallMat);
    backWall.position.set(0, 3.25, -3.5);
    backWall.receiveShadow = true;
    zone.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.5, 10), wallMat);
    leftWall.position.set(-4.8, 3.25, 0);
    zone.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.5, 10), wallMat);
    rightWall.position.set(4.8, 3.25, 0);
    zone.add(rightWall);

    // Cozy bed with purple blanket on left
    const bedWood = this.assets.createToonMaterial('mat-bed-wood', { color: '#593418' });
    const blanket = this.assets.createToonMaterial('mat-blanket', { color: '#7D3C98' });
    const pillow = this.assets.createToonMaterial('mat-pillow', { color: '#F7F3EA' });
    const bedFrame = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.6, 0.72, 3.2), bedWood, { outlineScale: 1.04 });
    bedFrame.position.set(-2.2, 0.36, -1.6);
    zone.add(bedFrame);
    const mattress = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.4, 0.38, 2.9), blanket, { outlineScale: 1.04 });
    mattress.position.set(-2.2, 0.85, -1.5);
    zone.add(mattress);
    const pil = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.5, 0.25, 0.72), pillow, { outlineScale: 1.06 });
    pil.position.set(-2.2, 1.12, -2.55);
    zone.add(pil);

    // Wooden desk + warm glowing bedside lamp + White Wi-Fi Router on right
    const desk = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.5, 1.15, 1.35), bedWood, { outlineScale: 1.04 });
    desk.position.set(1.5, 0.58, -2.2);
    zone.add(desk);

    const lampShade = this.assets.createOutlinedMesh(
      new THREE.ConeGeometry(0.45, 0.62, 10),
      this.assets.createToonMaterial('mat-lamp', { color: '#FFE49E', emissive: '#FFBE42', emissiveIntensity: 0.7 }),
      { outlineScale: 1.06 }
    );
    lampShade.position.set(0.65, 1.85, -2.2);
    zone.add(lampShade);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.55, 8), bedWood);
    lampStem.position.set(0.65, 1.4, -2.2);
    zone.add(lampStem);

    // White Wi-Fi Router with 2 antennas
    const routerMat = this.assets.createToonMaterial('mat-router', { color: '#F4F6F8' });
    const router = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.92, 0.22, 0.52), routerMat, { outlineScale: 1.08 });
    router.position.set(1.75, 1.26, -2.1);
    zone.add(router);
    const antMat = this.assets.createToonMaterial('mat-ant', { color: '#2B3036' });
    for (const ax of [-0.32, 0.32]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), antMat);
      ant.position.set(1.75 + ax, 1.62, -2.2);
      zone.add(ant);
    }

    // Crackling yellow electric sparks over broken router!
    const sparks = new THREE.Group();
    const sparkMat = this.assets.createToonMaterial('mat-spark-zap', {
      color: '#FFE047',
      emissive: '#FFBB00',
      emissiveIntensity: 0.9,
    });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 4), sparkMat);
      bolt.position.set(1.75 + Math.cos(ang) * 0.55, 1.7 + Math.sin(ang) * 0.4, -1.95);
      bolt.rotation.z = ang - Math.PI / 2;
      sparks.add(bolt);
    }
    sparks.visible = false;
    zone.add(sparks);
    this.wifiSparksGroup = sparks;

    this.root.add(zone);
  }

  private buildZoneE_SunsetPartyDeck(): void {
    // Golden-hour honeymoon deck at (26, 0, -28) overlooking warm sunset sea
    const zone = new THREE.Group();
    zone.position.set(26, 0, -28);

    const seaMat = this.assets.createToonMaterial('mat-sunset-sea', { color: '#6E7F91' });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(54, 42), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.35, -14);
    zone.add(sea);

    const deckMat = this.assets.createToonMaterial('mat-party-deck', { color: '#B0743B' });
    const deck = this.assets.createOutlinedMesh(new THREE.BoxGeometry(12, 0.35, 9), deckMat, {
      outlineScale: 1.008,
      castShadow: false,
    });
    deck.position.y = -0.17;
    zone.add(deck);

    // Colorful festival celebration lanterns strung overhead!
    const lanternColors = ['#FF5E5B', '#FFED66', '#4ECDC4', '#FF9F1C', '#E06D94'];
    for (let i = 0; i < 7; i++) {
      const lx = -3.6 + i * 1.2;
      const ly = 3.55 - Math.cos(((i - 3) / 3) * 1.1) * 0.35;
      const l = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        this.assets.createToonMaterial(`mat-lantern-${i % 5}`, {
          color: lanternColors[i % 5],
          emissive: lanternColors[i % 5],
          emissiveIntensity: 0.45,
        }),
        { outlineScale: 1.1, castShadow: false }
      );
      l.position.set(lx, ly, -1.5);
      zone.add(l);
    }

    // Distant horizon silhouette island
    const islMat = this.assets.createToonMaterial('mat-sunset-isl', { color: '#7D6A54' });
    const isl = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), islMat);
    isl.scale.set(1.8, 0.4, 1.0);
    isl.position.set(0, -0.2, -22);
    zone.add(isl);

    this.root.add(zone);
  }

  private redrawDynamicSign(title: string, subtitle: string): void {
    const key = `${title}|${subtitle}`;
    if (this.lastSignKey === key) return;
    this.lastSignKey = key;

    const ctx = this.signCanvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 340);

    // Bold crimson border matching RnS8S-d2aOI signboard!
    ctx.strokeStyle = '#CC261D';
    ctx.lineWidth = 22;
    ctx.strokeRect(14, 14, 484, 312);

    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 5;
    ctx.strokeRect(28, 28, 456, 284);

    ctx.fillStyle = '#CC261D';
    ctx.font = '900 42px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 98);

    ctx.fillStyle = '#141414';
    ctx.font = '900 58px "Arial Black", "Helvetica Neue", sans-serif';
    const lines = subtitle.split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], 256, 210);
    } else {
      ctx.fillText(lines[0], 256, 182);
      ctx.fillText(lines[1], 256, 250);
    }

    this.signTex.needsUpdate = true;
  }

  private redrawDynamicFlag(text: string): void {
    if (this.lastFlagText === text) return;
    this.lastFlagText = text;

    const ctx = this.flagCanvas.getContext('2d')!;
    ctx.fillStyle = '#D9261E';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 18;
    ctx.strokeRect(14, 14, 484, 228);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 76px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 128);

    this.flagTex.needsUpdate = true;
  }

  public update(env: EnvironmentState, globalSeconds: number): void {
    const isCity = env.worldTheme === 'city_experiment';
    this.root.visible = isCity;
    if (!isCity) return;

    // 1. Update dynamic signboard & aerial flag
    this.redrawDynamicSign(env.citySignTitle ?? 'TOWN RULE', env.citySignSubtitle ?? 'NO RULES\nALLOWED');
    this.redrawDynamicFlag(env.cityFlagText ?? 'NO RULES!');
    this.flagBannerMesh.rotation.y = Math.sin(globalSeconds * 4.5) * 0.14;

    // 2. Toggle chaos cars & pulsing speakers
    this.chaosCarsGroup.visible = env.cityChaosCars ?? false;
    this.speakersGroup.visible = env.cityPartySpeakers ?? false;
    if (this.speakersGroup.visible) {
      const thump = 1 + Math.abs(Math.sin(globalSeconds * 16)) * 0.1;
      this.speakersGroup.scale.set(thump, thump, thump);
    }

    // 3. Raining green dollar bills on crosswalk (for Free Million hook!)
    const showMoney = env.cityMoneyRain ?? false;
    for (const b of this.moneyBills) {
      b.mesh.visible = showMoney;
      if (!showMoney) continue;
      const fall = (globalSeconds * 0.42 + b.phase) % 1;
      b.mesh.position.set(
        b.baseX + Math.sin(globalSeconds * 3 + b.phase) * 0.45,
        5.8 - fall * 5.6,
        b.baseZ
      );
      b.mesh.rotation.set(globalSeconds * 2.2 + b.phase, globalSeconds * 1.8, Math.sin(globalSeconds * 4 + b.phase));
    }

    // 4. Crackling electric sparks over broken indoor Wi-Fi router
    this.wifiSparksGroup.visible = env.interiorWifiBroken ?? false;
    if (this.wifiSparksGroup.visible) {
      this.wifiSparksGroup.rotation.z = globalSeconds * 6;
      const flash = 0.75 + Math.abs(Math.sin(globalSeconds * 22)) * 0.45;
      this.wifiSparksGroup.scale.setScalar(flash);
    }
  }
}
