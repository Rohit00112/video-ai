import * as THREE from 'three';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, lerp, springPop } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

interface ChimneySmokePuff {
  mesh: THREE.Group;
  origin: THREE.Vector3;
  phaseOffset: number;
  belongsToLeoCottage?: boolean;
}

interface BarrelRig {
  group: THREE.Group;
  waterMesh: THREE.Mesh;
}

export class EnvironmentManager {
  private readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  // Dynamic / interactive environment handles
  private readonly clouds: { group: THREE.Group; baseX: number; speed: number }[] = [];
  private readonly chimneyPuffs: ChimneySmokePuff[] = [];
  private readonly butterflies: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];

  private samBarrel!: BarrelRig;
  private mayaBarrel!: BarrelRig;
  private leoCottage!: THREE.Group;
  private leoEstate!: THREE.Group;
  private waterwheelGroup!: THREE.Group;
  private waterStreamMesh!: THREE.Mesh;
  private helpSign!: THREE.Group;
  private heroBucketGroup!: THREE.Group;
  private pipeSegments: { group: THREE.Group; threshold: number }[] = [];

  // Bamboo Roots story mode 3D elements
  private gardenPlotsGroup!: THREE.Group;
  private mayaFlowersGroup!: THREE.Group;
  private leoRootsGroup!: THREE.Group;
  private leoBambooStalks: { group: THREE.Group; targetHeight: number; delay: number }[] = [];
  private leoPavilionGroup!: THREE.Group;
  private heroSproutPotGroup!: THREE.Group;

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'EnvironmentRoot';
    scene.add(this.root);

    this.buildTerrainAndRoad();
    this.buildForestAndHills();
    this.buildClouds();
    this.buildThreeCottagesAndBarrels();
    this.buildLeoPipeSystem();
    this.buildLeoUpgradedEstate();
    this.buildHelpSign();
    this.buildHeroSpringClearing();
    this.buildBambooGardenSystem();
    this.buildWildflowersRocksAndFences();
    this.buildButterflies();
  }

  public getWaterwheelGroup(): THREE.Group {
    return this.waterwheelGroup;
  }

  public getHeroBucketGroup(): THREE.Group {
    return this.heroBucketGroup;
  }

  public getButterflyGroups(): { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; base: THREE.Vector3; phase: number }[] {
    return this.butterflies;
  }

  private buildTerrainAndRoad(): void {
    // Ground meadow plane
    const groundGeo = this.assets.registerGeometry('ground-plane', new THREE.PlaneGeometry(160, 160));
    const groundMat = this.assets.createToonMaterial('mat-grass', {
      color: '#FFFFFF',
      map: this.assets.getGrassTexture(),
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    // Gentle rolling background hill behind cottages & mountain spring
    const hillGeo = this.assets.registerGeometry('hill-mound', new THREE.IcosahedronGeometry(16, 2));
    const hillMat = this.assets.createToonMaterial('mat-hill', { color: STYLE_TOKENS.colors.grassMid });
    const hillCoords: [number, number, number, number, number, number][] = [
      [-14, -5.5, -24, 1.4, 0.52, 1.1],
      [6, -6.2, -32, 1.8, 0.58, 1.0],
      [-20, -6.0, 2, 1.1, 0.45, 1.3],
      [22, -6.0, -14, 1.3, 0.48, 1.2],
    ];
    for (const [x, y, z, sx, sy, sz] of hillCoords) {
      const m = new THREE.Mesh(hillGeo, hillMat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.receiveShadow = true;
      this.root.add(m);
    }

    // Continuous winding dirt cobblestone trail along all 3 cottages
    const roadPoints = [
      new THREE.Vector3(2.8, 0.03, 24),
      new THREE.Vector3(1.6, 0.03, 14),
      new THREE.Vector3(1.4, 0.03, 6),
      new THREE.Vector3(2.1, 0.03, -2),
      new THREE.Vector3(2.6, 0.03, -11),
      new THREE.Vector3(1.8, 0.03, -22),
      new THREE.Vector3(0.4, 0.03, -34),
    ];
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
    const roadSegments = 64;
    const roadWidth = 3.2;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= roadSegments; i++) {
      const u = i / roadSegments;
      const pt = roadCurve.getPoint(u);
      const tangent = roadCurve.getTangent(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

      const leftPt = pt.clone().addScaledVector(normal, -roadWidth * 0.5);
      const rightPt = pt.clone().addScaledVector(normal, roadWidth * 0.5);

      positions.push(leftPt.x, leftPt.y, leftPt.z, rightPt.x, rightPt.y, rightPt.z);
      uvs.push(0, u, 1, u);

      if (i < roadSegments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();
    this.assets.registerGeometry('winding-road', roadGeo);

    const roadMat = this.assets.createToonMaterial('mat-road', {
      color: '#FFFFFF',
      map: this.assets.getRoadTexture(),
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.root.add(roadMesh);
  }

  private createLowPolyTree(scale: number, shadeIndex: number): THREE.Group {
    const tree = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.5, 6);
    const trunkMat = this.assets.createToonMaterial('mat-trunk', { color: STYLE_TOKENS.colors.treeTrunk });
    const trunk = this.assets.createOutlinedMesh(trunkGeo, trunkMat, { outlineScale: 1.08 });
    trunk.position.y = 0.75;
    tree.add(trunk);

    const canopyColors = [
      STYLE_TOKENS.colors.treeCanopyLight,
      STYLE_TOKENS.colors.treeCanopyMid,
      STYLE_TOKENS.colors.treeCanopyDark,
    ];
    const canopyMat = this.assets.createToonMaterial(`mat-canopy-${shadeIndex % 3}`, {
      color: canopyColors[shadeIndex % 3],
    });

    const mainGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const mainBlob = this.assets.createOutlinedMesh(mainGeo, canopyMat, { outlineScale: 1.055 });
    mainBlob.position.set(0, 2.15, 0);
    tree.add(mainBlob);

    const sideGeo = new THREE.IcosahedronGeometry(0.75, 1);
    const leftBlob = this.assets.createOutlinedMesh(sideGeo, canopyMat, { outlineScale: 1.06 });
    leftBlob.position.set(-0.68, 1.85, 0.2);
    tree.add(leftBlob);

    const rightBlob = this.assets.createOutlinedMesh(sideGeo, canopyMat, { outlineScale: 1.06 });
    rightBlob.position.set(0.65, 1.9, -0.18);
    tree.add(rightBlob);

    tree.scale.setScalar(scale);
    return tree;
  }

  private buildForestAndHills(): void {
    const rng = createSeededRng(777);
    const placements: [number, number, number][] = [
      // Dense storybook backdrop behind cottages (visible in crane descent)
      [-10, 12, 1.35], [-12, 6, 1.5], [-10.5, 0, 1.4], [-11, -6, 1.6], [-12.5, -13, 1.5],
      [-9, -18, 1.7], [-5, -21, 1.8], [0, -23, 1.6], [5, -22, 1.7], [10, -20, 1.55],
      [-15, -21, 2.0], [-8, -26, 2.2], [-2, -28, 2.1], [4, -27, 2.3], [11, -26, 2.0],
      // Right side framing trees
      [7.5, -4, 1.35], [9.0, -11, 1.45], [7.2, -16, 1.5], [14.5, 1.5, 1.6], [13.5, 9.5, 1.4],
      // Foreground corner frame accents
      [-7.8, 11.5, 1.15], [6.2, 11.5, 1.2],
      // Backdrop behind Hero Spring Clearing (x=9.5, z=6.0)
      [7.2, 2.6, 1.45], [10.4, 2.2, 1.6], [13.0, 3.8, 1.35], [6.8, 5.2, 1.25],
    ];

    placements.forEach(([x, z, s], idx) => {
      const tree = this.createLowPolyTree(s * (0.92 + rng() * 0.16), idx);
      tree.position.set(x, 0, z);
      tree.rotation.y = rng() * Math.PI * 2;
      this.root.add(tree);
    });
  }

  private buildClouds(): void {
    const cloudMat = this.assets.createToonMaterial('mat-cloud', { color: '#F6FAFD' });
    const cloudConfigs: [number, number, number, number][] = [
      [-5, 15.8, -10, 1.6],
      [2.5, 16.5, -6, 1.85],
      [9.5, 15.2, -14, 1.5],
      [-12, 16.0, -18, 1.9],
      [0, 17.4, -22, 2.1],
      [6, 14.8, 4, 1.45],
    ];

    cloudConfigs.forEach(([x, y, z, scale], idx) => {
      const group = new THREE.Group();
      const puffs: [number, number, number, number][] = [
        [0, 0, 0, 1.5],
        [-1.35, -0.2, 0.2, 1.15],
        [1.4, -0.15, -0.15, 1.22],
        [0.55, 0.55, 0.35, 1.05],
        [-0.65, 0.45, -0.25, 0.95],
      ];
      for (const [px, py, pz, r] of puffs) {
        const geo = new THREE.IcosahedronGeometry(r, 1);
        const puff = this.assets.createOutlinedMesh(geo, cloudMat, {
          outlineScale: 1.045,
          castShadow: false,
          receiveShadow: false,
        });
        puff.position.set(px, py, pz);
        group.add(puff);
      }
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      this.root.add(group);
      this.clouds.push({ group, baseX: x, speed: 0.12 + (idx % 3) * 0.05 });
    });
  }

  private createCottage(x: number, z: number, isLeoCottage = false): THREE.Group {
    const house = new THREE.Group();
    const wallTex = this.assets.getWoodPlankTexture(STYLE_TOKENS.colors.cottageWall, '#3D2710', 'tex-wood-cottage');
    const wallMat = this.assets.createToonMaterial('mat-cottage-wall', { color: '#FFFFFF', map: wallTex });
    const roofMat = this.assets.createToonMaterial('mat-cottage-roof', {
      color: '#FFFFFF',
      map: this.assets.getRoofShingleTexture(),
    });
    const doorMat = this.assets.createToonMaterial('mat-door', { color: '#5A3416' });
    const winMat = this.assets.createToonMaterial('mat-window', {
      color: STYLE_TOKENS.colors.windowGlow,
      emissive: '#E8C54A',
      emissiveIntensity: 0.35,
    });
    const frameMat = this.assets.createToonMaterial('mat-frame', { color: STYLE_TOKENS.colors.windowFrame });

    // Main wooden body
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(3.6, 2.4, 2.8), wallMat, { outlineScale: 1.03 });
    body.position.y = 1.2;
    house.add(body);

    // Pitched 4-sided pyramid/gable roof
    const roofGeo = new THREE.ConeGeometry(3.05, 1.85, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = this.assets.createOutlinedMesh(roofGeo, roofMat, { outlineScale: 1.035 });
    roof.position.y = 3.25;
    house.add(roof);

    // Front Door
    const door = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.92, 1.55, 0.14), doorMat, { outlineScale: 1.06 });
    door.position.set(-0.65, 0.78, 1.4);
    house.add(door);

    // Brass doorknob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      this.assets.createToonMaterial('mat-knob', { color: '#F2C14E' })
    );
    knob.position.set(-0.32, 0.78, 1.5);
    house.add(knob);

    // Glowing square 4-pane window
    const win = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.05, 0.9, 0.12), winMat, { outlineScale: 1.07 });
    win.position.set(0.82, 1.35, 1.4);
    house.add(win);

    // Window cross mullions
    const mullH = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.07, 0.16), frameMat);
    mullH.position.set(0.82, 1.35, 1.41);
    house.add(mullH);
    const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.94, 0.16), frameMat);
    mullV.position.set(0.82, 1.35, 1.41);
    house.add(mullV);

    // Flowerbox with colorful blooms (signature detail from reference cottages!)
    const box = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.25, 0.28, 0.32), doorMat, { outlineScale: 1.06 });
    box.position.set(0.82, 0.78, 1.52);
    house.add(box);
    const flowerColors = ['#F25C69', '#FF8DA1', '#F25C69', '#FF8DA1'];
    flowerColors.forEach((col, i) => {
      const bloom = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        this.assets.createToonMaterial(`mat-fbox-${i % 2}`, { color: col }),
        { outlineScale: 1.12, castShadow: false }
      );
      bloom.position.set(0.45 + i * 0.25, 0.98, 1.54);
      house.add(bloom);
    });

    // Stone chimney + animated rising cartoon smoke spheres
    const chimneyMat = this.assets.createToonMaterial('mat-chimney', { color: '#8A8F96' });
    const chimney = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.55, 1.45, 0.55), chimneyMat, { outlineScale: 1.06 });
    chimney.position.set(1.05, 3.35, -0.45);
    house.add(chimney);

    const smokeMat = this.assets.createToonMaterial('mat-smoke', {
      color: '#EDF2F5',
      transparent: true,
      opacity: 0.78,
    });
    for (let s = 0; s < 4; s++) {
      const puff = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(0.26, 1), smokeMat, {
        noOutline: true,
        castShadow: false,
        receiveShadow: false,
      });
      this.root.add(puff);
      this.chimneyPuffs.push({
        mesh: puff,
        origin: new THREE.Vector3(x + 1.05, 4.15, z - 0.45),
        phaseOffset: s * 0.25 + (Math.abs(z) * 0.07) % 1,
        belongsToLeoCottage: isLeoCottage,
      });
    }

    house.position.set(x, 0, z);
    return house;
  }

  private createWaterBarrel(x: number, z: number): BarrelRig {
    const group = new THREE.Group();
    const woodMat = this.assets.createToonMaterial('mat-barrel-wood', { color: '#9C622B' });
    const bandMat = this.assets.createToonMaterial('mat-barrel-band', { color: '#394048' });

    const body = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.46, 0.42, 0.96, 10), woodMat, {
      outlineScale: 1.06,
    });
    body.position.y = 0.48;
    group.add(body);

    for (const by of [0.22, 0.74]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.08, 10), bandMat);
      band.position.y = by;
      group.add(band);
    }

    // Dynamic rising blue water top disc
    const waterMat = this.assets.createToonMaterial('mat-water-disc', {
      color: STYLE_TOKENS.colors.waterBlue,
      emissive: '#1E70B8',
      emissiveIntensity: 0.2,
    });
    const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12), waterMat);
    waterMesh.position.y = 0.14;
    group.add(waterMesh);

    group.position.set(x, 0, z);
    this.root.add(group);
    return { group, waterMesh };
  }

  private buildThreeCottagesAndBarrels(): void {
    // Cottage 1 (Sam)
    const c1 = this.createCottage(-3.6, 7.0);
    this.root.add(c1);
    this.samBarrel = this.createWaterBarrel(-3.8, 9.3);

    // Cottage 2 (Maya)
    const c2 = this.createCottage(-2.8, -1.5);
    this.root.add(c2);
    this.mayaBarrel = this.createWaterBarrel(-3.0, 0.8);

    // Cottage 3 (Leo - swaps into upgraded Crimson Watermill Estate at Scene 11!)
    this.leoCottage = this.createCottage(-2.0, -10.5, true);
    this.root.add(this.leoCottage);
  }

  private buildLeoPipeSystem(): void {
    const bambooMat = this.assets.createToonMaterial('mat-bamboo', { color: STYLE_TOKENS.colors.bambooTan });
    const postMat = this.assets.createToonMaterial('mat-trestle', { color: '#6E4520' });

    // 7 elevated bamboo aqueduct segments running from mountain hillside toward Leo's yard
    const count = 7;
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const px = lerp(1.5, -5.8, u);
      const py = lerp(0.95, 2.75, u);
      const pz = lerp(-8.4, -14.8, u);

      const segGroup = new THREE.Group();
      const pipe = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.18, 0.18, 1.65, 8), bambooMat, {
        outlineScale: 1.09,
      });
      pipe.rotation.z = Math.PI / 2 - 0.18;
      pipe.rotation.y = -0.68;
      segGroup.add(pipe);

      // Wooden support posts down to terrain
      const postL = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.06, 0.07, py, 6), postMat, {
        outlineScale: 1.12,
      });
      postL.position.set(0, -py * 0.5, 0);
      segGroup.add(postL);

      segGroup.position.set(px, py, pz);
      segGroup.visible = false;
      this.root.add(segGroup);
      this.pipeSegments.push({ group: segGroup, threshold: (i + 1) / count });
    }
  }

  private buildLeoUpgradedEstate(): void {
    const estate = new THREE.Group();
    const barnTex = this.assets.getWoodPlankTexture(STYLE_TOKENS.colors.barnRed, '#73100C', 'tex-barn-red');
    const barnMat = this.assets.createToonMaterial('mat-barn-red', { color: '#FFFFFF', map: barnTex });
    const trimMat = this.assets.createToonMaterial('mat-barn-trim', { color: STYLE_TOKENS.colors.barnTrim });
    const roofMat = this.assets.createToonMaterial('mat-barn-roof', { color: '#6E1E16' });
    const siloMat = this.assets.createToonMaterial('mat-silo', { color: STYLE_TOKENS.colors.siloGrey });
    const hayMat = this.assets.createToonMaterial('mat-hay', { color: STYLE_TOKENS.colors.hayGold });
    const woodMat = this.assets.createToonMaterial('mat-wheel-wood', { color: '#A56328' });

    // Grand Crimson Watermill Barn body
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(5.6, 4.2, 4.2), barnMat, { outlineScale: 1.028 });
    body.position.set(0, 2.1, 0);
    estate.add(body);

    // Gambrel / pitched barn roof
    const roof = this.assets.createOutlinedMesh(new THREE.ConeGeometry(4.45, 2.3, 4), roofMat, { outlineScale: 1.03 });
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 5.25, 0);
    estate.add(roof);

    // Cream X-braced Barn Doors (matching the bold barn graphic language!)
    const doorFrame = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.1, 2.3, 0.14), barnMat, { outlineScale: 1.04 });
    doorFrame.position.set(0, 1.15, 2.1);
    estate.add(doorFrame);

    const trimBars: [number, number, number, number, number][] = [
      [0, 2.3, 2.18, 2.25, 0.16],
      [-1.05, 1.15, 2.18, 0.16, 2.3],
      [1.05, 1.15, 2.18, 0.16, 2.3],
    ];
    for (const [tx, ty, tz, tw, th] of trimBars) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(tw, th, 0.12), trimMat);
      b.position.set(tx, ty, tz);
      estate.add(b);
    }
    // X-cross braces
    for (const angle of [0.76, -0.76]) {
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.9, 0.12), trimMat);
      diag.position.set(0, 1.15, 2.18);
      diag.rotation.z = angle;
      estate.add(diag);
    }

    // Upper glowing loft window
    const loftWin = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(1.15, 0.85, 0.16),
      this.assets.createToonMaterial('mat-loft-win', { color: STYLE_TOKENS.colors.windowGlow, emissive: '#E8B838', emissiveIntensity: 0.4 }),
      { outlineScale: 1.07 }
    );
    loftWin.position.set(0, 3.4, 2.12);
    estate.add(loftWin);

    // Tall Water Tower / Silo to the right
    const siloBody = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.05, 1.05, 5.2, 12), siloMat, {
      outlineScale: 1.04,
    });
    siloBody.position.set(3.55, 2.6, -0.5);
    estate.add(siloBody);
    const siloCap = this.assets.createOutlinedMesh(new THREE.SphereGeometry(1.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat, {
      outlineScale: 1.04,
    });
    siloCap.position.set(3.55, 5.2, -0.5);
    estate.add(siloCap);

    // Golden Hay Bales stacked on left
    const hayCoords: [number, number, number][] = [
      [-3.5, 0.45, 0.8],
      [-4.4, 0.45, 0.5],
      [-3.95, 1.25, 0.65],
    ];
    for (const [hx, hy, hz] of hayCoords) {
      const bale = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 10), hayMat, {
        outlineScale: 1.07,
      });
      bale.rotation.z = Math.PI / 2;
      bale.position.set(hx, hy, hz);
      estate.add(bale);
    }

    // 3D SPINNING WOODEN WATERWHEEL attached to right front wall!
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(2.95, 1.65, 1.65);

    const rim = this.assets.createOutlinedMesh(new THREE.TorusGeometry(1.25, 0.13, 8, 18), woodMat, {
      outlineScale: 1.07,
    });
    wheelGroup.add(rim);

    const hub = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 10), woodMat, {
      outlineScale: 1.08,
    });
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // 8 radial paddles
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const spoke = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), woodMat, {
        outlineScale: 1.08,
      });
      spoke.rotation.z = ang;
      wheelGroup.add(spoke);

      const paddle = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.45, 0.12, 0.52), woodMat, {
        outlineScale: 1.09,
      });
      paddle.position.set(Math.cos(ang) * 1.25, Math.sin(ang) * 1.25, 0);
      paddle.rotation.z = ang;
      wheelGroup.add(paddle);
    }

    estate.add(wheelGroup);
    this.waterwheelGroup = wheelGroup;

    // Animated rushing blue water stream cascading onto the waterwheel
    const waterMat = this.assets.createToonMaterial('mat-stream', {
      color: STYLE_TOKENS.colors.waterBlue,
      emissive: '#35A3E8',
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.9,
    });
    this.waterStreamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.1, 8), waterMat);
    this.waterStreamMesh.position.set(3.45, 2.25, 1.65);
    this.waterStreamMesh.rotation.z = 0.25;
    estate.add(this.waterStreamMesh);

    // Sparkling pool underneath wheel
    const pool = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.45, 1.55, 0.14, 14), waterMat, {
      outlineScale: 1.03,
      castShadow: false,
    });
    pool.position.set(3.05, 0.08, 1.85);
    estate.add(pool);

    estate.position.set(-2.3, 0, -11.4);
    estate.visible = false;
    this.root.add(estate);
    this.leoEstate = estate;
  }

  private buildHelpSign(): void {
    const signGroup = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-sign-post', { color: '#5E3A19' });
    const post = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), postMat, { outlineScale: 1.08 });
    post.position.set(0, 0.75, -0.14);
    signGroup.add(post);

    const boardGeo = new THREE.BoxGeometry(1.75, 1.1, 0.12);
    const boardFaceMat = new THREE.MeshBasicMaterial({ map: this.assets.getHelpWantedSignTexture() });
    const sideMat = postMat;
    const board = new THREE.Mesh(boardGeo, [sideMat, sideMat, sideMat, sideMat, boardFaceMat, sideMat]);
    board.position.y = 1.65;
    board.castShadow = true;
    signGroup.add(board);

    // Outline box behind board
    const boardOutline = new THREE.Mesh(boardGeo, this.assets.getOutlineMaterial());
    boardOutline.position.copy(board.position);
    boardOutline.scale.set(1.05, 1.07, 1.25);
    signGroup.add(boardOutline);

    signGroup.position.set(-1.55, 0, -7.9);
    signGroup.rotation.y = 0.08;
    signGroup.visible = false;
    this.root.add(signGroup);
    this.helpSign = signGroup;
  }

  private buildHeroSpringClearing(): void {
    // Clearing at (9.5, 0, 6.0) with blue mountain spring pond, reeds, fence, and Hero 3D Wooden Bucket!
    const pondMat = this.assets.createToonMaterial('mat-pond', {
      color: STYLE_TOKENS.colors.waterBlue,
      emissive: '#1D74C4',
      emissiveIntensity: 0.25,
    });
    const pond = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.6, 2.7, 0.12, 16), pondMat, {
      outlineScale: 1.02,
      castShadow: false,
    });
    pond.position.set(9.5, 0.04, 4.1);
    this.root.add(pond);

    // Reeds / cattails along spring edge
    const reedMat = this.assets.createToonMaterial('mat-reed', { color: '#2F6E17' });
    const tipMat = this.assets.createToonMaterial('mat-cattail', { color: '#6E3B16' });
    const reedX = [7.6, 8.1, 10.8, 11.3, 11.7];
    reedX.forEach((rx, idx) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.95, 5), reedMat);
      stalk.position.set(rx, 0.48, 4.9 + (idx % 2) * 0.25);
      this.root.add(stalk);
      const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 4, 6), tipMat);
      top.position.set(rx, 0.92, 4.9 + (idx % 2) * 0.25);
      this.root.add(top);
    });

    // HERO 3D CHUNKY WOODEN BUCKET (featured in Scene 2 & Scene 16!)
    const bucket = new THREE.Group();
    const woodTex = this.assets.getWoodPlankTexture('#C68136', '#5A3210', 'tex-hero-bucket');
    const woodMat = this.assets.createToonMaterial('mat-hero-bucket', { color: '#FFFFFF', map: woodTex });
    const bandMat = this.assets.createToonMaterial('mat-iron-band', { color: '#39434D' });

    const body = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.76, 0.58, 1.15, 14), woodMat, {
      outlineScale: 1.055,
    });
    body.position.y = 0.58;
    bucket.add(body);

    for (const [ry, rad] of [[0.32, 0.65], [0.85, 0.74]] as [number, number][]) {
      const band = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(rad, rad * 0.98, 0.1, 14), bandMat, {
        outlineScale: 1.04,
      });
      band.position.y = ry;
      bucket.add(band);
    }

    // Sparkling blue water surface clearly visible inside bucket rim + rim ring
    const rimRing = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.72, 0.06, 8, 20), woodMat, {
      outlineScale: 1.08,
    });
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 1.15;
    bucket.add(rimRing);

    const waterTop = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.05, 16), pondMat);
    waterTop.position.y = 1.16;
    bucket.add(waterTop);

    // Foam highlight ring inside water
    const foamMat = this.assets.createToonMaterial('mat-foam', { color: STYLE_TOKENS.colors.waterFoam });
    const foam = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 14), foamMat);
    foam.rotation.x = Math.PI / 2;
    foam.position.y = 1.19;
    bucket.add(foam);

    // Curved arched metal/wood handle
    const handle = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.74, 0.055, 8, 20, Math.PI), bandMat, {
      outlineScale: 1.18,
    });
    handle.position.y = 1.15;
    bucket.add(handle);

    // Cute cartoon eyes on the hero bucket? Keep it classic wooden bucket matching the reference's crisp cartoon prop style!
    bucket.position.set(9.5, 0, 6.0);
    bucket.visible = false;
    this.root.add(bucket);
    this.heroBucketGroup = bucket;
  }

  private buildBambooGardenSystem(): void {
    const rng = createSeededRng(9090);
    const soilMat = this.assets.createToonMaterial('mat-soil', { color: '#5A3B20' });
    const borderWoodMat = this.assets.createToonMaterial('mat-plot-wood', { color: '#8F5B29' });

    // 1. Raised wooden garden plots in front of all 3 cottages (shown when gardenMode = true)
    const plotsGroup = new THREE.Group();
    const plotCoords: [number, number][] = [
      [-3.7, 9.3],   // Sam's garden plot
      [-2.9, 0.8],   // Maya's garden plot
      [0.9, -8.3],   // Leo's garden plot (prominently visible right beside Leo!)
    ];
    for (const [px, pz] of plotCoords) {
      const plot = new THREE.Group();
      const frame = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.1, 0.28, 1.45), borderWoodMat, {
        outlineScale: 1.05,
      });
      frame.position.y = 0.14;
      plot.add(frame);

      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.08, 1.24), soilMat);
      soil.position.y = 0.27;
      soil.receiveShadow = true;
      plot.add(soil);

      // Tiny mound in center
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), soilMat);
      mound.scale.set(1.2, 0.45, 1.2);
      mound.position.y = 0.3;
      plot.add(mound);

      plot.position.set(px, 0, pz);
      plotsGroup.add(plot);
    }
    plotsGroup.visible = false;
    this.root.add(plotsGroup);
    this.gardenPlotsGroup = plotsGroup;

    // 2. Maya's fast-blooming colorful daisy patch
    const mayaFlowers = new THREE.Group();
    const stemMat = this.assets.createToonMaterial('mat-daisy-stem', { color: '#398A1E' });
    const petalColors = ['#FFFFFF', '#FF99B8', '#FFE066', '#FFA94D'];
    for (let i = 0; i < 12; i++) {
      const fx = -3.6 + (i % 4) * 0.46 + (rng() - 0.5) * 0.1;
      const fz = 0.35 + Math.floor(i / 4) * 0.42 + (rng() - 0.5) * 0.1;
      const h = 0.36 + rng() * 0.22;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, h, 5), stemMat);
      stem.position.set(fx, 0.28 + h * 0.5, fz);
      mayaFlowers.add(stem);

      const bloom = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        this.assets.createToonMaterial(`mat-mdaisy-${i % 4}`, { color: petalColors[i % 4] }),
        { outlineScale: 1.14, castShadow: false }
      );
      bloom.scale.set(1.15, 0.65, 1.15);
      bloom.position.set(fx, 0.28 + h, fz);
      mayaFlowers.add(bloom);
    }
    mayaFlowers.visible = false;
    this.root.add(mayaFlowers);
    this.mayaFlowersGroup = mayaFlowers;

    // 3. Leo's glowing 3D Golden Root Network spreading out of his plot
    const rootsGroup = new THREE.Group();
    const rootMat = this.assets.createToonMaterial('mat-golden-root', {
      color: '#F2B632',
      emissive: '#E09114',
      emissiveIntensity: 0.45,
    });
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + rng() * 0.2;
      const len = 1.4 + rng() * 2.2;
      const rootTendril = this.assets.createOutlinedMesh(
        new THREE.CylinderGeometry(0.04, 0.11, len, 6),
        rootMat,
        { outlineScale: 1.12, castShadow: false }
      );
      rootTendril.rotation.z = Math.PI / 2 - 0.06;
      rootTendril.rotation.y = -ang;
      rootTendril.position.set(
        0.9 + Math.cos(ang) * (len * 0.5),
        0.16,
        -8.3 + Math.sin(ang) * (len * 0.5)
      );
      rootsGroup.add(rootTendril);
    }
    rootsGroup.visible = false;
    this.root.add(rootsGroup);
    this.leoRootsGroup = rootsGroup;

    // 4. Leo's Explosive Towering 3D Emerald Bamboo Forest (28 segmented outlined stalks!)
    const bambooGreenMat = this.assets.createToonMaterial('mat-bamboo-emerald', { color: '#4DA632' });
    const bambooLightMat = this.assets.createToonMaterial('mat-bamboo-light', { color: '#6CC748' });
    const nodeMat = this.assets.createToonMaterial('mat-bamboo-node', { color: '#2F6E1C' });
    const leafMat = this.assets.createToonMaterial('mat-bamboo-leaf', { color: '#2D8A24' });

    const stalkPositions: [number, number, number][] = [];
    // Dense towering grove around Leo's plot and cottage
    for (let i = 0; i < 28; i++) {
      const ring = i < 8 ? 0.65 : i < 18 ? 1.85 : 3.2;
      const ang = (i / (i < 8 ? 8 : i < 18 ? 10 : 10)) * Math.PI * 2 + rng() * 0.45;
      const sx = -0.8 + Math.cos(ang) * ring * 1.45;
      const sz = -10.8 + Math.sin(ang) * ring * 1.15;
      // Keep the direct standing spots for characters clear
      if (sz > -8.6 && sx > -1.8 && sx < 0.8) continue;
      const targetHeight = 6.2 + rng() * 6.8;
      stalkPositions.push([sx, sz, targetHeight]);
    }

    stalkPositions.forEach(([sx, sz, targetHeight], idx) => {
      const stalk = new THREE.Group();
      const mat = idx % 2 === 0 ? bambooGreenMat : bambooLightMat;
      const radius = 0.14 + (idx % 3) * 0.03;

      // Unit-height stalk (scaled smoothly in Y from 0.01 -> targetHeight!)
      const shaft = this.assets.createOutlinedMesh(
        new THREE.CylinderGeometry(radius * 0.86, radius, 1.0, 7),
        mat,
        { outlineScale: 1.09 }
      );
      shaft.position.y = 0.5;
      stalk.add(shaft);

      // Bamboo ring nodes along shaft
      for (const ny of [0.22, 0.45, 0.68, 0.88]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.04, 0.028, 5, 10), nodeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ny;
        stalk.add(ring);
      }

      // Leafy emerald canopy crown at top of each stalk (scaled cleanly for tall bamboo height)
      const crown = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(0.68, 1), leafMat, {
        outlineScale: 1.06,
        castShadow: false,
      });
      crown.scale.set(1.45, 0.055, 1.45);
      crown.position.y = 0.98;
      stalk.add(crown);

      stalk.position.set(sx, 0, sz);
      stalk.rotation.z = (rng() - 0.5) * 0.08;
      stalk.visible = false;
      this.root.add(stalk);
      this.leoBambooStalks.push({ group: stalk, targetHeight, delay: (idx % 8) * 0.04 });
    });

    // 5. Storybook Bamboo Pagoda Pavilion (crimson roof + golden finial + warm lantern)
    const pavilion = new THREE.Group();
    const pillarMat = this.assets.createToonMaterial('mat-pav-pillar', { color: '#C4281C' });
    const deckMat = this.assets.createToonMaterial('mat-pav-deck', { color: '#B57B3A' });
    const pavRoofMat = this.assets.createToonMaterial('mat-pav-roof', { color: '#1F6E42' });
    const goldMat = this.assets.createToonMaterial('mat-pav-gold', { color: '#F5C542', emissive: '#D49A1A', emissiveIntensity: 0.35 });

    const deck = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.4, 2.6, 0.35, 8), deckMat, {
      outlineScale: 1.03,
    });
    deck.position.y = 0.18;
    pavilion.add(deck);

    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const col = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.11, 0.12, 2.7, 7), pillarMat, {
        outlineScale: 1.09,
      });
      col.position.set(Math.cos(a) * 1.85, 1.65, Math.sin(a) * 1.85);
      pavilion.add(col);
    }

    // Tiered emerald pagoda roof
    const lowerRoof = this.assets.createOutlinedMesh(new THREE.ConeGeometry(3.25, 1.35, 8), pavRoofMat, {
      outlineScale: 1.035,
    });
    lowerRoof.position.y = 3.55;
    pavilion.add(lowerRoof);

    const upperRoof = this.assets.createOutlinedMesh(new THREE.ConeGeometry(2.1, 1.25, 8), pavRoofMat, {
      outlineScale: 1.04,
    });
    upperRoof.position.y = 4.65;
    pavilion.add(upperRoof);

    const finial = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.28, 10, 10), goldMat, {
      outlineScale: 1.1,
    });
    finial.position.y = 5.45;
    pavilion.add(finial);

    pavilion.position.set(-2.2, 0, -11.4);
    pavilion.visible = false;
    this.root.add(pavilion);
    this.leoPavilionGroup = pavilion;

    // 6. Hero Terracotta Sprout Pot in Spring Clearing (Scene 2 & Scene 16 CTA!)
    const potGroup = new THREE.Group();
    const clayMat = this.assets.createToonMaterial('mat-terracotta', { color: '#C96134' });
    const clayDarkMat = this.assets.createToonMaterial('mat-terracotta-rim', { color: '#D97343' });

    const potBody = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.76, 0.54, 1.05, 14), clayMat, {
      outlineScale: 1.055,
    });
    potBody.position.y = 0.52;
    potGroup.add(potBody);

    const potRim = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.84, 0.8, 0.24, 14), clayDarkMat, {
      outlineScale: 1.05,
    });
    potRim.position.y = 1.02;
    potGroup.add(potRim);

    const potSoil = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 14), soilMat);
    potSoil.position.y = 1.12;
    potGroup.add(potSoil);

    // Cute bold outlined bright green bamboo sprout emerging from the pot!
    const sproutStem = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.13, 0.95, 8), bambooLightMat, {
      outlineScale: 1.12,
    });
    sproutStem.position.y = 1.56;
    potGroup.add(sproutStem);

    for (const side of [-1, 1]) {
      const leaf = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.26, 8, 8), leafMat, {
        outlineScale: 1.1,
      });
      leaf.scale.set(1.55, 0.35, 0.72);
      leaf.position.set(side * 0.34, 1.88, 0);
      leaf.rotation.z = side * 0.42;
      potGroup.add(leaf);
    }

    potGroup.position.set(9.5, 0, 6.0);
    potGroup.visible = false;
    this.root.add(potGroup);
    this.heroSproutPotGroup = potGroup;
  }

  private buildWildflowersRocksAndFences(): void {
    const rng = createSeededRng(31415);
    const rockMat = this.assets.createToonMaterial('mat-rock', { color: '#9BA0A6' });
    const stemMat = this.assets.createToonMaterial('mat-stem', { color: '#2F6A15' });
    const fenceMat = this.assets.createToonMaterial('mat-fence', { color: '#9E6832' });

    // Smooth grey boulders near cottages
    const rockCoords: [number, number, number][] = [
      [-4.8, 8.6, 0.55], [-4.3, 8.1, 0.35], [-0.4, 8.8, 0.28],
      [-4.1, 0.2, 0.45], [-3.8, -8.8, 0.5], [7.8, 6.4, 0.42],
    ];
    for (const [rx, rz, rs] of rockCoords) {
      const rock = this.assets.createOutlinedMesh(new THREE.DodecahedronGeometry(rs, 1), rockMat, {
        outlineScale: 1.07,
      });
      rock.scale.set(1.2, 0.72, 1.0);
      rock.position.set(rx, rs * 0.35, rz);
      this.root.add(rock);
    }

    // Stylized lollypop wildflowers (signature foreground detail from reference!)
    const flowerPalette = ['#F25C69', '#F5B82E', '#FFFFFF', '#E873B8', '#FF7833'];
    for (let i = 0; i < 48; i++) {
      const fx = -5.5 + rng() * 14;
      const fz = -15 + rng() * 28;
      // Avoid placing inside the cobblestone road strip
      if (fx > 0.2 && fx < 3.6) continue;
      const col = flowerPalette[i % flowerPalette.length];
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 4), stemMat);
      stem.position.set(fx, 0.21, fz);
      this.root.add(stem);

      const head = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(0.11, 8, 8),
        this.assets.createToonMaterial(`mat-wf-${i % 5}`, { color: col }),
        { outlineScale: 1.15, castShadow: false }
      );
      head.position.set(fx, 0.46, fz);
      this.root.add(head);
    }

    // Split-rail wooden fences separating yards
    const fenceSections: [number, number, number][] = [
      [-5.6, 4.2, 0], [-5.6, -4.5, 0], [5.0, -7.2, 0.4], [8.5, 3.0, 0], [10.6, 3.0, 0],
    ];
    for (const [fx, fz, ry] of fenceSections) {
      const fg = new THREE.Group();
      for (const px of [-0.9, 0.9]) {
        const post = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), fenceMat, {
          outlineScale: 1.08,
        });
        post.position.set(px, 0.48, 0);
        fg.add(post);
      }
      for (const ryRail of [0.35, 0.72]) {
        const rail = this.assets.createOutlinedMesh(new THREE.BoxGeometry(2.0, 0.11, 0.09), fenceMat, {
          outlineScale: 1.08,
        });
        rail.position.set(0, ryRail, 0);
        fg.add(rail);
      }
      fg.position.set(fx, 0, fz);
      fg.rotation.y = ry;
      this.root.add(fg);
    }
  }

  private buildButterflies(): void {
    const colors = ['#F4C430', '#A46BE8', '#FF8DA1'];
    const bases: [number, number, number][] = [
      [-1.5, 2.2, 6.2],
      [0.6, 2.4, -2.8],
      [9.4, 2.6, 4.8],
    ];
    const wingGeo = new THREE.CircleGeometry(0.14, 6);
    bases.forEach(([bx, by, bz], i) => {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i], side: THREE.DoubleSide });
      const group = new THREE.Group();
      const wingL = new THREE.Mesh(wingGeo, mat);
      wingL.position.x = -0.09;
      const wingR = new THREE.Mesh(wingGeo, mat);
      wingR.position.x = 0.09;
      group.add(wingL, wingR);
      group.position.set(bx, by, bz);
      this.root.add(group);
      this.butterflies.push({ group, wingL, wingR, base: new THREE.Vector3(bx, by, bz), phase: i * 2.1 });
    });
  }

  public update(env: EnvironmentState, sceneProgress: number, sceneElapsedSeconds: number, globalSeconds: number): void {
    const isVillage = (env.worldTheme ?? 'village') === 'village';
    this.root.visible = isVillage;
    if (!isVillage) return;

    // 1. Drift clouds smoothly
    for (const c of this.clouds) {
      c.group.position.x = c.baseX + Math.sin(globalSeconds * 0.12 + c.baseX) * 1.4;
    }

    // 2. Chimney smoke puffs rising continuously (hide Leo cottage smoke once upgraded to watermill or pavilion)
    for (const puff of this.chimneyPuffs) {
      if (puff.belongsToLeoCottage && (env.leoEstateUpgraded || env.leoPavilionVisible)) {
        puff.mesh.visible = false;
        continue;
      }
      puff.mesh.visible = true;
      const t = (globalSeconds * 0.34 + puff.phaseOffset) % 1;
      puff.mesh.position.set(
        puff.origin.x + Math.sin(t * Math.PI * 2) * 0.16,
        puff.origin.y + t * 2.4,
        puff.origin.z
      );
      const s = lerp(0.55, 1.35, t) * (1 - Math.max(0, (t - 0.72) / 0.28));
      puff.mesh.scale.setScalar(Math.max(0.01, s));
    }

    // 3. Barrel fill animations
    const samFill = env.samBarrelEndFill !== undefined
      ? lerp(env.samBarrelFill, env.samBarrelEndFill, sceneProgress)
      : env.samBarrelFill;
    this.samBarrel.waterMesh.visible = samFill > 0.02;
    this.samBarrel.waterMesh.position.y = lerp(0.12, 0.92, clamp(samFill, 0, 1));

    const mayaFill = env.mayaBarrelEndFill !== undefined
      ? lerp(env.mayaBarrelFill, env.mayaBarrelEndFill, sceneProgress)
      : env.mayaBarrelFill;
    this.mayaBarrel.waterMesh.visible = mayaFill > 0.02;
    this.mayaBarrel.waterMesh.position.y = lerp(0.12, 0.92, clamp(mayaFill, 0, 1));

    // 4. Leo's bamboo pipe assembly progression with spring pop-ins
    const pipeProgress = env.leoPipeEndProgress !== undefined
      ? lerp(env.leoPipeProgress, env.leoPipeEndProgress, sceneProgress)
      : env.leoPipeProgress;

    for (const seg of this.pipeSegments) {
      const active = pipeProgress >= seg.threshold - 0.05;
      seg.group.visible = active;
      if (active) {
        const localProgress = clamp((pipeProgress - (seg.threshold - 0.12)) / 0.12, 0, 1);
        const pop = springPop(localProgress * 0.45, 240, 16);
        seg.group.scale.setScalar(clamp(pop, 0.01, 1.15));
      }
    }

    // 5. Cottage 3 <-> Upgraded Crimson Watermill Estate OR Bamboo Pavilion swap
    this.leoCottage.visible = !env.leoEstateUpgraded && !env.leoPavilionVisible;
    this.leoEstate.visible = env.leoEstateUpgraded;
    this.waterStreamMesh.visible = env.leoEstateUpgraded && env.waterFlowing;
    if (this.waterStreamMesh.visible) {
      const pulse = 1 + Math.sin(globalSeconds * 16) * 0.08;
      this.waterStreamMesh.scale.set(pulse, 1, pulse);
    }

    // 6. HELP WANTED wooden sign pop-in
    this.helpSign.visible = env.showHelpSign;
    if (env.showHelpSign) {
      const s = springPop(Math.min(1, sceneElapsedSeconds + 0.05), 220, 15);
      this.helpSign.scale.setScalar(clamp(s, 0.01, 1.15));
    }

    // 7. Hero 3D Wooden Bucket pop-in
    this.heroBucketGroup.visible = env.showHeroBucket;
    if (env.showHeroBucket) {
      const pop = springPop(Math.max(0, sceneElapsedSeconds - 0.08), 210, 14);
      const bob = Math.sin(globalSeconds * 3.8) * 0.04;
      this.heroBucketGroup.scale.setScalar(clamp(pop, 0.001, 1.15));
      this.heroBucketGroup.position.y = Math.max(0, bob);
    }

    // 8. Bamboo Roots story mode elements (raised plots, flowers, golden roots, growing bamboo forest, pavilion, hero sprout pot)
    const isGarden = env.gardenMode ?? false;
    this.samBarrel.group.visible = !isGarden;
    this.mayaBarrel.group.visible = !isGarden;
    this.gardenPlotsGroup.visible = isGarden;
    this.mayaFlowersGroup.visible = env.mayaFlowersActive ?? false;
    if (this.mayaFlowersGroup.visible) {
      const bloomPop = springPop(Math.min(1, sceneElapsedSeconds + 0.12), 200, 14);
      this.mayaFlowersGroup.scale.set(1, clamp(bloomPop, 0.01, 1.1), 1);
    }

    this.leoRootsGroup.visible = env.leoRootsVisible ?? false;
    if (this.leoRootsGroup.visible) {
      const rootPulse = 1 + Math.sin(globalSeconds * 5.2) * 0.06;
      this.leoRootsGroup.scale.set(rootPulse, 1, rootPulse);
    }

    const rawBamboo =
      env.leoBambooEndGrowth !== undefined
        ? lerp(env.leoBambooGrowth ?? 0, env.leoBambooEndGrowth, sceneProgress)
        : env.leoBambooGrowth ?? 0;

    for (const stalk of this.leoBambooStalks) {
      const localG = clamp((rawBamboo - stalk.delay) / Math.max(0.1, 1 - stalk.delay), 0, 1);
      stalk.group.visible = localG > 0.01;
      if (stalk.group.visible) {
        const eased = 1 - Math.pow(1 - localG, 3);
        const curH = Math.max(0.05, stalk.targetHeight * eased);
        stalk.group.scale.set(1, curH, 1);
      }
    }

    this.leoPavilionGroup.visible = env.leoPavilionVisible ?? false;
    if (this.leoPavilionGroup.visible) {
      const pavPop = springPop(Math.min(1, sceneElapsedSeconds + 0.25), 180, 15);
      this.leoPavilionGroup.scale.setScalar(clamp(pavPop, 0.01, 1.05));
    }

    this.heroSproutPotGroup.visible = env.showHeroSproutPot ?? false;
    if (this.heroSproutPotGroup.visible) {
      const potPop = springPop(Math.max(0, sceneElapsedSeconds - 0.08), 220, 14);
      const bob = Math.sin(globalSeconds * 3.6) * 0.04;
      this.heroSproutPotGroup.scale.setScalar(clamp(potPop, 0.001, 1.14));
      this.heroSproutPotGroup.position.y = Math.max(0, bob);
      this.heroSproutPotGroup.rotation.y = Math.sin(globalSeconds * 2.0) * 0.16;
    }
  }
}
