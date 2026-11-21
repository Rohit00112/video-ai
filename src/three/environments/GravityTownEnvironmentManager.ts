import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { createSeededRng } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

interface FloatableProp {
  obj: THREE.Object3D;
  groundPos: THREE.Vector3;
  groundRot: THREE.Euler;
  floatHeight: number;
  driftX: number;
  phase: number;
  spinSpeed: number;
}

/**
 * Bold-outlined cel-shaded 3D Hillside Science Town & Gravity Lab Square
 * built to pair with our expressive 2D-in-3D stickman cast (CharacterManager).
 */
export class GravityTownEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private gyroOuter!: THREE.Object3D;
  private gyroInner!: THREE.Object3D;
  private towerOrb!: THREE.Mesh;

  private floatables: FloatableProp[] = [];
  private foodGroup!: THREE.Group;
  private foodItems: { mesh: THREE.Object3D; baseX: number; baseZ: number; phase: number }[] = [];
  private waterOrbsGroup!: THREE.Group;
  private waterOrbs: { mesh: THREE.Object3D; baseX: number; baseZ: number; phase: number }[] = [];
  private tetherGroup!: THREE.Group;
  private mattressGroup!: THREE.Group;

  private leverBoardGroup!: THREE.Group;
  private leverCanvas!: HTMLCanvasElement;
  private leverTex!: THREE.CanvasTexture;
  private lastBoardMode = '';

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'GravityTownRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildTownSquare();
    this.buildGravityLabTower();
    this.buildFloatableProps();
    this.buildFloatingFood();
    this.buildFloatingWaterOrbs();
    this.buildTetherRopes();
    this.buildMegaMattress();
    this.buildLeverBoard();
  }

  private buildTownSquare(): void {
    // Sunlit green grass meadow surround
    const grassMat = this.assets.createToonMaterial('mat-grav-grass', { color: '#58AD3A' });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.root.add(grass);

    // Clean warm cobblestone town plaza
    const plazaMat = this.assets.createToonMaterial('mat-grav-plaza', { color: '#D6D0C4' });
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 36), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.02, -2);
    plaza.receiveShadow = true;
    this.root.add(plaza);

    // Asphalt cross-street through plaza
    const roadMat = this.assets.createToonMaterial('mat-grav-road', { color: '#646C76' });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 36), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.03, -2);
    road.receiveShadow = true;
    this.root.add(road);

    // Dashed yellow centerline
    const lineMat = this.assets.createToonMaterial('mat-grav-yellow', { color: '#F5C438' });
    for (let z = 9; z >= -10; z -= 2.8) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 1.35), lineMat);
      dash.position.set(0, 0.04, z);
      this.root.add(dash);
    }

    // Pastel low-poly town buildings lining left & right edges
    const bColors = ['#F2C98A', '#A8D2E8', '#E9A798', '#C5E0B4'];
    const roofMat = this.assets.createToonMaterial('mat-grav-roof', { color: '#C94B38' });
    const winMat = this.assets.createToonMaterial('mat-grav-win', { color: '#39526D' });
    const trunkMat = this.assets.createToonMaterial('mat-grav-trunk', { color: '#694423' });
    const leafMat = this.assets.createToonMaterial('mat-grav-leaf', { color: '#388C2C' });

    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const bz = 6.5 - i * 6.5;
        const h = 5.4 + (i % 2) * 1.8;
        const bMat = this.assets.createToonMaterial(`mat-grav-b-${i}`, { color: bColors[i] });
        const bldg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.2, h, 5.2), bMat, {
          outlineScale: 1.025,
        });
        bldg.position.set(side * 9.5, h * 0.5, bz);
        this.root.add(bldg);

        const roof = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.6, 0.55, 5.6), roofMat, {
          outlineScale: 1.03,
        });
        roof.position.set(side * 9.5, h + 0.25, bz);
        this.root.add(roof);

        for (let r = 0; r < 2; r++) {
          for (const wz of [-1.2, 1.2]) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.88), winMat);
            win.position.set(side * 7.36, 2.2 + r * 1.9, bz + wz);
            this.root.add(win);
          }
        }
      }

      // Lush town trees outside sidewalks
      for (let tz = 7; tz >= -9; tz -= 5.4) {
        const trunk = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.9, 6), trunkMat, {
          outlineScale: 1.08,
        });
        trunk.position.set(side * 6.0, 0.95, tz);
        this.root.add(trunk);

        const crown = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(1.25, 1), leafMat, {
          outlineScale: 1.05,
        });
        crown.position.set(side * 6.0, 2.75, tz);
        this.root.add(crown);
      }
    }
  }

  private buildGravityLabTower(): void {
    const tower = new THREE.Group();
    const whiteMat = this.assets.createToonMaterial('mat-lab-white', { color: '#F1F5F9' });
    const slateMat = this.assets.createToonMaterial('mat-lab-slate', { color: '#334155' });
    const brassMat = this.assets.createToonMaterial('mat-lab-brass', { color: '#EAB308' });

    const base = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(3.4, 4.1, 6.8, 10), whiteMat, {
      outlineScale: 1.025,
    });
    base.position.y = 3.4;
    tower.add(base);

    const collar = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(3.8, 3.8, 0.8, 10), slateMat, {
      outlineScale: 1.03,
    });
    collar.position.y = 7.0;
    tower.add(collar);

    const dome = this.assets.createOutlinedMesh(
      new THREE.SphereGeometry(3.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      slateMat,
      { outlineScale: 1.03 }
    );
    dome.position.y = 7.3;
    tower.add(dome);

    // Giant spinning brass gyroscope rings atop the Gravity Lab Tower!
    const gyroCenter = new THREE.Group();
    gyroCenter.position.y = 12.2;

    const outerRing = this.assets.createOutlinedMesh(new THREE.TorusGeometry(2.6, 0.22, 8, 20), brassMat, {
      outlineScale: 1.05,
    });
    this.gyroOuter = outerRing;
    gyroCenter.add(outerRing);

    const innerRing = this.assets.createOutlinedMesh(new THREE.TorusGeometry(1.85, 0.18, 8, 18), brassMat, {
      outlineScale: 1.05,
    });
    innerRing.rotation.x = Math.PI / 2;
    this.gyroInner = innerRing;
    gyroCenter.add(innerRing);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 14, 12),
      new THREE.MeshBasicMaterial({ color: '#38F2D6' })
    );
    this.towerOrb = orb;
    gyroCenter.add(orb);

    tower.add(gyroCenter);
    tower.position.set(0, 0, -16.5);
    this.root.add(tower);
  }

  private buildCar(color: string, key: string): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = this.assets.createToonMaterial(`mat-gcar-${key}`, { color });
    const glassMat = this.assets.createToonMaterial('mat-gcar-glass', { color: '#9BE4FF' });
    const tireMat = this.assets.createToonMaterial('mat-gcar-tire', { color: '#1F2937' });

    const chassis = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.9, 0.62, 1.15), bodyMat, {
      outlineScale: 1.05,
    });
    chassis.position.y = 0.52;
    g.add(chassis);

    const cabin = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.05, 0.48, 1.02), glassMat, {
      outlineScale: 1.05,
    });
    cabin.position.set(-0.08, 1.02, 0);
    g.add(cabin);

    for (const wx of [-0.58, 0.58]) {
      for (const wz of [-0.58, 0.58]) {
        const wheel = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), tireMat, {
          outlineScale: 1.08,
        });
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.24, wz);
        g.add(wheel);
      }
    }
    return g;
  }

  private buildCityBus(): THREE.Group {
    const g = new THREE.Group();
    const busMat = this.assets.createToonMaterial('mat-gbus-blue', { color: '#2563EB' });
    const winMat = this.assets.createToonMaterial('mat-gbus-win', { color: '#BAE6FD' });
    const tireMat = this.assets.createToonMaterial('mat-gbus-tire', { color: '#1E293B' });

    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(3.4, 1.55, 1.35), busMat, {
      outlineScale: 1.04,
    });
    body.position.y = 1.08;
    g.add(body);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.55, 1.38), winMat);
    strip.position.y = 1.32;
    g.add(strip);

    for (const wx of [-1.1, 1.1]) {
      for (const wz of [-0.66, 0.66]) {
        const wheel = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), tireMat, {
          outlineScale: 1.08,
        });
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.3, wz);
        g.add(wheel);
      }
    }
    return g;
  }

  private buildParkBench(): THREE.Group {
    const g = new THREE.Group();
    const woodMat = this.assets.createToonMaterial('mat-gbench-wood', { color: '#A96B35' });
    const ironMat = this.assets.createToonMaterial('mat-gbench-iron', { color: '#272E38' });

    const seat = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.4, 0.12, 0.48), woodMat, {
      outlineScale: 1.06,
    });
    seat.position.y = 0.46;
    g.add(seat);

    const back = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.4, 0.45, 0.1), woodMat, {
      outlineScale: 1.06,
    });
    back.position.set(0, 0.78, -0.2);
    g.add(back);

    for (const lx of [-0.55, 0.55]) {
      const leg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.1, 0.46, 0.42), ironMat, {
        outlineScale: 1.08,
      });
      leg.position.set(lx, 0.23, 0);
      g.add(leg);
    }
    return g;
  }

  private buildFloatableProps(): void {
    const addProp = (
      obj: THREE.Object3D,
      pos: [number, number, number],
      rotY: number,
      floatHeight: number,
      driftX: number,
      phase: number,
      spinSpeed: number
    ) => {
      obj.position.set(pos[0], pos[1], pos[2]);
      obj.rotation.set(0, rotY, 0);
      this.root.add(obj);
      this.floatables.push({
        obj,
        groundPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
        groundRot: new THREE.Euler(0, rotY, 0),
        floatHeight,
        driftX,
        phase,
        spinSpeed,
      });
    };

    // Keep center stage (x in [-2, 2], z in [0, 4]) clear on the ground for stickmen!
    addProp(this.buildCar('#E03B2E', 'red'), [-2.8, 0, -2.6], 0.35, 3.9, 1.0, 0.2, 0.75);
    addProp(this.buildCar('#F5B82E', 'yel'), [2.9, 0, -1.8], -0.4, 4.8, -0.9, 1.4, 0.9);
    addProp(this.buildCar('#16A34A', 'grn'), [-3.1, 0, -6.2], 0.1, 5.4, 0.8, 2.5, 0.65);
    addProp(this.buildCityBus(), [1.6, 0, -6.4], -0.22, 5.8, -1.2, 0.8, 0.48);
    addProp(this.buildParkBench(), [-4.6, 0, 1.0], 1.35, 3.2, 0.9, 1.9, 1.15);
    addProp(this.buildParkBench(), [4.6, 0, 1.2], -1.35, 3.6, -0.9, 3.1, 1.05);
  }

  private buildFloatingFood(): void {
    const rng = createSeededRng(7331);
    const group = new THREE.Group();
    const pancakeMat = this.assets.createToonMaterial('mat-g-pancake', { color: '#E2A347' });
    const butterMat = this.assets.createToonMaterial('mat-g-butter', { color: '#FEF08A' });
    const soupMat = this.assets.createToonMaterial('mat-g-soup', { color: '#EF4444' });
    const bowlMat = this.assets.createToonMaterial('mat-g-bowl', { color: '#F8FAFC' });

    for (let i = 0; i < 16; i++) {
      const item = new THREE.Group();
      if (i % 2 === 0) {
        const cake = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 12), pancakeMat, {
          outlineScale: 1.07,
          castShadow: false,
        });
        item.add(cake);
        const butter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), butterMat);
        butter.position.y = 0.1;
        item.add(butter);
      } else {
        const bowl = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.42, 0.26, 0.3, 10), bowlMat, {
          outlineScale: 1.07,
          castShadow: false,
        });
        item.add(bowl);
        const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 10), soupMat);
        soup.position.y = 0.14;
        item.add(soup);
      }
      const bx = (rng() - 0.5) * 6.8;
      const bz = -3.2 + rng() * 5.2;
      item.position.set(bx, 2.0, bz);
      group.add(item);
      this.foodItems.push({ mesh: item, baseX: bx, baseZ: bz, phase: rng() * Math.PI * 2 });
    }
    group.visible = false;
    this.foodGroup = group;
    this.root.add(group);
  }

  private buildFloatingWaterOrbs(): void {
    const rng = createSeededRng(5521);
    const group = new THREE.Group();
    const orbMat = new THREE.MeshBasicMaterial({ color: '#4BE3FF', transparent: true, opacity: 0.88 });

    for (let i = 0; i < 18; i++) {
      const r = 0.22 + rng() * 0.24;
      const orb = this.assets.createOutlinedMesh(new THREE.SphereGeometry(r, 10, 8), orbMat, {
        outlineScale: 1.08,
        castShadow: false,
      });
      const bx = (rng() - 0.5) * 6.4;
      const bz = -2.4 + rng() * 5.4;
      orb.position.set(bx, 1.8, bz);
      group.add(orb);
      this.waterOrbs.push({ mesh: orb, baseX: bx, baseZ: bz, phase: rng() * Math.PI * 2 });
    }
    group.visible = false;
    this.waterOrbsGroup = group;
    this.root.add(group);
  }

  private buildTetherRopes(): void {
    const group = new THREE.Group();
    const ropeMat = this.assets.createToonMaterial('mat-g-rope', { color: '#FACC15' });
    const anchors: [number, number, number][] = [
      [-2.4, 0, -1.8],
      [2.4, 0, -1.4],
      [-1.8, 0, -5.2],
      [1.8, 0, -5.4],
    ];
    for (const [ax, , az] of anchors) {
      const rope = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.06, 0.06, 6.2, 6), ropeMat, {
        outlineScale: 1.1,
        castShadow: false,
      });
      rope.position.set(ax, 3.1, az);
      rope.rotation.z = ax < 0 ? -0.14 : 0.14;
      group.add(rope);
    }
    group.visible = false;
    this.tetherGroup = group;
    this.root.add(group);
  }

  private buildMegaMattress(): void {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#38BDF8';
    for (let x = 0; x < 512; x += 64) {
      ctx.fillRect(x, 0, 32, 512);
    }
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex });

    const pad = this.assets.createOutlinedMesh(new THREE.BoxGeometry(7.2, 0.65, 5.4), mat, {
      outlineScale: 1.03,
    });
    pad.position.set(0, 0.34, -2.6);
    group.add(pad);

    group.visible = false;
    this.mattressGroup = group;
    this.root.add(group);
  }

  private buildLeverBoard(): void {
    const group = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-gboard-post', { color: '#334155' });
    // Posts STRICTLY BEHIND board (z = -0.18) so text is 100% unobstructed!
    for (const px of [-1.25, 1.25]) {
      const post = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.09, 2.9, 8), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(px, 1.45, -0.18);
      group.add(post);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 480;
    this.leverCanvas = canvas;
    this.leverTex = new THREE.CanvasTexture(canvas);
    this.leverTex.colorSpace = THREE.SRGBColorSpace;

    const faceMat = new THREE.MeshBasicMaterial({ map: this.leverTex });
    const backMat = this.assets.createToonMaterial('mat-gboard-back', { color: '#1E293B' });
    const board = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(3.35, 2.1, 0.14),
      [backMat, backMat, backMat, backMat, faceMat, backMat] as unknown as THREE.Material,
      { outlineScale: 1.03 }
    );
    board.position.set(0, 2.35, 0);
    group.add(board);

    group.position.set(0, 0, -2.3);
    group.visible = false;
    this.leverBoardGroup = group;
    this.root.add(group);
    this.redrawLeverBoard('on');
  }

  private redrawLeverBoard(mode: 'on' | 'off' | 'no_sandwich'): void {
    if (this.lastBoardMode === mode) return;
    this.lastBoardMode = mode;

    const ctx = this.leverCanvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 768, 480);

    if (mode === 'on') {
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#16A34A';
      ctx.strokeRect(11, 11, 746, 458);
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(22, 22, 724, 120);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TOWN GRAVITY', 384, 82);
      ctx.fillStyle = '#15803D';
      ctx.font = '900 96px "Arial Black", sans-serif';
      ctx.fillText('ON ✓', 384, 255);
      ctx.fillStyle = '#334155';
      ctx.font = '800 34px "Arial", sans-serif';
      ctx.fillText('DO NOT TOUCH RED SWITCH', 384, 392);
    } else if (mode === 'off') {
      ctx.lineWidth = 24;
      ctx.strokeStyle = '#DC2626';
      ctx.strokeRect(12, 12, 744, 456);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(22, 22, 724, 124);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WARNING!', 384, 84);
      ctx.fillStyle = '#DC2626';
      ctx.font = '900 84px "Arial Black", sans-serif';
      ctx.fillText('GRAVITY: OFF', 384, 255);
      ctx.fillStyle = '#111827';
      ctx.font = '800 34px "Arial", sans-serif';
      ctx.fillText('HOLD ONTO YOUR SHOES!', 384, 392);
    } else {
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#1D4ED8';
      ctx.strokeRect(11, 11, 746, 458);
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(22, 22, 724, 120);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW TOWN LAW', 384, 82);
      ctx.fillStyle = '#111827';
      ctx.font = '900 58px "Arial Black", sans-serif';
      ctx.fillText('NO SANDWICHES', 384, 232);
      ctx.fillStyle = '#DC2626';
      ctx.fillText('NEAR SCIENCE!', 384, 326);
    }
    this.leverTex.needsUpdate = true;
  }

  public update(env: EnvironmentState, globalSeconds: number): void {
    const active = env.worldTheme === 'gravity_town';
    this.root.visible = active;
    if (!active) return;

    const g = env.gravityState ?? {
      gravityOff: false,
      floatIntensity: 0,
      showLeverBoard: false,
      leverBoardMode: 'on' as const,
      towerRedAlarm: false,
      tetherRopesActive: false,
      mattressPadActive: false,
      floatingWaterOrbs: false,
      floatingFood: false,
    };

    // Spin Gravity Lab Tower gyroscope rings!
    const spinRate = g.gravityOff ? 3.8 : 0.9;
    this.gyroOuter.rotation.y = globalSeconds * spinRate;
    this.gyroOuter.rotation.x = Math.sin(globalSeconds * 1.4) * 0.35;
    this.gyroInner.rotation.z = -globalSeconds * (spinRate * 1.4);

    // Tower core orb color (healthy cyan-mint vs strobing red alarm)
    const orbMat = this.towerOrb.material as THREE.MeshBasicMaterial;
    if (g.towerRedAlarm) {
      const blink = Math.sin(globalSeconds * 16) > 0;
      orbMat.color.setHex(blink ? 0xff2a1f : 0xff9a3c);
    } else if (g.gravityOff) {
      orbMat.color.setHex(0xc084fc);
    } else {
      orbMat.color.setHex(0x38f2d6);
    }

    // Float & tumble cars, city bus, and park benches!
    const f = g.floatIntensity;
    for (const item of this.floatables) {
      if (f > 0.01) {
        const bob = Math.sin(globalSeconds * 1.6 + item.phase) * 0.45 * f;
        const y = item.groundPos.y + item.floatHeight * f + bob;
        const x = item.groundPos.x + Math.sin(globalSeconds * 0.9 + item.phase) * item.driftX * f;
        item.obj.position.set(x, y, item.groundPos.z);
        item.obj.rotation.set(
          Math.sin(globalSeconds * item.spinSpeed + item.phase) * 0.42 * f,
          item.groundRot.y + globalSeconds * item.spinSpeed * 0.55 * f,
          Math.cos(globalSeconds * item.spinSpeed * 0.8 + item.phase) * 0.38 * f
        );
      } else {
        // Gentle celebratory bounce if mattress pad is active!
        const bounce = g.mattressPadActive ? Math.abs(Math.sin(globalSeconds * 5.2 + item.phase)) * 0.25 : 0;
        item.obj.position.set(item.groundPos.x, item.groundPos.y + bounce, item.groundPos.z);
        item.obj.rotation.copy(item.groundRot);
      }
    }

    // Floating zero-G pancakes & soup bowls
    this.foodGroup.visible = g.floatingFood;
    if (g.floatingFood) {
      for (const fd of this.foodItems) {
        const y = 1.6 + ((globalSeconds * 0.9 + fd.phase) % 4.5);
        fd.mesh.position.set(fd.baseX + Math.sin(globalSeconds * 1.4 + fd.phase) * 0.45, y, fd.baseZ);
        fd.mesh.rotation.set(globalSeconds * 1.8 + fd.phase, globalSeconds * 1.2, fd.phase);
      }
    }

    // Floating zero-G water spheres
    this.waterOrbsGroup.visible = g.floatingWaterOrbs;
    if (g.floatingWaterOrbs) {
      for (const orb of this.waterOrbs) {
        const y = 1.4 + Math.sin(globalSeconds * 1.9 + orb.phase) * 1.4 + 1.4;
        orb.mesh.position.set(orb.baseX + Math.cos(globalSeconds * 1.3 + orb.phase) * 0.5, y, orb.baseZ);
        const s = 1.0 + Math.sin(globalSeconds * 5 + orb.phase) * 0.14;
        orb.mesh.scale.set(s, 1 / s, s);
      }
    }

    this.tetherGroup.visible = g.tetherRopesActive;
    this.mattressGroup.visible = g.mattressPadActive;

    this.leverBoardGroup.visible = g.showLeverBoard;
    if (g.showLeverBoard) {
      this.redrawLeverBoard(g.leverBoardMode);
    }
  }
}
