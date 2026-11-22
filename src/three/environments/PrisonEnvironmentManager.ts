import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, createSeededRng, lerp } from '../../utils/math.js';
import { AssetManager } from '../core/AssetManager.js';

type PrisonState = NonNullable<EnvironmentState['prisonState']>;

/**
 * 3D Cel-shaded Prison Environment ("What If You Had Infinite IQ In Prison?"):
 * 1. Cell Zone: Mossy stone brick walls, high barred window with moonlight/rain beam, iron bars, cot
 * 2. Laundry Zone: Industrial washing machines, laundry carts, sweeping searchlight with blind spot
 * 3. Warden's Office: Mahogany desk, brass puzzle cube, chessboard, 10-year cold case files
 * 4. Prison Gates & Courtyard: Barbed wire walls, heavy sliding iron gates with hazard stripes
 * 5. City Street & Bus Stop: Sidewalk, bus stop sign, bench, slow-ticking municipal clock
 */
export class PrisonEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  // Zones
  private cellGroup = new THREE.Group();
  private laundryGroup = new THREE.Group();
  private wardenGroup = new THREE.Group();
  private gatesGroup = new THREE.Group();
  private cityGroup = new THREE.Group();

  // Animatable elements
  private gateLeft!: THREE.Group;
  private gateRight!: THREE.Group;
  private searchlightCone!: THREE.Mesh;
  private clockSecondHand!: THREE.Group;
  private rainRipples: THREE.Mesh[] = [];
  private puzzleBox!: THREE.Group;

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'PrisonRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.root.add(this.cellGroup);
    this.root.add(this.laundryGroup);
    this.root.add(this.wardenGroup);
    this.root.add(this.gatesGroup);
    this.root.add(this.cityGroup);

    this.buildPrisonCell();
    this.buildLaundryRoom();
    this.buildWardenOffice();
    this.buildPrisonGates();
    this.buildCityStreet();
  }

  // --------------------------------------------------------------------------- Textures
  private createBrickTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#424953';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 16;
    const rowH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 8;
      const colW = 512 / cols;
      const offset = (r % 2) * (colW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;
        const y = r * rowH;
        ctx.fillStyle = (r + c) % 3 === 0 ? '#4F5763' : (r + c) % 3 === 1 ? '#383E47' : '#31363E';
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
        ctx.strokeStyle = '#1A1D22';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, colW - 4, rowH - 4);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createHazardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#E5A932';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#1C1C1E';
    for (let i = -64; i < 320; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i - 8, 64);
      ctx.lineTo(i - 24, 64);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // --------------------------------------------------------------------------- 1. Cell
  private buildPrisonCell(): void {
    const group = this.cellGroup;
    group.name = 'CellZone';
    group.position.set(0, 0, 0);

    const stoneMat = new THREE.MeshToonMaterial({
      map: this.createBrickTexture(),
      color: '#8A929E',
    });
    const floorMat = new THREE.MeshToonMaterial({ color: '#2B313A' });

    // Cell Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), floorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Back stone wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 0.6), stoneMat);
    backWall.position.set(0, 4, -5);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Left stone wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 10), stoneMat);
    leftWall.position.set(-5, 4, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Right stone wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 10), stoneMat);
    rightWall.position.set(5, 4, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), stoneMat);
    ceiling.position.set(0, 8.2, 0);
    group.add(ceiling);

    // High Barred Window on back wall (z = -4.7)
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 0.8),
      new THREE.MeshToonMaterial({ color: '#16191E' })
    );
    windowFrame.position.set(0, 5.8, -4.7);
    group.add(windowFrame);

    // Window light beam cutting through dust/rain
    const beamGeo = new THREE.CylinderGeometry(0.5, 2.8, 8, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#7AC0FF',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 3.2, -1.8);
    beam.rotation.x = Math.PI * 0.32;
    group.add(beam);

    // Window mini bars
    for (let i = -0.5; i <= 0.5; i += 0.25) {
      const wbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8),
        new THREE.MeshToonMaterial({ color: '#111317' })
      );
      wbar.position.set(i, 5.8, -4.68);
      group.add(wbar);
    }

    // Heavy Front Cell Iron Bars (z = 4.2)
    const barMat = new THREE.MeshToonMaterial({ color: '#1E232B' });
    const barTop = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.2, 0.2), barMat);
    barTop.position.set(0, 6.5, 4.2);
    group.add(barTop);

    const barBot = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.2, 0.2), barMat);
    barBot.position.set(0, 0.1, 4.2);
    group.add(barBot);

    for (let x = -4.5; x <= 4.5; x += 0.45) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 6.4, 12), barMat);
      bar.position.set(x, 3.3, 4.2);
      bar.castShadow = true;
      group.add(bar);
    }

    // Prison Cot (metal frame + mattress + pillow)
    const cotGroup = new THREE.Group();
    cotGroup.position.set(-3.2, 0, -2.5);
    const cotFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 4.2),
      new THREE.MeshToonMaterial({ color: '#2C323B' })
    );
    cotFrame.position.set(0, 0.5, 0);
    cotGroup.add(cotFrame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.25, 4.0),
      new THREE.MeshToonMaterial({ color: '#7E8B9B' })
    );
    mattress.position.set(0, 0.65, 0);
    cotGroup.add(mattress);

    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.18, 0.9),
      new THREE.MeshToonMaterial({ color: '#ABB5C2' })
    );
    pillow.position.set(0, 0.82, -1.4);
    cotGroup.add(pillow);

    // 4 legs
    for (const [lx, lz] of [[-1.1, -1.9], [1.1, -1.9], [-1.1, 1.9], [1.1, 1.9]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), barMat);
      leg.position.set(lx, 0.25, lz);
      cotGroup.add(leg);
    }
    group.add(cotGroup);

    // Water puddle with ripples
    const puddleMat = new THREE.MeshBasicMaterial({
      color: '#4B7A9E',
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 3; i++) {
      const rip = new THREE.Mesh(new THREE.RingGeometry(0.1 + i * 0.15, 0.14 + i * 0.15, 24), puddleMat);
      rip.rotation.x = -Math.PI * 0.5;
      rip.position.set(1.4, 0.02, -1.8);
      group.add(rip);
      this.rainRipples.push(rip);
    }
  }

  // --------------------------------------------------------------------------- 2. Laundry
  private buildLaundryRoom(): void {
    const group = this.laundryGroup;
    group.name = 'LaundryZone';
    group.position.set(30, 0, 0);

    const tileMat = new THREE.MeshToonMaterial({ color: '#DCE4EC' });
    const wallMat = new THREE.MeshToonMaterial({ color: '#687482' });

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 12), tileMat);
    floor.position.set(0, -0.2, 0);
    group.add(floor);

    // Back wall with pipes
    const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 0.6), wallMat);
    wall.position.set(0, 4, -6);
    group.add(wall);

    // Overhead steam pipe
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 14, 16),
      new THREE.MeshToonMaterial({ color: '#B08846' })
    );
    pipe.rotation.z = Math.PI * 0.5;
    pipe.position.set(0, 6.4, -5.4);
    group.add(pipe);

    // Row of Industrial Washing Machines
    const washerMat = new THREE.MeshToonMaterial({ color: '#E8EDF2' });
    const doorMat = new THREE.MeshToonMaterial({ color: '#3A74A8' });
    for (let i = -4; i <= 4; i += 2.2) {
      const washer = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.6), washerMat);
      washer.position.set(i, 1.1, -4.8);
      group.add(washer);

      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20), doorMat);
      door.rotation.x = Math.PI * 0.5;
      door.position.set(i, 1.2, -3.95);
      group.add(door);
    }

    // Laundry hampers (wire carts with orange jumpsuits)
    const cartMat = new THREE.MeshToonMaterial({ color: '#556270' });
    const clothesMat = new THREE.MeshToonMaterial({ color: '#E65A1E' });
    for (const [cx, cz] of [[-3.5, 1.5], [3.2, 2.0]]) {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.4), cartMat);
      cart.position.set(cx, 0.7, cz);
      group.add(cart);

      const pile = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), clothesMat);
      pile.position.set(cx, 1.3, cz);
      pile.scale.set(1.2, 0.7, 1.0);
      group.add(pile);
    }

    // Blind spot floor decal (green dashed zone)
    const decalMat = new THREE.MeshBasicMaterial({
      color: '#2ED573',
      transparent: true,
      opacity: 0.35,
    });
    const blindSpot = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), decalMat);
    blindSpot.rotation.x = -Math.PI * 0.5;
    blindSpot.position.set(0, 0.03, 2.2);
    group.add(blindSpot);

    // Searchlight beam from ceiling
    const slGeo = new THREE.ConeGeometry(2.4, 7.5, 20, 1, true);
    const slMat = new THREE.MeshBasicMaterial({
      color: '#FF4757',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.searchlightCone = new THREE.Mesh(slGeo, slMat);
    this.searchlightCone.position.set(-2.5, 4.0, -1.0);
    this.searchlightCone.rotation.x = -Math.PI * 0.15;
    group.add(this.searchlightCone);
  }

  // --------------------------------------------------------------------------- 3. Warden Office
  private buildWardenOffice(): void {
    const group = this.wardenGroup;
    group.name = 'WardenZone';
    group.position.set(60, 0, 0);

    const woodMat = new THREE.MeshToonMaterial({ color: '#5C381E' });
    const wallMat = new THREE.MeshToonMaterial({ color: '#4A5B6B' });
    const rugMat = new THREE.MeshToonMaterial({ color: '#8A2B2B' });

    // Floor + Rug
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 10), new THREE.MeshToonMaterial({ color: '#32231A' }));
    floor.position.set(0, -0.2, 0);
    group.add(floor);

    const rug = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.02, 5.0), rugMat);
    rug.position.set(0, 0.02, 0);
    group.add(rug);

    // Back wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 0.6), wallMat);
    wall.position.set(0, 4, -5);
    group.add(wall);

    // Framed Certificate on Wall
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.5, 0.1),
      new THREE.MeshToonMaterial({ color: '#C89B3C' })
    );
    frame.position.set(0, 5.2, -4.68);
    group.add(frame);

    const cert = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.2, 0.12),
      new THREE.MeshBasicMaterial({ color: '#FDFBF7' })
    );
    cert.position.set(0, 5.2, -4.67);
    group.add(cert);

    // Executive Mahogany Desk
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 2.4), woodMat);
    deskTop.position.set(0, 1.5, -0.5);
    group.add(deskTop);

    // Desk Pedestals
    for (const dx of [-1.8, 1.8]) {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 2.2), woodMat);
      ped.position.set(dx, 0.7, -0.5);
      group.add(ped);
    }

    // Impossible Puzzle Box on desk
    this.puzzleBox = new THREE.Group();
    this.puzzleBox.position.set(-0.8, 1.7, -0.5);
    const boxBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.35, 0.5),
      new THREE.MeshToonMaterial({ color: '#9E6A38' })
    );
    this.puzzleBox.add(boxBase);

    // Brass puzzle rings on top
    const brassRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.04, 8, 20),
      new THREE.MeshToonMaterial({ color: '#F2C14E' })
    );
    brassRing.rotation.x = Math.PI * 0.5;
    brassRing.position.set(0, 0.22, 0);
    this.puzzleBox.add(brassRing);
    group.add(this.puzzleBox);

    // Chessboard on desk
    const chessBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.05, 1.0),
      new THREE.MeshToonMaterial({ color: '#2B231D' })
    );
    chessBoard.position.set(1.0, 1.62, -0.5);
    group.add(chessBoard);

    // Banker's Lamp
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12),
      new THREE.MeshToonMaterial({ color: '#D4AF37' })
    );
    lampBase.position.set(1.8, 1.64, -0.2);
    group.add(lampBase);

    const lampShade = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.25),
      new THREE.MeshBasicMaterial({ color: '#2E8B57' })
    );
    lampShade.position.set(1.8, 2.05, -0.2);
    group.add(lampShade);

    // Cold Case folders
    const folderMat = new THREE.MeshToonMaterial({ color: '#C8B078' });
    for (let f = 0; f < 3; f++) {
      const folder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 1.1), folderMat);
      folder.position.set(0.1, 1.62 + f * 0.05, -0.3 + f * 0.06);
      folder.rotation.y = f * 0.12;
      group.add(folder);
    }
  }

  // --------------------------------------------------------------------------- 4. Prison Gates
  private buildPrisonGates(): void {
    const group = this.gatesGroup;
    group.name = 'GatesZone';
    group.position.set(90, 0, 0);

    const concMat = new THREE.MeshToonMaterial({ color: '#555E68' });
    const asphaltMat = new THREE.MeshToonMaterial({ color: '#2A2E33' });
    const ironGateMat = new THREE.MeshToonMaterial({ color: '#1A1C20' });

    // Courtyard Ground
    const ground = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 20), asphaltMat);
    ground.position.set(0, -0.2, 0);
    ground.receiveShadow = true;
    group.add(ground);

    // Left concrete tower/wall
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 2), concMat);
    wallL.position.set(-6.5, 5, 0);
    wallL.castShadow = true;
    group.add(wallL);

    // Right concrete tower/wall
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 2), concMat);
    wallR.position.set(6.5, 5, 0);
    wallR.castShadow = true;
    group.add(wallR);

    // Arch overhead beam
    const arch = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, 2.2), concMat);
    arch.position.set(0, 9.5, 0);
    group.add(arch);

    // State Prison Sign on arch
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 1.1, 0.1),
      new THREE.MeshToonMaterial({ color: '#1E232B' })
    );
    signBox.position.set(0, 9.5, 1.15);
    group.add(signBox);

    // Double Sliding Iron Gates
    this.gateLeft = new THREE.Group();
    this.gateLeft.position.set(-1.8, 0, 0);
    const glMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 7.8, 0.2), ironGateMat);
    glMesh.position.set(0, 3.9, 0);
    this.gateLeft.add(glMesh);

    // Hazard stripe band on left gate
    const hzL = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.6),
      new THREE.MeshBasicMaterial({ map: this.createHazardTexture() })
    );
    hzL.position.set(0, 1.8, 0.12);
    this.gateLeft.add(hzL);
    group.add(this.gateLeft);

    this.gateRight = new THREE.Group();
    this.gateRight.position.set(1.8, 0, 0);
    const grMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 7.8, 0.2), ironGateMat);
    grMesh.position.set(0, 3.9, 0);
    this.gateRight.add(grMesh);

    const hzR = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.6),
      new THREE.MeshBasicMaterial({ map: this.createHazardTexture() })
    );
    hzR.position.set(0, 1.8, 0.12);
    this.gateRight.add(hzR);
    group.add(this.gateRight);

    // Barbed wire coils along wall tops
    const coilMat = new THREE.MeshToonMaterial({ color: '#88929E' });
    for (const wx of [-6.5, 6.5]) {
      for (let bx = -2.5; bx <= 2.5; bx += 0.8) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), coilMat);
        coil.position.set(wx + bx, 10.4, 0);
        coil.rotation.y = Math.PI * 0.5;
        group.add(coil);
      }
    }

    // Intercom box on right wall
    const intercom = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.6, 0.25),
      new THREE.MeshToonMaterial({ color: '#2B323D' })
    );
    intercom.position.set(3.4, 2.0, 1.15);
    group.add(intercom);

    const redBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12),
      new THREE.MeshBasicMaterial({ color: '#FF3838' })
    );
    redBtn.rotation.x = Math.PI * 0.5;
    redBtn.position.set(3.4, 2.05, 1.3);
    group.add(redBtn);
  }

  // --------------------------------------------------------------------------- 5. City Street
  private buildCityStreet(): void {
    const group = this.cityGroup;
    group.name = 'CityZone';
    group.position.set(120, 0, 0);

    const sidewalkMat = new THREE.MeshToonMaterial({ color: '#D4C8B8' });
    const roadMat = new THREE.MeshToonMaterial({ color: '#444850' });

    // Sidewalk + Road
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 5), sidewalkMat);
    sidewalk.position.set(0, -0.15, 1.5);
    group.add(sidewalk);

    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 7), roadMat);
    road.position.set(0, -0.2, -4.5);
    group.add(road);

    // Bus Stop Pole & Sign
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.8, 12),
      new THREE.MeshToonMaterial({ color: '#2A303A' })
    );
    pole.position.set(-2.5, 1.9, 2.5);
    group.add(pole);

    const sign = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20),
      new THREE.MeshToonMaterial({ color: '#2E86DE' })
    );
    sign.rotation.x = Math.PI * 0.5;
    sign.position.set(-2.5, 3.7, 2.5);
    group.add(sign);

    // Bus Stop Wooden Bench
    const benchMat = new THREE.MeshToonMaterial({ color: '#7E4C24' });
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.7), benchMat);
    benchSeat.position.set(1.2, 0.6, 2.2);
    group.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.08), benchMat);
    benchBack.position.set(1.2, 1.0, 2.5);
    group.add(benchBack);

    // Large Municipal Clock on building wall behind
    const clockGroup = new THREE.Group();
    clockGroup.position.set(0, 5.0, -1.0);

    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32),
      new THREE.MeshToonMaterial({ color: '#FDFBF7' })
    );
    clockFace.rotation.x = Math.PI * 0.5;
    clockGroup.add(clockFace);

    const clockRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.1, 12, 32),
      new THREE.MeshToonMaterial({ color: '#2B303A' })
    );
    clockGroup.add(clockRim);

    this.clockSecondHand = new THREE.Group();
    const handMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.85, 0.02),
      new THREE.MeshBasicMaterial({ color: '#D9241C' })
    );
    handMesh.position.set(0, 0.42, 0.1);
    this.clockSecondHand.add(handMesh);
    clockGroup.add(this.clockSecondHand);

    group.add(clockGroup);
  }

  // --------------------------------------------------------------------------- Update
  public update(state?: PrisonState, globalSeconds = 0): void {
    if (!state) return;
    this.root.visible = true;

    // Position root so the active zone centers around the camera origin
    const zoneOffsets: Record<PrisonState['zone'], number> = {
      cell: 0,
      laundry: -30,
      warden_office: -60,
      gates: -90,
      city_street: -120,
      return_gate: -90,
    };
    const targetX = zoneOffsets[state.zone] ?? 0;
    this.root.position.x = lerp(this.root.position.x, targetX, 0.25);

    // Gate animation (slides open when gatesOpenRatio > 0)
    const openAmount = (state.gatesOpenRatio ?? 0) * 3.2;
    this.gateLeft.position.x = -1.8 - openAmount;
    this.gateRight.position.x = 1.8 + openAmount;

    // Searchlight sweeping in laundry room
    if (this.searchlightCone) {
      const angle = Math.sin(globalSeconds * 1.4) * 0.35;
      this.searchlightCone.rotation.z = angle;
    }

    // Rain ripples animation
    for (let i = 0; i < this.rainRipples.length; i++) {
      const rip = this.rainRipples[i];
      const phase = (globalSeconds * 1.8 + i * 0.4) % 1.0;
      rip.scale.set(1 + phase * 2.2, 1 + phase * 2.2, 1);
      (rip.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - phase);
    }

    // Puzzle box gentle glow / idle spin if solved
    if (this.puzzleBox && state.puzzleSolved) {
      this.puzzleBox.rotation.y = globalSeconds * 1.5;
    }

    // Clock hand in city scene ticks slowly
    if (this.clockSecondHand) {
      const spd = state.clockSpeed ?? 1.0;
      this.clockSecondHand.rotation.z = -globalSeconds * 0.12 * spd;
    }
  }
}
