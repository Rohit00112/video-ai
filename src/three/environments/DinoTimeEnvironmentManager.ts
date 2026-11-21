import * as THREE from 'three';
import { EnvironmentState } from '../../services/scripting/schema.js';
import { AssetManager } from '../core/AssetManager.js';

/**
 * Bold-outlined cel-shaded 3D Prehistoric Jungle & Altered Dinosaur-Ruled Modern City
 * built to pair seamlessly with our expressive 2D-in-3D stickman cast (CharacterManager).
 */
export class DinoTimeEnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly assets: AssetManager;

  private jungleZone!: THREE.Group;
  private dinoCityZone!: THREE.Group;

  private junglePortalGroup!: THREE.Group;
  private junglePortalVortex!: THREE.Mesh;
  private cityPortalGroup!: THREE.Group;
  private cityPortalVortex!: THREE.Mesh;

  private phoneGroup!: THREE.Group;
  private phoneGlowRing!: THREE.Mesh;
  private ruleSignGroup!: THREE.Group;

  private jungleRexGroup!: THREE.Group;
  private jungleRexHeadPivot!: THREE.Group;
  private jungleRexJawPivot!: THREE.Group;
  private jungleRexTailPivot!: THREE.Group;

  private volcanoSmokePuffs: THREE.Object3D[] = [];
  private lavaBouldersGroup!: THREE.Group;
  private lavaBoulders: { mesh: THREE.Object3D; angle: number; speed: number; phase: number }[] = [];

  private businessDinosGroup!: THREE.Group;
  private businessDinoRefs: { group: THREE.Group; jaw: THREE.Group; phase: number }[] = [];

  constructor(scene: THREE.Scene, assets: AssetManager) {
    this.assets = assets;
    this.root.name = 'DinoTimeRoot';
    this.root.visible = false;
    scene.add(this.root);

    this.buildJungleZone();
    this.buildDinoCityZone();
  }

  private buildCartoonTRex(options: {
    scale: number;
    bodyColor: string;
    bellyColor: string;
    tieColor?: string;
    topHat?: boolean;
    prop?: 'none' | 'briefcase' | 'coffee';
  }): { group: THREE.Group; headPivot: THREE.Group; jawPivot: THREE.Group; tailPivot: THREE.Group } {
    const group = new THREE.Group();
    const bodyMat = this.assets.createToonMaterial(`mat-rex-body-${options.bodyColor}`, {
      color: options.bodyColor,
    });
    const bellyMat = this.assets.createToonMaterial(`mat-rex-belly-${options.bellyColor}`, {
      color: options.bellyColor,
    });
    const whiteMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#111827' });

    // Chunky upright torso
    const torso = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.3, 1.55, 1.5), bodyMat, {
      outlineScale: 1.045,
    });
    torso.position.set(0, 1.75, 0);
    torso.rotation.x = 0.12;
    group.add(torso);

    // Cream belly patch
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.14), bellyMat);
    belly.position.set(0, 1.68, 0.74);
    belly.rotation.x = 0.12;
    group.add(belly);

    // Two chunky stomping legs + dino feet
    for (const lx of [-0.42, 0.42]) {
      const leg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.46, 0.95, 0.52), bodyMat, {
        outlineScale: 1.06,
      });
      leg.position.set(lx, 0.56, -0.05);
      group.add(leg);

      const foot = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.5, 0.24, 0.78), bodyMat, {
        outlineScale: 1.06,
      });
      foot.position.set(lx, 0.12, 0.18);
      group.add(foot);
    }

    // Hilarious tiny stubby T-Rex arms!
    for (const ax of [-0.66, 0.66]) {
      const arm = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.22, 0.2, 0.54), bodyMat, {
        outlineScale: 1.08,
      });
      arm.position.set(ax, 2.02, 0.78);
      arm.rotation.x = 0.35;
      group.add(arm);
    }

    // Optional corporate necktie!
    if (options.tieColor) {
      const tieMat = this.assets.createToonMaterial(`mat-rex-tie-${options.tieColor}`, {
        color: options.tieColor,
      });
      const knot = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.26, 0.22, 0.14), tieMat, {
        outlineScale: 1.08,
      });
      knot.position.set(0, 2.38, 0.84);
      group.add(knot);
      const blade = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.18, 0.92, 4), tieMat, {
        outlineScale: 1.06,
      });
      blade.rotation.z = Math.PI;
      blade.position.set(0, 1.84, 0.86);
      group.add(blade);
    }

    // Optional tiny leather briefcase or oversized coffee cup held in tiny arm!
    if (options.prop === 'briefcase') {
      const caseMat = this.assets.createToonMaterial('mat-rex-briefcase', { color: '#6D4325' });
      const brief = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.58, 0.42, 0.18), caseMat, {
        outlineScale: 1.06,
      });
      brief.position.set(0.75, 1.65, 1.04);
      group.add(brief);
    } else if (options.prop === 'coffee') {
      const cupMat = this.assets.createToonMaterial('mat-rex-cup', { color: '#F5EFE6' });
      const lidMat = this.assets.createToonMaterial('mat-rex-lid', { color: '#1F2937' });
      const cup = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.19, 0.14, 0.44, 10), cupMat, {
        outlineScale: 1.07,
      });
      cup.position.set(-0.75, 1.98, 1.06);
      group.add(cup);
      const lid = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 10), lidMat, {
        outlineScale: 1.08,
      });
      lid.position.set(-0.75, 2.22, 1.06);
      group.add(lid);
    }

    // Swinging tail pivot
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.32, -0.72);
    const tail1 = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.75, 0.72, 1.25), bodyMat, {
      outlineScale: 1.05,
    });
    tail1.position.set(0, -0.05, -0.58);
    tailPivot.add(tail1);
    const tail2 = this.assets.createOutlinedMesh(new THREE.ConeGeometry(0.38, 1.25, 6), bodyMat, {
      outlineScale: 1.06,
    });
    tail2.rotation.x = -Math.PI / 2;
    tail2.position.set(0, -0.1, -1.65);
    tailPivot.add(tail2);
    group.add(tailPivot);

    // Big expressive head pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 2.68, 0.45);

    const skull = this.assets.createOutlinedMesh(new THREE.BoxGeometry(1.16, 0.92, 1.48), bodyMat, {
      outlineScale: 1.045,
    });
    skull.position.set(0, 0.35, 0.42);
    headPivot.add(skull);

    // Expressive big cartoon eyes on both sides + front edge so visible from any angle
    for (const ex of [-0.52, 0.52]) {
      const eye = this.assets.createOutlinedMesh(new THREE.SphereGeometry(0.24, 10, 8), whiteMat, {
        outlineScale: 1.09,
        castShadow: false,
      });
      eye.position.set(ex, 0.56, 0.68);
      headPivot.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), pupilMat);
      pupil.position.set(ex * 1.15, 0.56, 0.85);
      headPivot.add(pupil);
    }

    // Upper cute blocky white teeth
    for (const tx of [-0.36, -0.12, 0.12, 0.36]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), whiteMat);
      tooth.position.set(tx, -0.14, 0.98);
      headPivot.add(tooth);
    }

    // Hinged lower jaw pivot
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.05, 0.15);
    const jaw = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.96, 0.28, 1.16), bellyMat, {
      outlineScale: 1.05,
    });
    jaw.position.set(0, -0.16, 0.48);
    jawPivot.add(jaw);
    headPivot.add(jawPivot);

    // Optional tall black gentleman top hat!
    if (options.topHat) {
      const hatMat = this.assets.createToonMaterial('mat-rex-tophat', { color: '#1F242D' });
      const bandMat = this.assets.createToonMaterial('mat-rex-hatband', { color: '#E03B2E' });
      const brim = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.76, 0.76, 0.1, 14), hatMat, {
        outlineScale: 1.06,
      });
      brim.position.set(0, 0.86, 0.32);
      headPivot.add(brim);
      const crown = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.5, 0.46, 0.82, 14), hatMat, {
        outlineScale: 1.05,
      });
      crown.position.set(0, 1.28, 0.32);
      headPivot.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.48, 0.14, 14), bandMat);
      band.position.set(0, 0.98, 0.32);
      headPivot.add(band);
    }

    group.add(headPivot);
    group.scale.setScalar(options.scale);
    return { group, headPivot, jawPivot, tailPivot };
  }

  private buildTimePortal(): { group: THREE.Group; vortex: THREE.Mesh } {
    const group = new THREE.Group();
    const brassMat = this.assets.createToonMaterial('mat-portal-brass', { color: '#D99B2B' });
    const steelMat = this.assets.createToonMaterial('mat-portal-steel', { color: '#39475A' });

    // Portal base platform
    const pad = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(1.45, 1.65, 0.28, 12), steelMat, {
      outlineScale: 1.04,
    });
    pad.position.y = 0.14;
    group.add(pad);

    // Outer metallic ring
    const ring = this.assets.createOutlinedMesh(new THREE.TorusGeometry(1.45, 0.2, 10, 22), brassMat, {
      outlineScale: 1.05,
    });
    ring.position.y = 1.72;
    group.add(ring);

    // Swirling glowing cyan-teal portal vortex canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, '#5EF2FF');
    grad.addColorStop(0.7, '#06B6D4');
    grad.addColorStop(1, '#0F4C81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      for (let r = 12; r < 118; r += 6) {
        const a = a0 + r * 0.045;
        const x = 128 + Math.cos(a) * r;
        const y = 128 + Math.sin(a) * r;
        if (r === 12) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const vortex = new THREE.Mesh(
      new THREE.CircleGeometry(1.36, 24),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    vortex.position.y = 1.72;
    group.add(vortex);

    return { group, vortex };
  }

  private buildJungleZone(): void {
    const zone = new THREE.Group();
    this.jungleZone = zone;

    // Vibrant emerald prehistoric meadow floor
    const grassMat = this.assets.createToonMaterial('mat-dino-grass', { color: '#52B448' });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    zone.add(ground);

    // Sparkling turquoise prehistoric river cutting behind the actors
    const waterMat = new THREE.MeshBasicMaterial({ color: '#38D4E8' });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(90, 3.6), waterMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.03, -5.8);
    zone.add(river);

    // Sandy dirt clearing where characters & T-Rex meet
    const clearMat = this.assets.createToonMaterial('mat-dino-clear', { color: '#C9B176' });
    const clearing = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24), clearMat);
    clearing.rotation.x = -Math.PI / 2;
    clearing.position.set(0, 0.02, 1.0);
    clearing.receiveShadow = true;
    zone.add(clearing);

    // Towering bold-outlined low-poly palm trees & giant ferns framing left & right
    const trunkMat = this.assets.createToonMaterial('mat-palm-trunk', { color: '#7D512C' });
    const frondMat = this.assets.createToonMaterial('mat-palm-frond', { color: '#2F8F36' });
    const fernMat = this.assets.createToonMaterial('mat-fern', { color: '#3CA842' });

    const palmCoords: [number, number, number][] = [
      [-6.5, 2.2, 1.1],
      [-7.4, -2.8, 1.25],
      [-5.6, -9.2, 1.3],
      [6.4, 2.4, 1.15],
      [7.2, -2.5, 1.2],
      [5.8, -9.0, 1.3],
    ];
    for (const [px, pz, ps] of palmCoords) {
      const palm = new THREE.Group();
      const trunk = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.18, 0.34, 4.6, 7), trunkMat, {
        outlineScale: 1.06,
      });
      trunk.position.y = 2.3;
      trunk.rotation.z = px < 0 ? -0.1 : 0.1;
      palm.add(trunk);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const frond = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.55, 0.14, 2.3), frondMat, {
          outlineScale: 1.06,
        });
        frond.position.set(Math.sin(a) * 1.05, 4.5, Math.cos(a) * 1.05);
        frond.rotation.y = a;
        frond.rotation.x = 0.35;
        palm.add(frond);
      }

      // Giant fern bush at base
      const fern = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(0.95, 0), fernMat, {
        outlineScale: 1.05,
      });
      fern.position.set(0.6 * (px < 0 ? 1 : -1), 0.55, 0.5);
      fern.scale.set(1.2, 0.7, 1.2);
      palm.add(fern);

      palm.position.set(px, 0, pz);
      palm.scale.setScalar(ps);
      zone.add(palm);
    }

    // Dramatic Smoking Prehistoric Volcano on the horizon
    const volcano = new THREE.Group();
    const volMat = this.assets.createToonMaterial('mat-volcano', { color: '#4E4754' });
    const lavaMat = new THREE.MeshBasicMaterial({ color: '#FF6A1A' });
    const cone = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(2.1, 8.8, 12.2, 9), volMat, {
      outlineScale: 1.025,
      castShadow: false,
    });
    cone.position.y = 6.0;
    volcano.add(cone);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.1, 0.6, 10), lavaMat);
    rim.position.y = 12.1;
    volcano.add(rim);

    // Rising volcano cartoon smoke puffs
    const smokeMat = this.assets.createToonMaterial('mat-volc-smoke', { color: '#DCE3EA' });
    for (let i = 0; i < 5; i++) {
      const puff = this.assets.createOutlinedMesh(new THREE.IcosahedronGeometry(1.2 + i * 0.25, 1), smokeMat, {
        outlineScale: 1.05,
        castShadow: false,
      });
      puff.position.set((i - 2) * 0.65, 13.6 + i * 1.4, 0);
      volcano.add(puff);
      this.volcanoSmokePuffs.push(puff);
    }

    // Erupting glowing lava boulders (shown when volcanoErupting = true)
    const lavaGroup = new THREE.Group();
    const boulderMat = new THREE.MeshBasicMaterial({ color: '#FF8C1A' });
    for (let i = 0; i < 10; i++) {
      const b = this.assets.createOutlinedMesh(new THREE.DodecahedronGeometry(0.55, 0), boulderMat, {
        outlineScale: 1.08,
        castShadow: false,
      });
      lavaGroup.add(b);
      this.lavaBoulders.push({
        mesh: b,
        angle: (i / 10) * Math.PI * 2,
        speed: 1.1 + (i % 3) * 0.35,
        phase: (i / 10) * Math.PI * 2,
      });
    }
    lavaGroup.visible = false;
    volcano.add(lavaGroup);
    this.lavaBouldersGroup = lavaGroup;

    volcano.position.set(0.5, 0, -21.0);
    zone.add(volcano);

    // Glowing Swirling Cyan Time Machine Portal
    const portal = this.buildTimePortal();
    portal.group.position.set(-3.1, 0, -1.0);
    portal.group.rotation.y = 0.45;
    this.junglePortalGroup = portal.group;
    this.junglePortalVortex = portal.vortex;
    zone.add(portal.group);

    // Crisp "RULE #1: TOUCH NOTHING!" signboard (posts STRICTLY BEHIND board at z = -0.18!)
    const signGroup = new THREE.Group();
    const postMat = this.assets.createToonMaterial('mat-rule-post', { color: '#5A3A1E' });
    for (const px of [-1.05, 1.05]) {
      const post = this.assets.createOutlinedMesh(new THREE.CylinderGeometry(0.08, 0.09, 2.7, 8), postMat, {
        outlineScale: 1.08,
      });
      post.position.set(px, 1.35, -0.18);
      signGroup.add(post);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(0, 0, 640, 420);
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#DC2626';
    ctx.strokeRect(11, 11, 618, 398);

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(22, 22, 596, 108);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 46px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIME TRAVEL RULE #1', 320, 76);

    ctx.fillStyle = '#111827';
    ctx.font = '900 72px "Arial Black", sans-serif';
    ctx.fillText('TOUCH', 320, 215);
    ctx.fillStyle = '#DC2626';
    ctx.fillText('NOTHING!', 320, 318);

    const signTex = new THREE.CanvasTexture(canvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: signTex });
    const backMat = this.assets.createToonMaterial('mat-rule-back', { color: '#7A4F2B' });

    const board = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(2.8, 1.85, 0.14),
      [backMat, backMat, backMat, backMat, faceMat, backMat] as unknown as THREE.Material,
      { outlineScale: 1.035 }
    );
    board.position.set(0, 2.25, 0);
    signGroup.add(board);
    signGroup.position.set(0.0, 0, -2.1);
    signGroup.rotation.y = 0;
    signGroup.visible = false;
    this.ruleSignGroup = signGroup;
    zone.add(signGroup);

    // Oversized Glowing Dropped Smartphone Prop on ground!
    const phoneGroup = new THREE.Group();
    const caseMat = this.assets.createToonMaterial('mat-phone-case', { color: '#1F2937' });
    const screenMat = new THREE.MeshBasicMaterial({ color: '#53F3FF' });
    const body = this.assets.createOutlinedMesh(new THREE.BoxGeometry(0.46, 0.09, 0.82), caseMat, {
      outlineScale: 1.08,
    });
    phoneGroup.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.68), screenMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.052;
    phoneGroup.add(screen);

    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 20),
      new THREE.MeshBasicMaterial({ color: '#FDE047', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.02;
    phoneGroup.add(glowRing);
    this.phoneGlowRing = glowRing;

    phoneGroup.position.set(0.35, 0.07, 1.85);
    phoneGroup.rotation.y = 0.35;
    phoneGroup.visible = false;
    this.phoneGroup = phoneGroup;
    zone.add(phoneGroup);

    // Adorable Expressive Bold-Outlined 3D Green T-Rex!
    const rex = this.buildCartoonTRex({
      scale: 0.96,
      bodyColor: '#48B546',
      bellyColor: '#D6F09B',
    });
    rex.group.position.set(2.6, 0, 1.35);
    rex.group.rotation.y = -1.12;
    this.jungleRexGroup = rex.group;
    this.jungleRexHeadPivot = rex.headPivot;
    this.jungleRexJawPivot = rex.jawPivot;
    this.jungleRexTailPivot = rex.tailPivot;
    zone.add(rex.group);

    this.root.add(zone);
  }

  private buildDinoCityZone(): void {
    const zone = new THREE.Group();
    zone.visible = false;
    this.dinoCityZone = zone;

    // Clean bright modern city avenue with zebra crosswalk
    const roadMat = this.assets.createToonMaterial('mat-dcity-road', { color: '#69707A' });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 52), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    zone.add(road);

    const walkMat = this.assets.createToonMaterial('mat-dcity-walk', { color: '#D3CFC4' });
    for (const sx of [-8.2, 8.2]) {
      const sw = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.4, 0.22, 52), walkMat, {
        outlineScale: 1.008,
        castShadow: false,
      });
      sw.position.set(sx, 0.08, 0);
      zone.add(sw);
    }

    // Crisp white crosswalk stripes
    const stripeMat = this.assets.createToonMaterial('mat-dcity-zebra', { color: '#F9FAFB' });
    for (let x = -4.6; x <= 4.6; x += 1.55) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 3.0), stripeMat);
      stripe.position.set(x, 0.02, 2.8);
      zone.add(stripe);
    }

    // Pastel corporate towers framing the avenue
    const bColors = ['#B8D4E8', '#E9CFA4', '#C4DEB8', '#E2B8A6'];
    const winMat = this.assets.createToonMaterial('mat-dcity-win', { color: '#39526D' });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const bz = 10 - i * 7.2;
        const h = 9.5 + (i % 3) * 2.4;
        const bMat = this.assets.createToonMaterial(`mat-dcity-b-${i % 4}`, { color: bColors[i % 4] });
        const bldg = this.assets.createOutlinedMesh(new THREE.BoxGeometry(4.6, h, 6.2), bMat, {
          outlineScale: 1.02,
        });
        bldg.position.set(side * 10.4, h * 0.5, bz);
        zone.add(bldg);

        for (let r = 0; r < 4; r++) {
          for (const wz of [-1.5, 0, 1.5]) {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.85), winMat);
            w.position.set(side * 8.05, 2.6 + r * 2.0, bz + wz);
            zone.add(w);
          }
        }
      }
    }

    // Monumental Center Skyscraper with "REX CORP HQ" rooftop billboard!
    const hqMat = this.assets.createToonMaterial('mat-dcity-hq', { color: '#E8EEF5' });
    const hq = this.assets.createOutlinedMesh(new THREE.BoxGeometry(10.5, 16.0, 6.5), hqMat, {
      outlineScale: 1.02,
    });
    hq.position.set(0, 8.0, -21.0);
    zone.add(hq);

    const billCanvas = document.createElement('canvas');
    billCanvas.width = 768;
    billCanvas.height = 256;
    const bctx = billCanvas.getContext('2d')!;
    bctx.fillStyle = '#14532D';
    bctx.fillRect(0, 0, 768, 256);
    bctx.lineWidth = 18;
    bctx.strokeStyle = '#FACC15';
    bctx.strokeRect(9, 9, 750, 238);
    bctx.fillStyle = '#FFFFFF';
    bctx.font = '900 84px "Arial Black", sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('REX CORP HQ', 384, 102);
    bctx.fillStyle = '#FDE047';
    bctx.font = '800 38px "Arial", sans-serif';
    bctx.fillText('HUMANS: UNPAID INTERNS ONLY', 384, 192);

    const billTex = new THREE.CanvasTexture(billCanvas);
    billTex.colorSpace = THREE.SRGBColorSpace;
    const billFace = new THREE.MeshBasicMaterial({ map: billTex });
    const billBack = this.assets.createToonMaterial('mat-bill-back', { color: '#14532D' });
    const billBoard = this.assets.createOutlinedMesh(
      new THREE.BoxGeometry(9.2, 3.1, 0.3),
      [billBack, billBack, billBack, billBack, billFace, billBack] as unknown as THREE.Material,
      { outlineScale: 1.03, castShadow: false }
    );
    billBoard.position.set(0, 12.0, -17.5);
    zone.add(billBoard);

    // 3 Giant Corporate 3D T-Rexes wearing Tiny Neckties & Top Hats!
    const dinosGroup = new THREE.Group();

    const ceoRex = this.buildCartoonTRex({
      scale: 1.36,
      bodyColor: '#3BA846',
      bellyColor: '#D6F09B',
      tieColor: '#E03127',
      topHat: true,
      prop: 'none',
    });
    ceoRex.group.position.set(0, 0, -2.6);
    ceoRex.group.rotation.y = 0.04;
    dinosGroup.add(ceoRex.group);
    this.businessDinoRefs.push({ group: ceoRex.group, jaw: ceoRex.jawPivot, phase: 0 });

    const leftRex = this.buildCartoonTRex({
      scale: 1.06,
      bodyColor: '#56B847',
      bellyColor: '#E1F2A8',
      tieColor: '#2563EB',
      topHat: true,
      prop: 'briefcase',
    });
    leftRex.group.position.set(-3.7, 0, -0.8);
    leftRex.group.rotation.y = 0.45;
    dinosGroup.add(leftRex.group);
    this.businessDinoRefs.push({ group: leftRex.group, jaw: leftRex.jawPivot, phase: 1.7 });

    const rightRex = this.buildCartoonTRex({
      scale: 1.06,
      bodyColor: '#2E9B52',
      bellyColor: '#CBEFA2',
      tieColor: '#EAB308',
      topHat: true,
      prop: 'coffee',
    });
    rightRex.group.position.set(3.7, 0, -1.0);
    rightRex.group.rotation.y = -0.45;
    dinosGroup.add(rightRex.group);
    this.businessDinoRefs.push({ group: rightRex.group, jaw: rightRex.jawPivot, phase: 3.1 });

    this.businessDinosGroup = dinosGroup;
    zone.add(dinosGroup);

    // Escape Time Portal on the altered city street
    const cityPortal = this.buildTimePortal();
    cityPortal.group.position.set(-2.9, 0, 2.5);
    cityPortal.group.rotation.y = 0.52;
    this.cityPortalGroup = cityPortal.group;
    this.cityPortalVortex = cityPortal.vortex;
    zone.add(cityPortal.group);

    this.root.add(zone);
  }

  public update(env: EnvironmentState, globalSeconds: number): void {
    const active = env.worldTheme === 'dino_time';
    this.root.visible = active;
    if (!active) return;

    const dino = env.dinoState ?? {
      zone: 'jungle' as const,
      portalActive: true,
      dinoCuriosity: false,
      phoneOnGround: false,
      volcanoErupting: false,
      showRuleSign: false,
      businessDinosActive: false,
    };

    const isCity = dino.zone === 'dino_city';
    this.jungleZone.visible = !isCity;
    this.dinoCityZone.visible = isCity;

    // Spin active time portal vortexes
    this.junglePortalGroup.visible = !isCity && dino.portalActive;
    this.cityPortalGroup.visible = isCity && dino.portalActive;
    this.junglePortalVortex.rotation.z = -globalSeconds * 2.8;
    this.cityPortalVortex.rotation.z = -globalSeconds * 2.8;

    if (!isCity) {
      // Volcano rising cartoon smoke
      for (let i = 0; i < this.volcanoSmokePuffs.length; i++) {
        const p = this.volcanoSmokePuffs[i];
        const rise = (globalSeconds * 0.7 + i * 0.25) % 1.0;
        p.position.y = 13.0 + rise * 5.2;
        p.position.x = Math.sin(globalSeconds * 1.1 + i) * 0.8 + (i - 2) * 0.45;
        p.scale.setScalar(0.85 + rise * 0.55);
      }

      // Erupting volcano lava boulders
      this.lavaBouldersGroup.visible = dino.volcanoErupting;
      if (dino.volcanoErupting) {
        for (const b of this.lavaBoulders) {
          const u = (globalSeconds * b.speed + b.phase) % 1.0;
          const r = 1.4 + u * 5.5;
          const y = 12.2 + Math.sin(u * Math.PI) * 5.4 - u * u * 3.5;
          b.mesh.position.set(Math.cos(b.angle) * r, y, Math.sin(b.angle) * r);
          b.mesh.rotation.set(globalSeconds * 4, globalSeconds * 3, b.phase);
        }
      }

      // Dropped smartphone & glowing ping ring
      this.phoneGroup.visible = dino.phoneOnGround;
      if (dino.phoneOnGround) {
        const s = 1.0 + Math.sin(globalSeconds * 7) * 0.25;
        this.phoneGlowRing.scale.set(s, s, 1);
      }

      // Rule #1 signboard
      this.ruleSignGroup.visible = dino.showRuleSign;

      // Expressive Jungle T-Rex animation (curious lean & chomp toward phone!)
      this.jungleRexTailPivot.rotation.y = Math.sin(globalSeconds * 3.2) * 0.28;
      if (dino.dinoCuriosity) {
        this.jungleRexGroup.position.set(1.75, Math.abs(Math.sin(globalSeconds * 5.5)) * 0.08, 1.55);
        this.jungleRexHeadPivot.rotation.x = 0.55 + Math.sin(globalSeconds * 6.0) * 0.14;
        this.jungleRexJawPivot.rotation.x = 0.18 + Math.abs(Math.sin(globalSeconds * 7.0)) * 0.28;
      } else {
        this.jungleRexGroup.position.set(2.75, 0, 1.2);
        this.jungleRexHeadPivot.rotation.x = Math.sin(globalSeconds * 2.4) * 0.12;
        this.jungleRexJawPivot.rotation.x = 0.08 + Math.max(0, Math.sin(globalSeconds * 3.5)) * 0.22;
      }
    } else {
      // Altered Dino City corporate T-Rexes bobbing & chattering over tiny humans!
      this.businessDinosGroup.visible = dino.businessDinosActive;
      for (const ref of this.businessDinoRefs) {
        ref.group.position.y = Math.abs(Math.sin(globalSeconds * 3.8 + ref.phase)) * 0.1;
        ref.jaw.rotation.x = 0.1 + Math.abs(Math.sin(globalSeconds * 6.2 + ref.phase)) * 0.24;
      }
    }
  }
}
