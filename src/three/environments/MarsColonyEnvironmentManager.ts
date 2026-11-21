import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { createSeededRng } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

interface FlyingPotato {
  mesh: THREE.Object3D;
  baseX: number;
  baseZ: number;
  speed: number;
  phase: number;
  rotSpeed: number;
}

interface GeyserDrop {
  mesh: THREE.Object3D;
  angle: number;
  radius: number;
  phase: number;
  heightScale: number;
}

/**
 * Bold-outlined cel-shaded 3D Mars Colony world built to pair seamlessly with
 * our expressive 2D-in-3D stickman cast (CharacterManager).
 */
export class MarsColonyEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private rocketGroup!: THREE.Group;
  private rocketFlameGroup!: THREE.Group;
  private roverGroup!: THREE.Group;
  private roverDish!: THREE.Object3D;
  private solarRotorPivots: THREE.Object3D[] = [];
  private alarmBeacons: THREE.Mesh[] = [];
  private potatoesGroup!: THREE.Group;
  private potatoes: FlyingPotato[] = [];
  private resumeBoardGroup!: THREE.Group;
  private geyserGroup!: THREE.Group;
  private geyserColumn!: THREE.Mesh;
  private geyserDrops: GeyserDrop[] = [];
  private earthMesh!: THREE.Object3D;

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'MarsColonyRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildTerrainAndHorizon();
    this.buildHabitatDomes();
    this.buildSpaceRocket();
    this.buildSolarArray();
    this.buildMarsRover();
    this.buildFlyingPotatoes();
    this.buildResumeBoard();
    this.buildWaterGeyser();
  }

  private buildTerrainAndHorizon(): void {
    const rng = createSeededRng(4207);

    // Warm rusty-terracotta Martian plains
    const groundMat = this.assets.createToonMaterial('mat-mars-ground', { color: '#C95D36' });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    // Lighter dusty landing courtyard patch where stickmen stand
    const padMat = this.assets.createToonMaterial('mat-mars-pad', { color: '#D97B4F' });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(5.6, 28), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.02, 0.8);
    pad.receiveShadow = true;
    this.root.add(pad);

    // Crater rings scattered safely outside the center acting stage
    const craterMat = this.assets.createToonMaterial('mat-mars-crater', { color: '#9E3E22' });
    const craterCoords: [number, number, number][] = [
      [-8.5, -5.2, 2.3],
      [8.2, -7.8, 2.8],
      [-7.2, 4.6, 1.8],
      [7.6, 4.2, 1.9],
      [0.4, -10.5, 3.2],
      [-12.5, -13.0, 3.6],
    ];
    for (const [cx, cz, cr] of craterCoords) {
      const ring = this.assets.createOutlinedMesh(new THREE.TorusGeometry(cr, 0.24, 6, 18), craterMat, {
        outlineScale: 1.04,
        castShadow: false,
      });
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, 0.08, cz);
      this.root.add(ring);
    }

    // Chunky bold-outlined Martian boulders
    const rockMat = this.assets.createToonMaterial('mat-mars-rock', { color: '#8E3820' });
    const rockPositions: [number, number, number][] = [
      [-6.6, 2.8, 0.65],
      [6.4, 2.6, 0.58],
      [-8.2, -2.5, 0.9],
      [8.5, -1.2, 0.85],
      [-3.5, -8.8, 0.95],
      [3.8, -9.2, 0.88],
      [-10.2, -8.5, 1.25],
      [10.8, -9.0, 1.15],
    ];
    for (const [rx, rz, rs] of rockPositions) {
      const rock = this.assets.createOutlinedMesh(new THREE.DodecahedronGeometry(rs, 0), rockMat, {
        outlineScale: 1.06,
      });
      rock.position.set(rx, rs * 0.45, rz);
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      rock.scale.set(1.2, 0.72, 1.0);
      this.root.add(rock);
    }

    // Distant rust mesas & canyon mountains framing the horizon
    const mesaMat = this.assets.createToonMaterial('mat-mars-mesa', { color: '#A54126' });
    const mesaLightMat = this.assets.createToonMaterial('mat-mars-mesa-top', { color: '#BA5232' });
    const mesas: [number, number, number, number][] = [
      [-18, -22, 5.5, 7.2],
      [-9, -26, 7.2, 9.5],
      [1.5, -28, 6.8, 8.2],
      [12, -25, 6.4, 9.8],
      [21, -21, 5.2, 6.8],
    ];
    for (let i = 0; i < mesas.length; i++) {
      const [mx, mz, mr, mh] = mesas[i];
      const mesa = this.assets.createOutlinedMesh(
        new THREE.CylinderGeometry(mr * 0.56, mr, mh, 7),
        i % 2 === 0 ? mesaMat : mesaLightMat,
        { outlineScale: 1.025, castShadow: false }
      );
      mesa.position.set(mx, mh * 0.5 - 0.2, mz);
      this.root.add(mesa);
    }

    // Tiny pale blue-and-green Earth floating high in the peach Mars sky!
    const earthGroup = new THREE.Group();
    const oceanMat = new THREE.MeshBasicMaterial({ color: '#42A5F5' });
    const earthSphere = this.assets.createOutlinedMesh(new THREE.SphereGeometry(1.45, 16, 12), oceanMat, {
      outlineScale: 1.06,
      castShadow: false,
      receiveShadow: false,
    });
    earthGroup.add(earthSphere);
    const landMat = new THREE.MeshBasicMaterial({ color: '#66BB6A' });
    const continent1 = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), landMat);
    continent1.position.set(-0.45, 0.35, 1.02);
    continent1.scale.set(1.1, 0.8, 0.5);
    earthGroup.add(continent1);
    const continent2 = new THREE.Mesh(new THREE.SphereGeometry(0.54, 10, 8), landMat);
    continent2.position.set(0.52, -0.25, 1.08);
    continent2.scale.set(0.9, 1.0, 0.45);
    earthGroup.add(continent2);
    earthGroup.position.set(6.8, 12.2, -24.5);
    this.earthMesh = earthGroup;
    this.root.add(earthGroup);
  }

  private buildHabitatDomes(): void {
    const whiteMat = this.assets.createToonMaterial('mat-mars-dome-white', { color: '#F2F4F8' });
    const trimMat = this.assets.createToonMaterial('mat-mars-dome-trim', { color: '#39475A' });
    const glassMat = this.assets.createToonMaterial('mat-mars-glass', { color: '#7CE0F4' });
    const warmWinMat = new THREE.MeshBasicMaterial({ color: '#FFE57F' });
    const alarmMat = new THREE.MeshBasicMaterial({ color: '#FF3D2E' });

    const buildDome = (x: number, z: number, radius: number, rotY: number) => {
      const domeGroup = new THREE.Group();

      // Base foundation ring
      const base = this.assets.createOutlinedMesh(
        new THREE.CylinderGeometry(radius * 1.04, radius * 1.08, 0.5, 14),
        trimMat,
        { outlineScale: 1.03 }
      );
      base.position.y = 0.25;
      domeGroup.add(base);

      // Geodesic white dome shell
      const shell = this.assets.createOutlinedMesh(
        new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        whiteMat,
        { outlineScale: 1.03 }
      );
      shell.position.y = 0.45;
      domeGroup.add(shell);

      // Front airlock tunnel
      const lock = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.25, 1.55, 1.4), whiteMat, {
        outlineScale: 1.04,
      });
      lock.position.set(0, 0.85, radius * 0.86);
      domeGroup.add(lock);

      const door = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.75, 1.15, 0.14), trimMat, {
        outlineScale: 1.05,
      });
      door.position.set(0, 0.72, radius * 0.86 + 0.7);
      domeGroup.add(door);

      const porthole = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), glassMat);
      porthole.position.set(0, 1.0, radius * 0.86 + 0.78);
      domeGroup.add(porthole);

      // Warm glowing dome windows
      for (const a of [-0.65, 0.65]) {
        const win = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.72, 0.56, 0.18), warmWinMat, {
          outlineScale: 1.06,
          castShadow: false,
        });
        win.position.set(Math.sin(a) * radius * 0.9, 1.2, Math.cos(a) * radius * 0.9);
        win.rotation.y = a;
        domeGroup.add(win);
      }

      // Top red alarm beacon
      const stalk = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 6), trimMat, {
        outlineScale: 1.08,
      });
      stalk.position.y = radius + 0.6;
      domeGroup.add(stalk);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), alarmMat.clone());
      beacon.position.y = radius + 0.92;
      domeGroup.add(beacon);
      this.alarmBeacons.push(beacon);

      domeGroup.position.set(x, 0, z);
      domeGroup.rotation.y = rotY;
      this.root.add(domeGroup);
    };

    buildDome(-5.5, -0.8, 2.15, 0.55);
    buildDome(5.4, -3.4, 2.45, -0.45);
  }

  private buildSpaceRocket(): void {
    const padGroup = new THREE.Group();
    const steelMat = this.assets.createToonMaterial('mat-mars-steel', { color: '#4B5668' });
    const whiteMat = this.assets.createToonMaterial('mat-mars-rocket-white', { color: '#F8F9FA' });
    const redMat = this.assets.createToonMaterial('mat-mars-rocket-red', { color: '#E03B2E' });
    const cyanMat = this.assets.createToonMaterial('mat-mars-rocket-cyan', { color: '#5FD6F4' });

    // Concrete/steel launchpad base
    const pad = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.3, 2.6, 0.4, 12), steelMat, {
      outlineScale: 1.03,
    });
    pad.position.y = 0.2;
    padGroup.add(pad);

    // Red launch gantry tower beside rocket
    const gantry = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), redMat, {
      outlineScale: 1.04,
    });
    gantry.position.set(-1.7, 3.1, -0.2);
    padGroup.add(gantry);

    const arm = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.4, 0.24, 0.3), steelMat, {
      outlineScale: 1.05,
    });
    arm.position.set(-0.9, 4.4, -0.2);
    padGroup.add(arm);

    // Rocket assembly (moves upward when launching!)
    const rocket = new THREE.Group();
    const body = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.75, 0.92, 4.2, 12), whiteMat, {
      outlineScale: 1.04,
    });
    body.position.y = 2.8;
    rocket.add(body);

    const redStripe = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.84, 0.87, 0.65, 12), redMat, {
      outlineScale: 1.045,
    });
    redStripe.position.y = 2.1;
    rocket.add(redStripe);

    const nose = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.77, 1.85, 12), redMat, {
      outlineScale: 1.04,
    });
    nose.position.y = 5.82;
    rocket.add(nose);

    // Cyan round porthole window
    const ring = this.assets.createOutlinedMesh(new THREE.TorusGeometry(0.32, 0.07, 8, 14), steelMat, {
      outlineScale: 1.08,
    });
    ring.position.set(0, 3.7, 0.8);
    rocket.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), cyanMat);
    glass.position.set(0, 3.7, 0.83);
    rocket.add(glass);

    // 4 Red retro rocket fins
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const fin = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.18, 1.55, 0.9), redMat, {
        outlineScale: 1.06,
      });
      fin.position.set(Math.sin(a) * 1.05, 1.35, Math.cos(a) * 1.05);
      fin.rotation.y = a;
      rocket.add(fin);
    }

    // Engine nozzle
    const nozzle = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.38, 0.56, 0.55, 10), steelMat, {
      outlineScale: 1.06,
    });
    nozzle.position.y = 0.55;
    rocket.add(nozzle);

    // Animated launch flame & cartoon smoke cone
    const flameGroup = new THREE.Group();
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 2.6, 10),
      new THREE.MeshBasicMaterial({ color: '#FF7024' })
    );
    outerFlame.rotation.x = Math.PI;
    outerFlame.position.y = -0.95;
    flameGroup.add(outerFlame);

    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.8, 10),
      new THREE.MeshBasicMaterial({ color: '#FFF176' })
    );
    innerFlame.rotation.x = Math.PI;
    innerFlame.position.y = -0.65;
    flameGroup.add(innerFlame);

    const smokeMat = this.assets.createToonMaterial('mat-mars-smoke', { color: '#F3EFEA' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const puff = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(0.62, 1), smokeMat, {
        outlineScale: 1.05,
        castShadow: false,
      });
      puff.position.set(Math.cos(a) * 1.0, -1.6, Math.sin(a) * 1.0);
      flameGroup.add(puff);
    }
    flameGroup.visible = false;
    rocket.add(flameGroup);
    this.rocketFlameGroup = flameGroup;

    this.rocketGroup = rocket;
    padGroup.add(rocket);
    padGroup.position.set(-4.6, 0, -6.4);
    this.root.add(padGroup);
  }

  private buildSolarArray(): void {
    const poleMat = this.assets.createToonMaterial('mat-solar-pole', { color: '#E2E6EC' });
    const panelMat = this.assets.createToonMaterial('mat-solar-blue', { color: '#1F5696' });
    const frameMat = this.assets.createToonMaterial('mat-solar-frame', { color: '#CBD3DE' });

    const coords: [number, number][] = [
      [3.8, 1.4],
      [5.2, 0.2],
      [4.5, -1.0],
    ];
    for (const [sx, sz] of coords) {
      const base = new THREE.Group();
      const post = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.1, 0.14, 1.35, 8), poleMat, {
        outlineScale: 1.08,
      });
      post.position.y = 0.68;
      base.add(post);

      const pivot = new THREE.Group();
      pivot.position.y = 1.38;

      const frame = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.65, 0.1, 1.05), frameMat, {
        outlineScale: 1.04,
      });
      pivot.add(frame);

      const cells = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.9), panelMat);
      pivot.add(cells);

      pivot.rotation.x = 0.42;
      base.add(pivot);
      this.solarRotorPivots.push(pivot);

      base.position.set(sx, 0, sz);
      this.root.add(base);
    }
  }

  private buildMarsRover(): void {
    const rover = new THREE.Group();
    const goldMat = this.assets.createToonMaterial('mat-rover-gold', { color: '#F4B83A' });
    const whiteMat = this.assets.createToonMaterial('mat-rover-white', { color: '#F3F5F8' });
    const tireMat = this.assets.createToonMaterial('mat-rover-tire', { color: '#272C33' });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#53E2FF' });

    // Gold foil rover chassis
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.55, 0.56, 1.1), goldMat, {
      outlineScale: 1.05,
    });
    body.position.y = 0.62;
    rover.add(body);

    // 6 chunky bold-outlined rover wheels
    for (const wx of [-0.62, 0, 0.62]) {
      for (const wz of [-0.62, 0.62]) {
        const wheel = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 10), tireMat, {
          outlineScale: 1.08,
        });
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.24, wz);
        rover.add(wheel);
      }
    }

    // Tall cute camera head mast
    const mast = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.09, 0.9, 8), whiteMat, {
      outlineScale: 1.08,
    });
    mast.position.set(0.45, 1.25, 0);
    rover.add(mast);

    const head = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.36, 0.28, 0.56), whiteMat, {
      outlineScale: 1.06,
    });
    head.position.set(0.48, 1.72, 0);
    rover.add(head);

    for (const ez of [-0.14, 0.14]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), eyeMat);
      lens.rotation.y = Math.PI / 2;
      lens.position.set(0.67, 1.73, ez);
      rover.add(lens);
    }

    // Spinning dish antenna
    const dishPivot = new THREE.Group();
    dishPivot.position.set(-0.48, 1.08, 0);
    const dish = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.36, 0.2, 10), whiteMat, {
      outlineScale: 1.06,
    });
    dish.rotation.z = -0.6;
    dishPivot.add(dish);
    rover.add(dishPivot);
    this.roverDish = dishPivot;

    rover.position.set(2.5, 0, -2.0);
    this.roverGroup = rover;
    this.root.add(rover);
  }

  private buildFlyingPotatoes(): void {
    const rng = createSeededRng(9931);
    const group = new THREE.Group();
    const potatoMat = this.assets.createToonMaterial('mat-mars-potato', { color: '#B67B3E' });

    for (let i = 0; i < 24; i++) {
      const p = this.assets.createOutlinedMesh(new THREE.DodecahedronGeometry(0.24 + rng() * 0.14, 1), potatoMat, {
        outlineScale: 1.09,
        castShadow: false,
      });
      p.scale.set(1.35, 0.85, 0.95);
      const baseX = (rng() - 0.5) * 8.5;
      const baseZ = -3.8 + rng() * 6.8;
      p.position.set(baseX, 1.0, baseZ);
      group.add(p);
      this.potatoes.push({
        mesh: p,
        baseX,
        baseZ,
        speed: 1.2 + rng() * 1.4,
        phase: rng() * Math.PI * 2,
        rotSpeed: 2.0 + rng() * 3.5,
      });
    }
    group.visible = false;
    this.potatoesGroup = group;
    this.root.add(group);
  }

  private buildResumeBoard(): void {
    const group = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-resume-post', { color: '#39475A' });

    // Posts placed STRICTLY BEHIND board (z = -0.18) so they NEVER cross text
    for (const px of [-1.25, 1.25]) {
      const post = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.09, 3.0, 8), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(px, 1.5, -0.18);
      group.add(post);
    }

    // Crisp high-res canvas resume clipboard sign
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 768, 512);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#1E293B';
    ctx.strokeRect(9, 9, 750, 494);

    // Navy header banner
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(18, 18, 732, 110);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("KEVIN'S RESUME", 384, 74);

    // Bold checkmark bullet points
    ctx.textAlign = 'left';
    ctx.font = '800 40px "Arial", sans-serif';
    ctx.fillStyle = '#15803D';
    ctx.fillText('✓', 52, 196);
    ctx.fillStyle = '#111827';
    ctx.fillText('10 YRS ROCKET SCIENCE', 105, 196);

    ctx.fillStyle = '#15803D';
    ctx.fillText('✓', 52, 278);
    ctx.fillStyle = '#111827';
    ctx.fillText('MARS POTATO EXPERT', 105, 278);

    ctx.fillStyle = '#15803D';
    ctx.fillText('✓', 52, 360);
    ctx.fillStyle = '#111827';
    ctx.fillText('EXCELLENT AT BUTTONS', 105, 360);

    // Hilarious tiny red footnote
    ctx.textAlign = 'center';
    ctx.font = 'italic 700 28px "Arial", sans-serif';
    ctx.fillStyle = '#DC2626';
    ctx.fillText('(actually watched 1 YouTube video)', 384, 444);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const boardMat = new THREE.MeshBasicMaterial({ map: tex });
    const backMat = this.assets.createToonMaterial('mat-resume-back', { color: '#1E293B' });

    const board = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(3.3, 2.2, 0.14),
      [backMat, backMat, backMat, backMat, boardMat, backMat] as unknown as THREE.Material,
      { outlineScale: 1.03 }
    );
    board.position.set(0, 2.45, 0);
    group.add(board);

    group.position.set(0, 0, -2.5);
    group.visible = false;
    this.resumeBoardGroup = group;
    this.root.add(group);
  }

  private buildWaterGeyser(): void {
    const group = new THREE.Group();
    const poolMat = new THREE.MeshBasicMaterial({ color: '#29D3F5' });
    const foamMat = this.assets.createToonMaterial('mat-geyser-foam', { color: '#E0FAFF' });
    const colMat = new THREE.MeshBasicMaterial({
      color: '#4CE4FF',
      transparent: true,
      opacity: 0.9,
    });

    // Sparkling turquoise Martian oasis pool
    const pool = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.8, 3.0, 0.16, 20), poolMat, {
      outlineScale: 1.03,
      castShadow: false,
    });
    pool.position.y = 0.08;
    group.add(pool);

    // White bubbly foam collar
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const puff = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.45, 8, 8), foamMat, {
        outlineScale: 1.06,
        castShadow: false,
      });
      puff.position.set(Math.cos(a) * 0.95, 0.32, Math.sin(a) * 0.95);
      group.add(puff);
    }

    // Tall animated crystal-blue geyser column
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.92, 7.6, 12), colMat);
    column.position.y = 3.8;
    this.geyserColumn = column;
    group.add(column);

    // Cascading water droplets arcing outward
    const dropMat = new THREE.MeshBasicMaterial({ color: '#9EF4FF' });
    for (let i = 0; i < 18; i++) {
      const drop = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.22, 8, 8), dropMat, {
        outlineScale: 1.08,
        castShadow: false,
      });
      group.add(drop);
      this.geyserDrops.push({
        mesh: drop,
        angle: (i / 18) * Math.PI * 2,
        radius: 1.2 + (i % 3) * 0.65,
        phase: (i / 18) * Math.PI * 2,
        heightScale: 5.5 + (i % 4) * 0.85,
      });
    }

    group.position.set(0, 0, -2.8);
    group.visible = false;
    this.geyserGroup = group;
    this.root.add(group);
  }

  public update(env: EnvironmentState, sceneProgress: number, globalSeconds: number): void {
    const active = env.worldTheme === 'mars_colony';
    this.root.visible = active;
    if (!active) return;

    const mars = env.marsState ?? {
      rocketLaunching: false,
      roverRunaway: false,
      potatoesFlying: false,
      solarPanelsSpinning: false,
      waterGeyserActive: false,
      redMarsAlarm: false,
      showResumeBoard: false,
    };

    // Gentle Earth rotation in the Mars sky
    this.earthMesh.rotation.y = globalSeconds * 0.14;

    // Rocket launch ignition + upward rumble
    this.rocketFlameGroup.visible = mars.rocketLaunching;
    if (mars.rocketLaunching) {
      const lift = Math.pow(Math.max(0, sceneProgress), 1.6) * 4.5;
      this.rocketGroup.position.set(
        Math.sin(globalSeconds * 42) * 0.08,
        lift,
        Math.cos(globalSeconds * 38) * 0.08
      );
      const flicker = 0.85 + Math.sin(globalSeconds * 36) * 0.22;
      this.rocketFlameGroup.scale.set(1, flicker, 1);
    } else {
      this.rocketGroup.position.set(0, 0, 0);
    }

    // Runaway Mars Rover doing frantic donuts!
    if (mars.roverRunaway) {
      const t = globalSeconds * 2.3;
      const rx = Math.cos(t) * 2.5;
      const rz = -1.6 + Math.sin(t * 2) * 1.35;
      const nextX = Math.cos(t + 0.05) * 2.5;
      const nextZ = -1.6 + Math.sin((t + 0.05) * 2) * 1.35;
      this.roverGroup.position.set(rx, Math.abs(Math.sin(globalSeconds * 16)) * 0.08, rz);
      this.roverGroup.rotation.y = Math.atan2(nextZ - rz, nextX - rx);
      this.roverDish.rotation.y = globalSeconds * 10;
    } else {
      this.roverGroup.position.set(2.5, 0, -2.0);
      this.roverGroup.rotation.y = -0.65;
      this.roverDish.rotation.y = Math.sin(globalSeconds * 1.2) * 0.5;
    }

    // Solar panels spinning wildly like helicopter blades!
    for (let i = 0; i < this.solarRotorPivots.length; i++) {
      const pivot = this.solarRotorPivots[i];
      if (mars.solarPanelsSpinning) {
        pivot.rotation.y = globalSeconds * (7.5 + i * 1.5);
        pivot.rotation.x = 0.15 + Math.sin(globalSeconds * 8 + i) * 0.25;
      } else {
        pivot.rotation.y = -0.35;
        pivot.rotation.x = 0.42;
      }
    }

    // Red Mars dome strobe alarm beacons
    const pulse = mars.redMarsAlarm ? 0.5 + 0.5 * Math.sin(globalSeconds * 14) : 0.0;
    for (const beacon of this.alarmBeacons) {
      const mat = beacon.material as THREE.MeshBasicMaterial;
      mat.color.setHex(mars.redMarsAlarm && pulse > 0.45 ? 0xff2a1f : 0x5c2420);
      beacon.scale.setScalar(mars.redMarsAlarm ? 1.0 + pulse * 0.45 : 0.85);
    }

    // Flying low-gravity 3D potatoes tumbling across Mars
    this.potatoesGroup.visible = mars.potatoesFlying;
    if (mars.potatoesFlying) {
      for (const p of this.potatoes) {
        const cycle = (globalSeconds * p.speed + p.phase) % 4.0;
        const y = 0.4 + Math.sin((cycle / 4.0) * Math.PI) * 5.2;
        p.mesh.position.set(
          p.baseX + Math.sin(globalSeconds * 1.8 + p.phase) * 0.7,
          y,
          p.baseZ
        );
        p.mesh.rotation.set(
          globalSeconds * p.rotSpeed,
          globalSeconds * p.rotSpeed * 0.7,
          p.phase
        );
      }
    }

    // Crisp Resume Billboard
    this.resumeBoardGroup.visible = mars.showResumeBoard;

    // Sparkling Crystal-Blue Martian Underground Ocean Geyser
    this.geyserGroup.visible = mars.waterGeyserActive;
    if (mars.waterGeyserActive) {
      const pulseCol = 1.0 + Math.sin(globalSeconds * 12) * 0.12;
      this.geyserColumn.scale.set(pulseCol, 1.0 + Math.sin(globalSeconds * 9) * 0.08, pulseCol);
      for (const d of this.geyserDrops) {
        const u = ((globalSeconds * 1.35 + d.phase) % 1.0);
        const y = Math.sin(u * Math.PI) * d.heightScale + 0.3;
        const r = u * d.radius * 1.55;
        d.mesh.position.set(Math.cos(d.angle + globalSeconds * 0.4) * r, y, Math.sin(d.angle + globalSeconds * 0.4) * r);
      }
    }
  }
}
