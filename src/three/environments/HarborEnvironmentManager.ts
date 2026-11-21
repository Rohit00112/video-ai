import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, lerp, springPop } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

interface BobbingBoat {
  group: THREE.Group;
  basePos: THREE.Vector3;
  baseRotY: number;
  phase: number;
  threshold?: number;
}

interface SeagullRig {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  center: THREE.Vector3;
  radius: number;
  phase: number;
}

/**
 * Brand-new 3D Sunlit Coastal Harbor Community world matching the exact cel-shaded,
 * bold-ink-outlined storybook language of REFERENCE_STYLE_BIBLE.md.
 */
export class HarborEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private readonly clouds: { group: THREE.Group; baseX: number }[] = [];
  private readonly seagulls: SeagullRig[] = [];
  private readonly dockBoats: BobbingBoat[] = [];
  private readonly fleetBoats: BobbingBoat[] = [];
  private readonly mapPins: { mesh: THREE.Group; threshold: number }[] = [];

  private kaiBoathouse!: THREE.Group;
  private lighthouseHub!: THREE.Group;
  private beaconBeamGroup!: THREE.Group;
  private mapBoardGroup!: THREE.Group;
  private finnFishCrateFill!: THREE.Group;
  private heroBoatGroup!: THREE.Group;
  private oceanTexture!: THREE.CanvasTexture;

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'HarborEnvironmentRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildOceanAndPier();
    this.buildDistantIslandsAndCliffs();
    this.buildCloudsAndSeagulls();
    this.buildThreeBoathouses();
    this.buildPublicMapBoard();
    this.buildLighthouseCommunityHub();
    this.buildFleetSailboats();
    this.buildHeroBoatClearing();
  }

  private createOceanTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(5050);

    ctx.fillStyle = '#2596CA';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle deeper turquoise patches
    for (let i = 0; i < 160; i++) {
      const x = rng() * 512;
      const y = rng() * 512;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(20, 118, 170, 0.25)' : 'rgba(84, 198, 238, 0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, 22 + rng() * 44, 7 + rng() * 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp stylized storybook white wave highlights
    ctx.strokeStyle = 'rgba(235, 250, 255, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 95; i++) {
      const x = rng() * 460;
      const y = rng() * 512;
      const w = 18 + rng() * 34;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * 0.5, y - 5, x + w, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createPierPlankTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(6161);

    ctx.fillStyle = '#C9975B';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 16;
    const rh = 512 / rows;
    for (let r = 0; r < rows; r++) {
      const tint = (rng() - 0.5) * 18;
      ctx.fillStyle = `rgb(${201 + tint}, ${151 + tint}, ${91 + tint * 0.6})`;
      ctx.fillRect(0, r * rh, 512, rh);
      ctx.strokeStyle = '#6B4822';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, r * rh);
      ctx.lineTo(512, r * rh);
      ctx.stroke();

      // Nail dots along edges
      ctx.fillStyle = '#3B2814';
      for (const nx of [28, 256, 484]) {
        ctx.beginPath();
        ctx.arc(nx, r * rh + rh * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 10);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createBlueShingleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2569AE';
    ctx.fillRect(0, 0, 256, 256);

    const rows = 10;
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? 'rgba(130, 196, 255, 0.14)' : 'rgba(12, 42, 84, 0.16)';
      ctx.fillRect(0, r * rh, 256, rh);
      ctx.strokeStyle = '#153F6E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, r * rh);
      ctx.lineTo(256, r * rh);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createPublicMapTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    // Dark timber frame
    ctx.fillStyle = '#5C3A1B';
    ctx.fillRect(0, 0, 512, 360);

    // Parchment sea chart background
    ctx.fillStyle = '#F5E8C6';
    ctx.fillRect(20, 20, 472, 320);

    // Turquoise bay water illustration
    ctx.fillStyle = '#9ED8F0';
    ctx.beginPath();
    ctx.moveTo(150, 20);
    ctx.quadraticCurveTo(210, 180, 130, 340);
    ctx.lineTo(492, 340);
    ctx.lineTo(492, 20);
    ctx.closePath();
    ctx.fill();

    // Small illustrated islands on chart
    ctx.fillStyle = '#98C76B';
    ctx.strokeStyle = '#5A4A2E';
    ctx.lineWidth = 3;
    for (const [ix, iy, ir] of [
      [290, 110, 26],
      [395, 190, 32],
      [260, 265, 22],
      [410, 90, 18],
    ]) {
      ctx.beginPath();
      ctx.ellipse(ix, iy, ir * 1.2, ir * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Dotted sea routes
    ctx.strokeStyle = '#33597A';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(155, 220);
    ctx.quadraticCurveTo(250, 160, 395, 190);
    ctx.moveTo(165, 135);
    ctx.quadraticCurveTo(260, 90, 410, 90);
    ctx.stroke();
    ctx.setLineDash([]);

    // Header banner "HARBOR MAP"
    ctx.fillStyle = '#1E467A';
    ctx.fillRect(20, 20, 472, 54);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PUBLIC HARBOR MAP', 256, 48);

    // Outer ink frame
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 472, 320);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildOceanAndPier(): void {
    // 1. Vast turquoise ocean plane sitting at y = -0.35
    this.oceanTexture = this.createOceanTexture();
    const oceanMat = this.assets.createToonMaterial('mat-harbor-ocean', {
      color: '#FFFFFF',
      map: this.oceanTexture,
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.35;
    ocean.receiveShadow = true;
    this.root.add(ocean);

    // 2. Warm sandy coastal shore embankment on the left supporting the boathouses
    const sandMat = this.assets.createToonMaterial('mat-harbor-sand', { color: '#E8C882' });
    const shore = this.assets.createOutlinedMesh(new THREE.BoxGeometry(11, 0.85, 52), sandMat, {
      outlineScale: 1.008,
      castShadow: false,
      receiveShadow: true,
    });
    shore.position.set(-7.8, -0.43, -2);
    this.root.add(shore);

    // 3. Long weathered timber boardwalk pier along the waterfront (y = 0.0 top surface!)
    const pierTex = this.createPierPlankTexture();
    const pierMat = this.assets.createToonMaterial('mat-harbor-pier', {
      color: '#FFFFFF',
      map: pierTex,
    });
    const pierDeck = this.assets.createOutlinedMesh(new THREE.BoxGeometry(6.8, 0.32, 46), pierMat, {
      outlineScale: 1.008,
      castShadow: false,
      receiveShadow: true,
    });
    pierDeck.position.set(-0.6, -0.16, -2);
    this.root.add(pierDeck);

    // Pier timber pilings + cast-iron mooring bollards along the water's edge (x = +2.65)
    const pilingMat = this.assets.createToonMaterial('mat-piling', { color: '#5A3A1E' });
    const bollardMat = this.assets.createToonMaterial('mat-bollard', { color: '#37414A' });
    for (let z = 18; z >= -22; z -= 4.0) {
      const piling = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8), pilingMat, {
        outlineScale: 1.09,
      });
      piling.position.set(2.65, -0.22, z);
      this.root.add(piling);

      if (Math.abs(z) % 8 < 1) {
        const bollard = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.14, 0.17, 0.36, 8), bollardMat, {
          outlineScale: 1.1,
        });
        bollard.position.set(2.35, 0.18, z);
        this.root.add(bollard);
      }
    }
  }

  private buildDistantIslandsAndCliffs(): void {
    const cliffMat = this.assets.createToonMaterial('mat-cliff', { color: '#8E887B' });
    const grassCapMat = this.assets.createToonMaterial('mat-island-grass', { color: '#4E9928' });
    const trunkMat = this.assets.createToonMaterial('mat-coastal-trunk', { color: '#6E4A24' });

    const islands: [number, number, number, number][] = [
      [-14, -22, 6.5, 4.2],
      [14, -26, 7.8, 4.8],
      [22, -10, 5.5, 3.2],
      [-18, 6, 5.2, 3.4],
      [2, -32, 8.5, 5.4],
    ];

    islands.forEach(([ix, iz, rad, h], idx) => {
      const isl = new THREE.Group();
      const rock = this.assets.createOutlinedMesh(new THREE.ConeGeometry(rad, h, 7), cliffMat, {
        outlineScale: 1.03,
        castShadow: false,
      });
      rock.position.y = h * 0.35 - 0.5;
      isl.add(rock);

      const cap = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(rad * 0.6, 1), grassCapMat, {
        outlineScale: 1.04,
        castShadow: false,
      });
      cap.scale.set(1.2, 0.42, 1.2);
      cap.position.y = h * 0.65 - 0.5;
      isl.add(cap);

      // Stylized coastal tree on island
      const tr = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6), trunkMat, {
        outlineScale: 1.08,
        castShadow: false,
      });
      tr.position.set(0.4, h * 0.8, 0);
      isl.add(tr);
      const foliage = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(1.1, 1), grassCapMat, {
        outlineScale: 1.06,
        castShadow: false,
      });
      foliage.position.set(0.4, h * 0.8 + 1.35, 0);
      isl.add(foliage);

      isl.position.set(ix, 0, iz);
      isl.rotation.y = idx * 1.1;
      this.root.add(isl);
    });
  }

  private buildCloudsAndSeagulls(): void {
    const cloudMat = this.assets.createToonMaterial('mat-harbor-cloud', { color: '#FAFDFF' });
    const configs: [number, number, number, number][] = [
      [-6, 15.8, -10, 1.65],
      [3.5, 16.6, -6, 1.9],
      [11, 15.0, -15, 1.6],
      [-12, 16.2, -19, 1.9],
      [0, 17.5, -24, 2.2],
      [7, 14.8, 5, 1.45],
    ];
    configs.forEach(([x, y, z, s]) => {
      const group = new THREE.Group();
      for (const [px, py, pz, r] of [
        [0, 0, 0, 1.45],
        [-1.3, -0.18, 0.2, 1.12],
        [1.35, -0.15, -0.15, 1.2],
        [0.5, 0.5, 0.3, 1.0],
      ]) {
        const puff = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(r, 1), cloudMat, {
          outlineScale: 1.045,
          castShadow: false,
          receiveShadow: false,
        });
        puff.position.set(px, py, pz);
        group.add(puff);
      }
      group.position.set(x, y, z);
      group.scale.setScalar(s);
      this.root.add(group);
      this.clouds.push({ group, baseX: x });
    });

    // Circling stylized white seagulls overhead
    const gullMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide });
    const wingGeo = new THREE.PlaneGeometry(0.55, 0.18);
    wingGeo.translate(0.275, 0, 0);
    const centers: [number, number, number, number][] = [
      [1.0, 9.2, -5.0, 4.8],
      [-2.0, 10.6, 2.0, 5.4],
      [6.0, 8.0, -10.0, 4.2],
      [9.5, 3.8, 4.5, 2.2],
    ];
    centers.forEach(([cx, cy, cz, radius], idx) => {
      const g = new THREE.Group();
      const wingL = new THREE.Mesh(wingGeo, gullMat);
      wingL.rotation.y = Math.PI;
      const wingR = new THREE.Mesh(wingGeo, gullMat);
      g.add(wingL, wingR);
      this.root.add(g);
      this.seagulls.push({
        group: g,
        wingL,
        wingR,
        center: new THREE.Vector3(cx, cy, cz),
        radius,
        phase: idx * 1.7,
      });
    });
  }

  private createSailboat(hullColor: string, sailColor: string, scale = 1.0): THREE.Group {
    const boat = new THREE.Group();
    const hullMat = this.assets.createToonMaterial(`mat-hull-${hullColor}`, { color: hullColor });
    const trimMat = this.assets.createToonMaterial('mat-boat-trim', { color: '#F7F3EA' });
    const mastMat = this.assets.createToonMaterial('mat-mast', { color: '#6E4620' });
    const sailMat = this.assets.createToonMaterial(`mat-sail-${sailColor}`, { color: sailColor });

    // Tapered boat hull
    const hullGeo = new THREE.CylinderGeometry(0.95, 0.62, 0.62, 8);
    hullGeo.scale(1.65, 1, 0.85);
    const hull = this.assets.createOutlinedMesh(hullGeo, hullMat, { outlineScale: 1.06 });
    hull.position.y = 0.25;
    boat.add(hull);

    const gunwale = this.assets.createOutlinedMesh(
      new THREE.CylinderGeometry(0.98, 0.96, 0.1, 8).scale(1.66, 1, 0.86),
      trimMat,
      { outlineScale: 1.04 }
    );
    gunwale.position.y = 0.56;
    boat.add(gunwale);

    // Wooden mast
    const mast = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.055, 0.065, 2.55, 6), mastMat, {
      outlineScale: 1.12,
    });
    mast.position.set(0.05, 1.65, 0);
    boat.add(mast);

    // Crisp triangular mainsail
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(1.25, 0.12);
    sailShape.quadraticCurveTo(0.68, 1.05, 0, 2.05);
    sailShape.closePath();
    const sailGeo = new THREE.ExtrudeGeometry(sailShape, { depth: 0.07, bevelEnabled: false });
    const sail = this.assets.createOutlinedMesh(sailGeo, sailMat, { outlineScale: 1.06 });
    sail.position.set(0.1, 0.78, -0.035);
    boat.add(sail);

    // Front jib sail
    const jibShape = new THREE.Shape();
    jibShape.moveTo(0, 0);
    jibShape.lineTo(-0.85, 0.08);
    jibShape.lineTo(0, 1.55);
    jibShape.closePath();
    const jibGeo = new THREE.ExtrudeGeometry(jibShape, { depth: 0.06, bevelEnabled: false });
    const jib = this.assets.createOutlinedMesh(jibGeo, trimMat, { outlineScale: 1.06 });
    jib.position.set(-0.02, 0.86, -0.03);
    boat.add(jib);

    // Cute tiny red pennant flag at mast top
    const flag = this.assets.createOutlinedMesh(
      new THREE.ConeGeometry(0.12, 0.42, 4),
      this.assets.createToonMaterial('mat-pennant', { color: '#E03B2D' }),
      { outlineScale: 1.1 }
    );
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(0.24, 2.86, 0);
    boat.add(flag);

    boat.scale.setScalar(scale);
    return boat;
  }

  private createBoathouse(x: number, z: number, awningColor: string): THREE.Group {
    const house = new THREE.Group();
    const wallMat = this.assets.createToonMaterial('mat-bh-wall', { color: '#F5EFE2' });
    const roofMat = this.assets.createToonMaterial('mat-bh-roof', {
      color: '#FFFFFF',
      map: this.createBlueShingleTexture(),
    });
    const doorMat = this.assets.createToonMaterial('mat-bh-door', { color: '#215B94' });
    const brassMat = this.assets.createToonMaterial('mat-bh-brass', { color: '#E5B23E' });
    const glowMat = this.assets.createToonMaterial('mat-bh-glow', {
      color: '#FFF0A0',
      emissive: '#F2C94C',
      emissiveIntensity: 0.4,
    });
    const awningMat = this.assets.createToonMaterial(`mat-awning-${awningColor}`, { color: awningColor });

    // Whitewashed coastal boathouse walls
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(3.6, 2.45, 2.9), wallMat, { outlineScale: 1.03 });
    body.position.y = 1.22;
    house.add(body);

    // Cobalt-blue pitched roof
    const roofGeo = new THREE.ConeGeometry(3.08, 1.75, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = this.assets.createOutlinedMesh(roofGeo, roofMat, { outlineScale: 1.035 });
    roof.position.y = 3.25;
    house.add(roof);

    // Coastal blue wooden door
    const door = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.95, 1.6, 0.14), doorMat, { outlineScale: 1.06 });
    door.position.set(-0.68, 0.8, 1.46);
    house.add(door);

    // Round brass porthole window
    const portholeFrame = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.46, 0.08, 8, 18), brassMat, {
      outlineScale: 1.08,
    });
    portholeFrame.position.set(0.84, 1.42, 1.48);
    house.add(portholeFrame);

    const portholeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), glowMat);
    portholeGlass.position.set(0.84, 1.42, 1.46);
    house.add(portholeGlass);

    // Sloped coastal awning over window
    const awning = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.38, 0.14, 0.65), awningMat, {
      outlineScale: 1.06,
    });
    awning.position.set(0.84, 2.02, 1.65);
    awning.rotation.x = 0.35;
    house.add(awning);

    // Red-and-white life ring hanging beside door!
    const ring = this.assets.createOutlinedMesh(
      new THREE.TorusGeometry(0.28, 0.08, 8, 14),
      this.assets.createToonMaterial('mat-lifering', { color: '#E03B2D' }),
      { outlineScale: 1.1 }
    );
    ring.position.set(-1.38, 1.32, 1.5);
    house.add(ring);

    house.position.set(x, 0, z);
    return house;
  }

  private buildThreeBoathouses(): void {
    // Boathouse 1 (Finn)
    this.root.add(this.createBoathouse(-3.9, 7.0, '#E8B828'));

    // Finn's wooden fish crate beside his dock
    const crateMat = this.assets.createToonMaterial('mat-fish-crate', { color: '#A87139' });
    const crate = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.05, 0.68, 0.85), crateMat, {
      outlineScale: 1.06,
    });
    crate.position.set(-3.3, 0.34, 9.2);
    this.root.add(crate);

    // Silver-blue fish peeking out of Finn's crate (hidden when empty!)
    const fishGroup = new THREE.Group();
    const fishMat = this.assets.createToonMaterial('mat-fish', { color: '#6AC4E8' });
    for (let i = 0; i < 4; i++) {
      const fish = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.18, 8, 6), fishMat, {
        outlineScale: 1.12,
      });
      fish.scale.set(1.6, 0.65, 0.55);
      fish.position.set(-3.55 + i * 0.18, 0.72, 9.1 + (i % 2) * 0.18);
      fish.rotation.z = 0.35;
      fishGroup.add(fish);
    }
    this.root.add(fishGroup);
    this.finnFishCrateFill = fishGroup;

    // Boathouse 2 (Cora)
    this.root.add(this.createBoathouse(-3.3, -1.5, '#D9483B'));

    // Boathouse 3 (Kai -> swaps into Lighthouse Hub!)
    this.kaiBoathouse = this.createBoathouse(-2.7, -10.5, '#2569AE');
    this.root.add(this.kaiBoathouse);

    // 3 individual captain sailboats moored along the pier water edge
    const boatSpecs: [string, string, number, number, number][] = [
      ['#C97E34', '#FFF4C2', 4.4, 8.6, -0.35],
      ['#D9483B', '#FFFFFF', 4.4, 0.4, -0.25],
      ['#1E467A', '#FFFFFF', 4.4, -8.4, -0.4],
    ];
    boatSpecs.forEach(([hull, sail, bx, bz, rot], idx) => {
      const boat = this.createSailboat(hull, sail, 0.95);
      boat.position.set(bx, -0.25, bz);
      boat.rotation.y = rot;
      this.root.add(boat);
      this.dockBoats.push({
        group: boat,
        basePos: new THREE.Vector3(bx, -0.25, bz),
        baseRotY: rot,
        phase: idx * 1.9,
      });
    });
  }

  private buildPublicMapBoard(): void {
    const group = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-map-post', { color: '#5A3818' });

    // Support posts cleanly behind the board so they NEVER obscure the map face!
    for (const px of [-0.72, 0.72]) {
      const post = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.16, 1.85, 0.16), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(px, 0.92, -0.15);
      group.add(post);
    }

    const boardGeo = new THREE.BoxGeometry(2.35, 1.65, 0.12);
    const faceMat = new THREE.MeshBasicMaterial({ map: this.createPublicMapTexture() });
    const board = new THREE.Mesh(boardGeo, [postMat, postMat, postMat, postMat, faceMat, postMat]);
    board.position.set(0, 1.82, 0);
    board.castShadow = true;
    group.add(board);

    const outline = new THREE.Mesh(boardGeo, this.assets.getOutlineMaterial());
    outline.position.copy(board.position);
    outline.scale.set(1.04, 1.055, 1.25);
    group.add(outline);

    // 14 vibrant 3D map pins that pop onto the public chart!
    const rng = createSeededRng(7070);
    const pinColors = ['#E53935', '#F5C542', '#2ECC71', '#FF7833', '#9B59B6'];
    for (let i = 0; i < 14; i++) {
      const pin = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(0.095, 8, 8),
        this.assets.createToonMaterial(`mat-pin-${i % 5}`, { color: pinColors[i % 5] }),
        { outlineScale: 1.15, castShadow: false }
      );
      const px = -0.78 + rng() * 1.65;
      const py = 1.22 + rng() * 0.98;
      pin.position.set(px, py, 0.12);
      pin.visible = false;
      group.add(pin);
      this.mapPins.push({ mesh: pin, threshold: (i + 1) / 14 });
    }

    group.position.set(-1.35, 0, -8.3);
    group.rotation.y = 0.06;
    group.visible = false;
    this.root.add(group);
    this.mapBoardGroup = group;
  }

  private buildLighthouseCommunityHub(): void {
    const hub = new THREE.Group();
    const whiteMat = this.assets.createToonMaterial('mat-lh-white', { color: '#F9F7F2' });
    const redMat = this.assets.createToonMaterial('mat-lh-red', { color: '#CC261D' });
    const darkMat = this.assets.createToonMaterial('mat-lh-dark', { color: '#242B33' });
    const lanternMat = this.assets.createToonMaterial('mat-lh-lantern', {
      color: '#FFF08A',
      emissive: '#FFCC33',
      emissiveIntensity: 0.9,
    });

    // Stone base pedestal
    const stoneBase = this.assets.createOutlinedMesh(
      new THREE.CylinderGeometry(2.15, 2.55, 1.35, 10),
      this.assets.createToonMaterial('mat-lh-stone', { color: '#9BA2AA' }),
      { outlineScale: 1.03 }
    );
    stoneBase.position.y = 0.68;
    hub.add(stoneBase);

    // 5 Alternating White & Crimson Lighthouse Tower Bands
    const bands: [number, number, number, boolean][] = [
      [1.35, 1.82, 1.55, true],
      [2.9, 1.62, 1.45, false],
      [4.35, 1.44, 1.4, true],
      [5.75, 1.26, 1.35, false],
      [7.1, 1.12, 1.2, true],
    ];
    for (const [yBot, rBot, h, isWhite] of bands) {
      const seg = this.assets.createOutlinedMesh(
        new THREE.CylinderGeometry(rBot * 0.9, rBot, h, 14),
        isWhite ? whiteMat : redMat,
        { outlineScale: 1.038 }
      );
      seg.position.y = yBot + h * 0.5;
      hub.add(seg);
    }

    // Balcony gallery ring
    const gallery = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.38, 1.22, 0.34, 14), darkMat, {
      outlineScale: 1.05,
    });
    gallery.position.y = 8.42;
    hub.add(gallery);

    // Glowing glass lantern room
    const lantern = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.95, 0.95, 1.25, 12), lanternMat, {
      outlineScale: 1.05,
    });
    lantern.position.y = 9.2;
    hub.add(lantern);

    // Crimson conical cupola roof + golden lightning finial
    const roof = this.assets.createOutlinedMesh(new THREE.ConeGeometry(1.22, 1.4, 12), redMat, {
      outlineScale: 1.05,
    });
    roof.position.y = 10.48;
    hub.add(roof);

    // Rotating translucent golden beacon light beams!
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, 9.2, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#FFE57A',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const dir of [-1, 1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.1, 11.5, 12, 1, true), beamMat);
      cone.rotation.z = dir * (Math.PI / 2);
      cone.position.x = dir * 6.0;
      beamGroup.add(cone);
    }
    hub.add(beamGroup);
    this.beaconBeamGroup = beamGroup;

    // Attached cozy whitewashed Harbor Keeper's Hall beside the lighthouse
    const hall = this.createBoathouse(2.55, 0.6, '#CC261D');
    hall.scale.setScalar(0.86);
    hub.add(hall);

    hub.position.set(-3.3, 0, -11.8);
    hub.visible = false;
    this.root.add(hub);
    this.lighthouseHub = hub;
  }

  private buildFleetSailboats(): void {
    const rng = createSeededRng(8282);
    const hullColors = ['#E03B2D', '#2569AE', '#F2B632', '#2E9E5B', '#D96B27', '#8E44AD'];
    const sailColors = ['#FFFFFF', '#FFF4CC', '#E8F7FF'];

    const coords: [number, number, number][] = [
      [5.5, -12.0, 0.9], [7.8, -8.5, 0.85], [6.2, -4.0, 0.88], [9.4, -14.5, 0.92],
      [4.8, -16.5, 0.95], [10.8, -6.2, 0.82], [8.0, -1.2, 0.86], [5.4, 4.2, 0.85],
      [11.2, -11.5, 0.9], [7.2, -18.5, 0.92], [12.5, -2.5, 0.84], [4.9, 12.2, 0.88],
    ];

    coords.forEach(([bx, bz, s], i) => {
      const boat = this.createSailboat(
        hullColors[i % hullColors.length],
        sailColors[i % sailColors.length],
        s
      );
      const rot = -0.6 + rng() * 1.2;
      boat.position.set(bx, -0.25, bz);
      boat.rotation.y = rot;
      boat.visible = false;
      this.root.add(boat);
      this.fleetBoats.push({
        group: boat,
        basePos: new THREE.Vector3(bx, -0.25, bz),
        baseRotY: rot,
        phase: i * 1.15,
        threshold: (i + 1) / coords.length,
      });
    });
  }

  private buildHeroBoatClearing(): void {
    // Hero coastal bay stage at (9.5, 0, 6.0) for Scene 2 & Scene 16!
    const boat = this.createSailboat('#D9483B', '#FFFFFF', 1.18);
    boat.position.set(9.5, -0.2, 6.0);
    boat.rotation.y = -0.35;
    boat.visible = false;
    this.root.add(boat);
    this.heroBoatGroup = boat;

    // Red-and-white striped coastal buoy bobbing nearby
    const buoy = this.assets.createOutlinedMesh(
      new THREE.ConeGeometry(0.32, 0.9, 8),
      this.assets.createToonMaterial('mat-buoy', { color: '#E03B2D' }),
      { outlineScale: 1.09 }
    );
    buoy.position.set(7.6, 0.12, 4.4);
    this.root.add(buoy);
  }

  public update(
    env: EnvironmentState,
    sceneProgress: number,
    sceneElapsedSeconds: number,
    globalSeconds: number
  ): void {
    const isHarbor = env.worldTheme === 'harbor';
    this.root.visible = isHarbor;
    if (!isHarbor) return;

    // 1. Gently animate ocean waves texture offset
    this.oceanTexture.offset.set(globalSeconds * 0.03, globalSeconds * 0.02);

    // 2. Drift clouds & circle seagulls
    for (const c of this.clouds) {
      c.group.position.x = c.baseX + Math.sin(globalSeconds * 0.12 + c.baseX) * 1.3;
    }
    for (const g of this.seagulls) {
      const ang = globalSeconds * 0.55 + g.phase;
      g.group.position.set(
        g.center.x + Math.cos(ang) * g.radius,
        g.center.y + Math.sin(ang * 2.2) * 0.4,
        g.center.z + Math.sin(ang) * g.radius
      );
      g.group.rotation.y = -ang;
      const flap = Math.sin(globalSeconds * 9 + g.phase) * 0.55;
      g.wingL.rotation.z = -flap;
      g.wingR.rotation.z = flap;
    }

    // 3. Docked captain boats bob gently on the bay
    this.dockBoats.forEach((b, idx) => {
      let extraX = 0;
      if (idx === 1 && env.coraBoatExploring) {
        extraX = Math.sin(globalSeconds * 1.1) * 1.4 + 0.8;
      }
      b.group.position.set(
        b.basePos.x + extraX,
        b.basePos.y + Math.sin(globalSeconds * 2.4 + b.phase) * 0.09,
        b.basePos.z
      );
      b.group.rotation.z = Math.sin(globalSeconds * 2.1 + b.phase) * 0.06;
      b.group.rotation.y = b.baseRotY + Math.sin(globalSeconds * 1.2 + b.phase) * 0.05;
    });

    // 4. Finn's fish crate contents
    this.finnFishCrateFill.visible = (env.finnCrateFishCount ?? 0) > 0.1;

    // 5. Public Harbor Map Board + spring-popping pins
    this.mapBoardGroup.visible = env.showMapBoard ?? false;
    if (this.mapBoardGroup.visible) {
      const pop = springPop(Math.min(1, sceneElapsedSeconds + 0.18), 200, 15);
      this.mapBoardGroup.scale.setScalar(clamp(pop, 0.01, 1.06));
      const pinProgress =
        env.harborMapPinsEndProgress !== undefined
          ? lerp(env.harborMapPinsProgress ?? 0, env.harborMapPinsEndProgress, sceneProgress)
          : env.harborMapPinsProgress ?? 0;

      for (const p of this.mapPins) {
        const active = pinProgress >= p.threshold - 0.04;
        p.mesh.visible = active;
        if (active) {
          const local = clamp((pinProgress - (p.threshold - 0.08)) / 0.08, 0, 1);
          p.mesh.scale.setScalar(clamp(springPop(local * 0.4, 280, 15), 0.01, 1.25));
        }
      }
    }

    // 6. Lighthouse Community Hub + rotating golden beacon beam
    const upgraded = env.lighthouseUpgraded ?? false;
    this.kaiBoathouse.visible = !upgraded;
    this.lighthouseHub.visible = upgraded;
    if (upgraded) {
      this.beaconBeamGroup.rotation.y = globalSeconds * 1.15;
    }

    // 7. Expanding community fleet of 12 sailboats
    const fleetProg =
      env.harborFleetEndProgress !== undefined
        ? lerp(env.harborFleetProgress ?? 0, env.harborFleetEndProgress, sceneProgress)
        : env.harborFleetProgress ?? 0;

    for (const b of this.fleetBoats) {
      const visible = fleetProg >= (b.threshold ?? 0.5) - 0.04;
      b.group.visible = visible;
      if (visible) {
        const local = clamp((fleetProg - ((b.threshold ?? 0.5) - 0.1)) / 0.1, 0, 1);
        const pop = springPop(local * 0.45, 210, 14);
        b.group.scale.setScalar(clamp(pop, 0.01, 1.05));
        b.group.position.set(
          b.basePos.x + Math.sin(globalSeconds * 0.6 + b.phase) * 0.45,
          b.basePos.y + Math.sin(globalSeconds * 2.3 + b.phase) * 0.1,
          b.basePos.z + Math.cos(globalSeconds * 0.5 + b.phase) * 0.35
        );
        b.group.rotation.z = Math.sin(globalSeconds * 2.0 + b.phase) * 0.07;
      }
    }

    // 8. Hero Sailboat in clearing (Scene 2 & Scene 16)
    this.heroBoatGroup.visible = env.showHeroBoat ?? false;
    if (this.heroBoatGroup.visible) {
      const pop = springPop(Math.max(0, sceneElapsedSeconds - 0.08), 210, 14);
      this.heroBoatGroup.scale.setScalar(clamp(pop, 0.001, 1.12) * 1.18);
      this.heroBoatGroup.position.y = -0.18 + Math.sin(globalSeconds * 3.0) * 0.09;
      this.heroBoatGroup.rotation.z = Math.sin(globalSeconds * 2.4) * 0.06;
    }
  }
}
