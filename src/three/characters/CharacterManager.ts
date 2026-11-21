import * as THREE from 'three';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import {
  CharacterBeat,
  CharacterId,
  Expression,
  Outfit,
  Pose,
} from '../../services/scripting/schema.js';
import { clamp, easeInOutCubic, lerp } from '../../utils/math.js';

interface CharacterVisualProfile {
  id: CharacterId;
  torsoColor: string;
  torsoShade: string;
  hairStyle: 'spiky' | 'bun' | 'pigtails' | 'sleek' | 'short_round' | 'sailor_beanie' | 'curly_bob';
  hairColor: string;
  striped?: boolean;
  hasPocket?: boolean;
  isKid?: boolean;
  hasGoldButtons?: boolean;
}

const CHARACTER_PROFILES: Record<CharacterId, CharacterVisualProfile> = {
  sam: {
    id: 'sam',
    torsoColor: STYLE_TOKENS.colors.charSamTorso,
    torsoShade: STYLE_TOKENS.colors.charSamShade,
    hairStyle: 'spiky',
    hairColor: '#1E1A18',
    hasPocket: true,
  },
  sam_kid: {
    id: 'sam_kid',
    torsoColor: '#7E97B2',
    torsoShade: '#5C7490',
    hairStyle: 'spiky',
    hairColor: '#1E1A18',
    isKid: true,
  },
  maya: {
    id: 'maya',
    torsoColor: STYLE_TOKENS.colors.charMayaTorso,
    torsoShade: STYLE_TOKENS.colors.charMayaShade,
    hairStyle: 'bun',
    hairColor: '#693B1D',
  },
  maya_kid: {
    id: 'maya_kid',
    torsoColor: '#FFFFFF',
    torsoShade: '#2C8A4B',
    hairStyle: 'pigtails',
    hairColor: '#693B1D',
    striped: true,
    isKid: true,
  },
  leo: {
    id: 'leo',
    torsoColor: STYLE_TOKENS.colors.charLeoTorso,
    torsoShade: STYLE_TOKENS.colors.charLeoShade,
    hairStyle: 'sleek',
    hairColor: '#1C1B1A',
  },
  leo_kid: {
    id: 'leo_kid',
    torsoColor: '#FFFFFF',
    torsoShade: '#D99B38',
    hairStyle: 'short_round',
    hairColor: '#1C1B1A',
    striped: true,
    isKid: true,
  },
  // Coastal Harbor Community cast (same iconic stickman style, all-new community & outfits!)
  finn: {
    id: 'finn',
    torsoColor: '#E8B828',
    torsoShade: '#C49514',
    hairStyle: 'spiky',
    hairColor: '#4A311C',
    hasPocket: true,
  },
  finn_mate: {
    id: 'finn_mate',
    torsoColor: '#F3D66D',
    torsoShade: '#CFAF46',
    hairStyle: 'short_round',
    hairColor: '#4A311C',
    isKid: true,
  },
  cora: {
    id: 'cora',
    torsoColor: '#FFFFFF',
    torsoShade: '#D9483B',
    hairStyle: 'sailor_beanie',
    hairColor: '#2B221E',
    striped: true,
  },
  cora_mate: {
    id: 'cora_mate',
    torsoColor: '#E86A5A',
    torsoShade: '#C14A3B',
    hairStyle: 'curly_bob',
    hairColor: '#2B221E',
    isKid: true,
  },
  kai: {
    id: 'kai',
    torsoColor: '#1E467A',
    torsoShade: '#133057',
    hairStyle: 'sleek',
    hairColor: '#1E1D1C',
    hasGoldButtons: true,
  },
  kai_mate: {
    id: 'kai_mate',
    torsoColor: '#FFFFFF',
    torsoShade: '#2A6BB3',
    hairStyle: 'short_round',
    hairColor: '#1E1D1C',
    striped: true,
    isKid: true,
  },
  // Multi-location City Experiment cast (matching RnS8S-d2aOI comedic archetypes!)
  mayor: {
    id: 'mayor',
    torsoColor: '#F2EEE6',
    torsoShade: '#D6D0C4',
    hairStyle: 'sleek',
    hairColor: '#1E1A18',
    hasGoldButtons: true,
  },
  alex: {
    id: 'alex',
    torsoColor: '#364A63',
    torsoShade: '#25354A',
    hairStyle: 'spiky',
    hairColor: '#4A2F1B',
    hasPocket: true,
  },
  chloe: {
    id: 'chloe',
    torsoColor: '#2B8E4C',
    torsoShade: '#1D6A37',
    hairStyle: 'bun',
    hairColor: '#B53D1E',
  },
  granny: {
    id: 'granny',
    torsoColor: '#8B5EA8',
    torsoShade: '#694384',
    hairStyle: 'bun',
    hairColor: '#B5BAC0',
  },
  worker: {
    id: 'worker',
    torsoColor: '#2A62A8',
    torsoShade: '#1C477D',
    hairStyle: 'short_round',
    hairColor: '#2B221C',
    striped: true,
  },
  chef: {
    id: 'chef',
    torsoColor: '#FFFFFF',
    torsoShade: '#DCE2E8',
    hairStyle: 'short_round',
    hairColor: '#3B281B',
    hasGoldButtons: true,
  },
};

interface CharacterRig {
  id: CharacterId;
  profile: CharacterVisualProfile;
  group: THREE.Group;
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  lastRenderKey: string;
  worldPos: THREE.Vector3;
}

/**
 * Renders expressive 2D-in-3D cel-shaded stickman characters directly onto high-DPI
 * textured 3D planes with real silhouette castShadow depth materials.
 */
export class CharacterManager {
  private readonly rigs = new Map<CharacterId, CharacterRig>();
  private readonly root = new THREE.Group();

  /** Character outline colour: near-black (cel) or warm dark brown (storytime reference look) */
  private ink: string = STYLE_TOKENS.colors.inkOutline;

  constructor(scene: THREE.Scene, opts: { inkColor?: string } = {}) {
    if (opts.inkColor) this.ink = opts.inkColor;
    this.root.name = 'CharactersRoot';
    scene.add(this.root);

    const ids: CharacterId[] = [
      'sam',
      'sam_kid',
      'maya',
      'maya_kid',
      'leo',
      'leo_kid',
      'finn',
      'finn_mate',
      'cora',
      'cora_mate',
      'kai',
      'kai_mate',
      'mayor',
      'alex',
      'chloe',
      'granny',
      'worker',
      'chef',
    ];
    for (const id of ids) {
      this.rigs.set(id, this.createRig(CHARACTER_PROFILES[id]));
    }
  }

  private createRig(profile: CharacterVisualProfile): CharacterRig {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // 1.9m wide x 2.85m tall billboard plane anchored cleanly at feet (y = 0)
    const planeGeo = new THREE.PlaneGeometry(1.9, 2.85);
    planeGeo.translate(0, 1.425, 0);

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    // Silhouette-accurate shadow caster for transparent 2D-in-3D character!
    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: texture,
      alphaTest: 0.35,
    });
    mesh.customDepthMaterial = depthMat;

    const group = new THREE.Group();
    group.add(mesh);
    group.visible = false;
    this.root.add(group);

    return {
      id: profile.id,
      profile,
      group,
      mesh,
      canvas,
      ctx,
      texture,
      lastRenderKey: '',
      worldPos: new THREE.Vector3(),
    };
  }

  public update(
    beats: CharacterBeat[],
    sceneProgress: number,
    globalSeconds: number,
    cameraPosition: THREE.Vector3,
    samRunningLoop: boolean,
    v3: { sceneDurationSeconds?: number; speaker?: CharacterId; talking?: boolean; mouthLevel?: number } = {}
  ): void {
    const activeIds = new Set<CharacterId>();
    const sceneDur = Math.max(0.1, v3.sceneDurationSeconds ?? 3);

    for (const beat of beats) {
      const rig = this.rigs.get(beat.characterId);
      if (!rig) continue;
      activeIds.add(beat.characterId);

      rig.group.visible = beat.visible;
      if (!beat.visible) continue;

      // Interpolate world position deterministically
      let px = beat.position[0];
      let py = beat.position[1];
      let pz = beat.position[2];

      if (beat.endPosition) {
        const ms = beat.moveStartRatio ?? 0;
        const me = beat.moveEndRatio ?? 1;
        const mt = easeInOutCubic(clamp((sceneProgress - ms) / Math.max(0.001, me - ms), 0, 1));
        px = lerp(beat.position[0], beat.endPosition[0], mt);
        py = lerp(beat.position[1], beat.endPosition[1], mt);
        pz = lerp(beat.position[2], beat.endPosition[2], mt);
      }

      // Energetic sprint loop for Sam in Scene 4
      let stridePhase = 0;
      if (samRunningLoop && beat.characterId === 'sam') {
        const cycle = (globalSeconds * 1.45) % 1;
        const triangle = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
        px = lerp(-3.1, -0.4, easeInOutCubic(triangle));
        py = Math.abs(Math.sin(globalSeconds * 16)) * 0.14;
        stridePhase = globalSeconds * 16;
      } else if (beat.endPosition && beat.moveStartRatio !== undefined && beat.moveEndRatio !== undefined) {
        const moving = sceneProgress >= beat.moveStartRatio && sceneProgress <= beat.moveEndRatio;
        if (moving) {
          py += Math.abs(Math.sin(globalSeconds * 11)) * 0.08;
          stridePhase = globalSeconds * 11;
        }
      }

      // V3 squash-and-stretch pop: seconds since the latest expression/pose/outfit switch
      let sinceSwitch = Infinity;
      for (const ratio of [beat.expressionSwitchRatio, beat.poseSwitchRatio, beat.outfitSwitchRatio]) {
        if (ratio !== undefined && sceneProgress >= ratio) {
          sinceSwitch = Math.min(sinceSwitch, (sceneProgress - ratio) * sceneDur);
        }
      }
      const bigReaction =
        (beat.secondaryExpression === 'surprised' || beat.secondaryExpression === 'excited' || beat.secondaryPose === 'celebrating');
      const popAmp = bigReaction ? 0.28 : 0.18;
      const squash = Number.isFinite(sinceSwitch)
        ? popAmp * Math.exp(-sinceSwitch * 8) * Math.cos(sinceSwitch * 22)
        : 0;
      // Anticipation hop on big reactions (small jump with overshoot)
      const hop = Number.isFinite(sinceSwitch) && bigReaction
        ? 0.32 * Math.exp(-sinceSwitch * 9) * Math.abs(Math.sin(sinceSwitch * 14))
        : 0;

      // Subtle breathing bob so characters always feel alive
      const breatheBob = Math.sin(globalSeconds * 3.4 + beat.characterId.length * 1.7) * 0.025;
      rig.group.position.set(px, py + Math.max(0, breatheBob) + hop, pz);
      rig.worldPos.set(px, py, pz);

      const scale = beat.scale ?? (rig.profile.isKid ? 0.68 : 1.0);
      rig.group.scale.set(scale * (1 + squash), scale * (1 + breatheBob * 0.35) * (1 - squash), scale);

      // Cylindrical Y-axis billboarding toward camera (keeps characters upright on terrain)
      const dx = cameraPosition.x - px;
      const dz = cameraPosition.z - pz;
      rig.group.rotation.set(0, Math.atan2(dx, dz), 0);

      // Resolve expression / pose / outfit transitions
      const expr: Expression =
        beat.secondaryExpression &&
        beat.expressionSwitchRatio !== undefined &&
        sceneProgress >= beat.expressionSwitchRatio
          ? beat.secondaryExpression
          : beat.expression;

      const pose: Pose =
        beat.secondaryPose &&
        beat.poseSwitchRatio !== undefined &&
        sceneProgress >= beat.poseSwitchRatio
          ? beat.secondaryPose
          : beat.pose;

      const outfit: Outfit =
        beat.secondaryOutfit &&
        beat.outfitSwitchRatio !== undefined &&
        sceneProgress >= beat.outfitSwitchRatio
          ? beat.secondaryOutfit
          : beat.outfit;

      // Deterministic periodic eye blink every ~3.4s
      const blinkCycle = (globalSeconds + beat.characterId.length * 0.65) % 3.4;
      const isBlinking = blinkCycle > 3.24 && expr !== 'happy' && expr !== 'excited' && expr !== 'peaceful';

      // Quantize animation phase for clean fast redraws only when visually changing
      const animStep = Math.floor(
        (pose === 'running_bucket' ||
        pose === 'building_pipe' ||
        pose === 'celebrating' ||
        pose === 'watering_can' ||
        stridePhase > 0
          ? globalSeconds * 12
          : globalSeconds * 4)
      );
      // V3 talking mouth. Preferred: lip-sync from the narration loudness envelope (3 openness levels,
      // closed below a noise floor so pauses and consonant gaps read as a closed mouth).
      // Fallback (no envelope): gentle ~5 Hz flap while a caption is on screen.
      const isSpeaker = v3.speaker === beat.characterId;
      let mouthOpen = -1;
      if (isSpeaker && v3.mouthLevel !== undefined) {
        const lvl = v3.mouthLevel;
        mouthOpen = lvl < 0.14 ? -1 : lvl < 0.4 ? 0.33 : lvl < 0.72 ? 0.66 : 1;
      } else if (isSpeaker && v3.talking) {
        mouthOpen = Math.round(Math.abs(Math.sin(globalSeconds * 15 + beat.characterId.length)) * 2) / 2;
      }
      const renderKey = `${expr}|${pose}|${outfit}|${beat.facing}|${isBlinking ? 1 : 0}|${animStep}|${mouthOpen.toFixed(2)}`;

      if (rig.lastRenderKey !== renderKey) {
        this.drawCharacter(rig, {
          expression: expr,
          pose,
          outfit,
          facing: beat.facing,
          isBlinking,
          time: globalSeconds,
          stridePhase,
          mouthOpen,
        });
        rig.texture.needsUpdate = true;
        rig.lastRenderKey = renderKey;
      }
    }

    for (const [id, rig] of this.rigs.entries()) {
      if (!activeIds.has(id)) {
        rig.group.visible = false;
      }
    }
  }

  public getHeadWorldPosition(id: CharacterId): [number, number, number] | null {
    const rig = this.rigs.get(id);
    if (!rig || !rig.group.visible) return null;
    const scale = rig.group.scale.x;
    return [rig.worldPos.x, rig.worldPos.y + 2.55 * scale, rig.worldPos.z];
  }

  private drawCharacter(
    rig: CharacterRig,
    state: {
      expression: Expression;
      pose: Pose;
      outfit: Outfit;
      facing: 'front' | 'left' | 'right';
      isBlinking: boolean;
      time: number;
      stridePhase: number;
      /** V3: -1 = not talking, 0..1 = mouth openness while speaking */
      mouthOpen?: number;
    }
  ): void {
    const { ctx, canvas, profile } = rig;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W * 0.5;
    const ink = this.ink;
    const slumpY = state.pose === 'slumped_tired' ? 28 : 0;
    const headY = 232 + slumpY;
    const headR = 110;
    const torsoTop = 342 + slumpY;
    const torsoH = 192;
    const torsoW = 128;
    const hipY = torsoTop + torsoH - 18;
    const footY = H - 24;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. LEGS (thin bold black stick limbs)
    const stride =
      state.pose === 'running_bucket' || state.stridePhase > 0
        ? Math.sin(state.stridePhase || state.time * 15) * 44
        : 0;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 17;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(cx - 28, hipY);
    if (stride !== 0) {
      ctx.quadraticCurveTo(cx - 32 + stride * 0.5, (hipY + footY) * 0.5, cx - 34 + stride, footY - Math.max(0, stride * 0.4));
    } else {
      ctx.lineTo(cx - 30, footY);
    }
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(cx + 28, hipY);
    if (stride !== 0) {
      ctx.quadraticCurveTo(cx + 32 - stride * 0.5, (hipY + footY) * 0.5, cx + 34 - stride, footY - Math.max(0, -stride * 0.4));
    } else {
      ctx.lineTo(cx + 30, footY);
    }
    ctx.stroke();

    // 2. BACK ARMS (for poses where arms extend behind/out from torso)
    this.drawArms(ctx, cx, torsoTop, torsoW, state, 'back');

    // 3. TORSO (rounded bean/pill shape with 2-tone cel shading)
    ctx.save();
    this.roundedPillPath(ctx, cx - torsoW * 0.5, torsoTop, torsoW, torsoH, 60);
    ctx.fillStyle = state.outfit === 'worker_vest' ? STYLE_TOKENS.colors.charSamTorso : profile.torsoColor;
    ctx.fill();

    // Clip interior for stripes / vest / cel shadow crescent
    ctx.save();
    ctx.clip();

    if (profile.striped) {
      ctx.fillStyle = profile.torsoShade;
      for (let sy = torsoTop + 18; sy < torsoTop + torsoH; sy += 34) {
        ctx.fillRect(cx - torsoW, sy, torsoW * 2, 16);
      }
    }

    if (state.outfit === 'worker_vest') {
      // Bright orange work apron matching the reference "hired worker" moment
      ctx.fillStyle = STYLE_TOKENS.colors.charApronOrange;
      ctx.fillRect(cx - 50, torsoTop + 42, 100, torsoH);
      // Apron straps
      ctx.strokeStyle = STYLE_TOKENS.colors.charApronOrange;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(cx - 34, torsoTop);
      ctx.lineTo(cx - 34, torsoTop + 48);
      ctx.moveTo(cx + 34, torsoTop);
      ctx.lineTo(cx + 34, torsoTop + 48);
      ctx.stroke();
      // Apron front pocket
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.fillStyle = '#D57812';
      ctx.fillRect(cx - 24, torsoTop + 98, 48, 34);
      ctx.strokeRect(cx - 24, torsoTop + 98, 48, 34);
    } else if (profile.id === 'leo' && state.outfit === 'straw_hat') {
      // Crisp white shirt + golden farmer vest lapels
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 24, torsoTop, 48, torsoH);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 24, torsoTop);
      ctx.lineTo(cx - 24, torsoTop + torsoH);
      ctx.moveTo(cx + 24, torsoTop);
      ctx.lineTo(cx + 24, torsoTop + torsoH);
      ctx.stroke();
    } else if (state.outfit === 'harbor_vest') {
      // Bright orange-teal Harbor Navigator safety vest
      ctx.fillStyle = '#FF6E26';
      ctx.fillRect(cx - 56, torsoTop + 16, 112, torsoH - 26);
      ctx.fillStyle = '#FFF5CC';
      ctx.fillRect(cx - 56, torsoTop + 72, 112, 18);
      ctx.fillRect(cx - 56, torsoTop + 114, 112, 18);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, torsoTop + 16);
      ctx.lineTo(cx, torsoTop + torsoH);
      ctx.stroke();
    } else if (state.outfit === 'mars_suit') {
      // Crisp bright orange Mars astronaut suit with white NASA-style chest badge!
      ctx.fillStyle = '#F26B2B';
      ctx.fillRect(cx - 64, torsoTop, 128, torsoH);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 28, torsoTop + 34, 56, 36);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.strokeRect(cx - 28, torsoTop + 34, 56, 36);
      ctx.fillStyle = '#2A78D4';
      ctx.beginPath();
      ctx.arc(cx, torsoTop + 52, 11, 0, Math.PI * 2);
      ctx.fill();
      // White space belt
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 64, torsoTop + 120, 128, 22);
      ctx.strokeRect(cx - 64, torsoTop + 120, 128, 22);
    } else if (state.outfit === 'lab_coat' || state.outfit === 'time_goggles') {
      // Crisp white scientist lab coat with lapels & chest pocket pen
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(cx - 64, torsoTop, 128, torsoH);
      ctx.fillStyle = '#3B6E9C';
      ctx.beginPath();
      ctx.moveTo(cx - 20, torsoTop);
      ctx.lineTo(cx + 20, torsoTop);
      ctx.lineTo(cx, torsoTop + 56);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, torsoTop + 56);
      ctx.lineTo(cx, torsoTop + torsoH);
      ctx.stroke();
    } else if (profile.hasGoldButtons) {
      // Navy harbor captain jacket with crisp white collar V and brass buttons
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx - 22, torsoTop);
      ctx.lineTo(cx + 22, torsoTop);
      ctx.lineTo(cx, torsoTop + 56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F2C14E';
      for (const by of [torsoTop + 78, torsoTop + 116]) {
        ctx.beginPath();
        ctx.arc(cx - 18, by, 7, 0, Math.PI * 2);
        ctx.arc(cx + 18, by, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Right-side curved cel shadow crescent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.beginPath();
    ctx.ellipse(cx + torsoW * 0.44, torsoTop + torsoH * 0.5, torsoW * 0.34, torsoH * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small chest pocket for Sam
    if (profile.hasPocket && state.outfit !== 'worker_vest') {
      ctx.fillStyle = '#7E9BB8';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.fillRect(cx + 10, torsoTop + 56, 30, 32);
      ctx.strokeRect(cx + 10, torsoTop + 56, 30, 32);
    }

    ctx.restore(); // end clip

    // Thick ink torso outline
    this.roundedPillPath(ctx, cx - torsoW * 0.5, torsoTop, torsoW, torsoH, 60);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.restore();

    // 4. HEAD (large circular white cel-shaded head)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = STYLE_TOKENS.colors.headWhite;
    ctx.fill();

    // Inner right-side crescent shadow
    ctx.save();
    ctx.clip();
    ctx.fillStyle = STYLE_TOKENS.colors.headShade;
    ctx.beginPath();
    ctx.arc(cx + 38, headY + 12, headR * 0.96, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = STYLE_TOKENS.colors.headWhite;
    ctx.beginPath();
    ctx.arc(cx - 14, headY - 6, headR * 0.96, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hair cap (clipped inside head for sleek/short styles)
    this.drawHair(ctx, cx, headY, headR, profile, state.outfit);

    // Head thick ink outline
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 11;
    ctx.stroke();

    // Straw farmer hat, sweatband, fisherman rain hat, or white captain cap
    if (state.outfit === 'straw_hat') {
      this.drawStrawHat(ctx, cx, headY - headR * 0.72, headR);
    } else if (state.outfit === 'sweatband') {
      this.drawSweatband(ctx, cx, headY - headR * 0.54, headR);
    } else if (state.outfit === 'rain_hat') {
      this.drawFishermanHat(ctx, cx, headY - headR * 0.72, headR);
    } else if (state.outfit === 'captain_hat') {
      this.drawCaptainCap(ctx, cx, headY - headR * 0.78, headR);
    } else if (state.outfit === 'sunglasses_hat') {
      this.drawBillionaireSunHat(ctx, cx, headY - headR * 0.74, headR);
    } else if (state.outfit === 'top_hat') {
      this.drawTopHat(ctx, cx, headY - headR * 0.78, headR);
    } else if (state.outfit === 'hard_hat') {
      this.drawHardHat(ctx, cx, headY - headR * 0.72, headR);
    } else if (state.outfit === 'chef_hat') {
      this.drawChefHat(ctx, cx, headY - headR * 0.78, headR);
    } else if (state.outfit === 'time_goggles') {
      this.drawTimeGoggles(ctx, cx, headY - headR * 0.62, headR);
    }

    // Optional translucent glass Mars helmet rim around head (keeps full expressive face 100% clear!)
    if (state.outfit === 'mars_suit') {
      ctx.save();
      ctx.strokeStyle = '#5CC8FF';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, headY, headR + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, headY, headR + 23, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. FACIAL EXPRESSION
    this.drawFace(ctx, cx, headY, state.expression, state.facing, state.isBlinking, state.mouthOpen ?? -1);

    // Optional stylish dark sunglasses overlay (exact RnS8S-d2aOI founder look!)
    if (state.outfit === 'sunglasses_hat' || state.outfit === 'cool_shades') {
      this.drawSunglasses(ctx, cx, headY - 4);
    }
    ctx.restore();

    // 6. FRONT ARMS & HELD PROPS (buckets, giant bucket, bamboo pipe, wrench)
    this.drawArms(ctx, cx, torsoTop, torsoW, state, 'front');

    ctx.restore();
  }

  private drawHair(
    ctx: CanvasRenderingContext2D,
    cx: number,
    headY: number,
    r: number,
    profile: CharacterVisualProfile,
    outfit: Outfit
  ): void {
    const ink = this.ink;
    ctx.fillStyle = profile.hairColor;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;

    if (profile.hairStyle === 'spiky') {
      const spikes = [-55, -24, 6, 36, 62];
      for (const deg of spikes) {
        const rad = ((deg - 90) * Math.PI) / 180;
        const bx1 = cx + Math.cos(rad - 0.16) * (r - 6);
        const by1 = headY + Math.sin(rad - 0.16) * (r - 6);
        const bx2 = cx + Math.cos(rad + 0.16) * (r - 6);
        const by2 = headY + Math.sin(rad + 0.16) * (r - 6);
        const tipX = cx + Math.cos(rad) * (r + 36);
        const tipY = headY + Math.sin(rad) * (r + 36);
        ctx.beginPath();
        ctx.moveTo(bx1, by1);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(bx2, by2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (profile.hairStyle === 'bun') {
      // Top bun behind/above forehead
      ctx.beginPath();
      ctx.arc(cx, headY - r - 24, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Parted top bangs inside head
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, headY, r - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(cx, headY - r * 0.78, r * 0.92, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (profile.hairStyle === 'pigtails') {
      ctx.beginPath();
      ctx.arc(cx - r - 12, headY - 22, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + r + 12, headY - 22, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, headY, r - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(cx, headY - r * 0.82, r * 0.9, r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (profile.hairStyle === 'sailor_beanie') {
      // Warm crimson fisherman knit beanie + side hair curls for Cora (separate subpaths!)
      ctx.fillStyle = profile.hairColor;
      ctx.beginPath();
      ctx.arc(cx - r + 4, headY - 12, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + r - 4, headY - 12, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#D93829';
      ctx.beginPath();
      ctx.arc(cx, headY - r * 0.56, r * 0.76, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Ribbed beanie cuff
      ctx.fillStyle = '#B8281C';
      ctx.beginPath();
      ctx.roundRect(cx - r * 0.84, headY - r * 0.72, r * 1.68, 28, 12);
      ctx.fill();
      ctx.stroke();
    } else if (profile.hairStyle === 'curly_bob') {
      ctx.fillStyle = profile.hairColor;
      for (const deg of [-68, -42, -16, 16, 42, 68]) {
        const rad = ((deg - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(rad) * (r - 2), headY + Math.sin(rad) * (r - 2), 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (outfit !== 'straw_hat' && outfit !== 'rain_hat' && outfit !== 'captain_hat') {
      // Sleek curved cap hair (Leo / Kai)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, headY, r - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(cx, headY - r * 0.76, r * 0.95, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFishermanHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#F4C430';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, hatY + 12, r * 0.82, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sweeping sloped sou'wester brim
    ctx.fillStyle = '#E6B01E';
    ctx.beginPath();
    ctx.ellipse(cx, hatY + 14, r * 1.32, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawCaptainCap(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    // White peaked yacht/harbor captain crown
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.78, hatY + 4);
    ctx.lineTo(cx - r * 0.95, hatY - 46);
    ctx.quadraticCurveTo(cx, hatY - 72, cx + r * 0.95, hatY - 46);
    ctx.lineTo(cx + r * 0.78, hatY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Navy band + dark visor
    ctx.fillStyle = '#183763';
    ctx.fillRect(cx - r * 0.78, hatY - 12, r * 1.56, 22);
    ctx.strokeRect(cx - r * 0.78, hatY - 12, r * 1.56, 22);

    ctx.fillStyle = '#141A24';
    ctx.beginPath();
    ctx.ellipse(cx, hatY + 12, r * 0.86, 15, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // Gold emblem dot in center
    ctx.fillStyle = '#F5C542';
    ctx.beginPath();
    ctx.arc(cx, hatY - 28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawBillionaireSunHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, hatY + 8, r * 0.76, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#181818';
    ctx.fillRect(cx - r * 0.76, hatY - 12, r * 1.52, 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, hatY + 10, r * 1.48, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawTopHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#222630';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.62, hatY - 98, r * 1.24, 104, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#C9382E';
    ctx.fillRect(cx - r * 0.62, hatY - 20, r * 1.24, 18);
    ctx.fillStyle = '#222630';
    ctx.beginPath();
    ctx.ellipse(cx, hatY + 6, r * 1.05, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawHardHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#F5B82E';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, hatY + 12, r * 0.84, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E09F18';
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.96, hatY + 4, r * 1.92, 22, 10);
    ctx.fill();
    ctx.stroke();
  }

  private drawChefHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    for (const [ox, oy, rad] of [[-46, -48, 38], [0, -64, 44], [46, -48, 38]]) {
      ctx.beginPath();
      ctx.arc(cx + ox, hatY + oy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillRect(cx - r * 0.66, hatY - 34, r * 1.32, 42);
    ctx.strokeRect(cx - r * 0.66, hatY - 34, r * 1.32, 42);
  }

  private drawTimeGoggles(ctx: CanvasRenderingContext2D, cx: number, y: number, r: number): void {
    const ink = this.ink;
    // Brown leather strap across forehead
    ctx.fillStyle = '#6E4520';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.fillRect(cx - r * 0.9, y - 10, r * 1.8, 20);
    ctx.strokeRect(cx - r * 0.9, y - 10, r * 1.8, 20);

    // Twin brass-rimmed glowing cyan goggles sitting above eyes!
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#D99B26';
      ctx.beginPath();
      ctx.arc(cx + side * 36, y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#66ECFF';
      ctx.beginPath();
      ctx.arc(cx + side * 36, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawSunglasses(ctx: CanvasRenderingContext2D, cx: number, eyeY: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#14161A';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(cx + side * 42 - 28, eyeY - 22, 56, 40, 14);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + side * 42 - 14, eyeY - 10);
      ctx.lineTo(cx + side * 42 - 4, eyeY - 10);
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
    }
    ctx.beginPath();
    ctx.moveTo(cx - 14, eyeY - 6);
    ctx.lineTo(cx + 14, eyeY - 6);
    ctx.stroke();
  }

  private drawStrawHat(ctx: CanvasRenderingContext2D, cx: number, hatY: number, r: number): void {
    const ink = this.ink;
    // Crown
    ctx.fillStyle = '#F2C14E';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, hatY + 8, r * 0.74, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crimson ribbon band
    ctx.fillStyle = '#C83728';
    ctx.fillRect(cx - r * 0.72, hatY - 12, r * 1.44, 18);
    ctx.strokeRect(cx - r * 0.72, hatY - 12, r * 1.44, 18);

    // Wide brim
    ctx.fillStyle = '#F6CE65';
    ctx.beginPath();
    ctx.ellipse(cx, hatY + 8, r * 1.38, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawSweatband(ctx: CanvasRenderingContext2D, cx: number, y: number, r: number): void {
    const ink = this.ink;
    ctx.fillStyle = '#D93B2B';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.86, y - 14, r * 1.72, 26, 12);
    ctx.fill();
    ctx.stroke();
  }

  private drawFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    headY: number,
    expression: Expression,
    facing: 'front' | 'left' | 'right',
    isBlinking: boolean,
    mouthOpen = -1
  ): void {
    const ink = this.ink;
    const lookX = facing === 'right' ? 14 : facing === 'left' ? -14 : 0;
    const eyeY = headY - 4;
    const eyeDX = 38;
    const eyeR = 23;

    // Blush cheeks for positive emotions
    if (expression === 'happy' || expression === 'excited' || expression === 'proud' || expression === 'peaceful') {
      ctx.fillStyle = STYLE_TOKENS.colors.blushPink;
      ctx.beginPath();
      ctx.ellipse(cx - 56 + lookX * 0.5, headY + 26, 14, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 56 + lookX * 0.5, headY + 26, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // EYES
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;

    if (expression === 'happy' || expression === 'excited' || expression === 'peaceful') {
      // Joyful curved arcs (^ ^)
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + side * eyeDX + lookX * 0.5, eyeY + 8, 20, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    } else if (isBlinking) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * eyeDX - 18 + lookX * 0.4, eyeY + 2);
        ctx.lineTo(cx + side * eyeDX + 18 + lookX * 0.4, eyeY + 2);
        ctx.stroke();
      }
    } else {
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeDX + lookX * 0.4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(ex + lookX * 0.45, eyeY + (expression === 'exhausted' ? 4 : 0), 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Half-closed droopy eyelids for exhausted / skeptical
        if (expression === 'exhausted' || expression === 'skeptical') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(ex - eyeR - 2, eyeY - eyeR - 2, eyeR * 2 + 4, eyeR + (expression === 'exhausted' ? 3 : -2));
          ctx.strokeStyle = ink;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(ex - eyeR - 2, eyeY + (expression === 'exhausted' ? 1 : -4));
          ctx.lineTo(ex + eyeR + 2, eyeY + (expression === 'exhausted' ? 1 : -4));
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // EYEBROWS
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6.5;
    if (expression === 'worried' || expression === 'exhausted') {
      ctx.beginPath();
      ctx.moveTo(cx - 56, eyeY - 30);
      ctx.lineTo(cx - 22, eyeY - 40);
      ctx.moveTo(cx + 56, eyeY - 30);
      ctx.lineTo(cx + 22, eyeY - 40);
      ctx.stroke();
    } else if (expression === 'surprised' || expression === 'excited' || expression === 'proud') {
      ctx.beginPath();
      ctx.arc(cx - eyeDX, eyeY - 26, 20, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + eyeDX, eyeY - 26, 20, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    }

    // MOUTH
    const mouthY = headY + 48;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    if (mouthOpen >= 0) {
      // V3 talking mouth: open oval that flaps with the narration (keeps a smile shape for happy moods)
      const happyMood = expression === 'excited' || expression === 'happy' || expression === 'proud' || expression === 'peaceful';
      // Small, natural speaking mouth (reference style) rather than a big black oval
      const w = (happyMood ? 22 : 18) + mouthOpen * 4;
      const h = 4 + mouthOpen * 13;
      ctx.fillStyle = '#3B1919';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + (happyMood ? -2 : 4), w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (mouthOpen > 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, mouthY + (happyMood ? -2 : 4), w, h, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = STYLE_TOKENS.colors.tonguePink;
        ctx.beginPath();
        ctx.arc(cx, mouthY + h + 4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (expression === 'excited' || expression === 'happy' || expression === 'proud') {
      // Big expressive D-grin with pink tongue (re-trace D-path so tongue isn't outlined!)
      const traceGrinPath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - 34, mouthY - 8);
        ctx.lineTo(cx + 34, mouthY - 8);
        ctx.arc(cx, mouthY - 8, 34, 0, Math.PI);
        ctx.closePath();
      };
      traceGrinPath();
      ctx.fillStyle = '#3B1919';
      ctx.fill();

      ctx.save();
      traceGrinPath();
      ctx.clip();
      ctx.fillStyle = STYLE_TOKENS.colors.tonguePink;
      ctx.beginPath();
      ctx.arc(cx, mouthY + 24, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      traceGrinPath();
      ctx.stroke();
    } else if (expression === 'peaceful') {
      ctx.beginPath();
      ctx.arc(cx, mouthY - 12, 22, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (expression === 'worried' || expression === 'exhausted') {
      ctx.beginPath();
      ctx.arc(cx, mouthY + 18, 22, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
    } else if (expression === 'surprised') {
      ctx.fillStyle = '#3B1919';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + 4, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Neutral / skeptical flat line
      ctx.beginPath();
      ctx.moveTo(cx - 22, mouthY + 2);
      ctx.lineTo(cx + 22, mouthY + 2);
      ctx.stroke();
    }

    // Sweat drop when exhausted
    if (expression === 'exhausted') {
      ctx.fillStyle = '#6CC8F5';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + 72, headY - 46);
      ctx.quadraticCurveTo(cx + 86, headY - 18, cx + 72, headY - 12);
      ctx.quadraticCurveTo(cx + 58, headY - 18, cx + 72, headY - 46);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawArms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    torsoTop: number,
    torsoW: number,
    state: { pose: Pose; time: number; stridePhase: number },
    layer: 'back' | 'front'
  ): void {
    const ink = this.ink;
    const shoulderY = torsoTop + 36;
    const lx = cx - torsoW * 0.48;
    const rx = cx + torsoW * 0.48;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 15;

    if (layer === 'back') {
      if (state.pose === 'idle' || state.pose === 'slumped_tired') {
        const droop = state.pose === 'slumped_tired' ? 28 : 0;
        ctx.beginPath();
        ctx.moveTo(lx, shoulderY);
        ctx.quadraticCurveTo(lx - 26, shoulderY + 64, lx - 16, shoulderY + 132 + droop);
        ctx.moveTo(rx, shoulderY);
        ctx.quadraticCurveTo(rx + 26, shoulderY + 64, rx + 16, shoulderY + 132 + droop);
        ctx.stroke();
      } else if (state.pose === 'hands_on_hips') {
        ctx.beginPath();
        ctx.moveTo(lx, shoulderY);
        ctx.lineTo(lx - 46, shoulderY + 58);
        ctx.lineTo(lx - 4, shoulderY + 102);
        ctx.moveTo(rx, shoulderY);
        ctx.lineTo(rx + 46, shoulderY + 58);
        ctx.lineTo(rx + 4, shoulderY + 102);
        ctx.stroke();
      } else if (state.pose === 'celebrating') {
        const wave = Math.sin(state.time * 9) * 14;
        ctx.beginPath();
        ctx.moveTo(lx, shoulderY);
        ctx.lineTo(lx - 68, shoulderY - 56 + wave);
        ctx.moveTo(rx, shoulderY);
        ctx.lineTo(rx + 68, shoulderY - 56 - wave);
        ctx.stroke();
      } else if (state.pose === 'shrugging') {
        ctx.beginPath();
        ctx.moveTo(lx, shoulderY);
        ctx.lineTo(lx - 48, shoulderY + 34);
        ctx.lineTo(lx - 72, shoulderY + 4);
        ctx.moveTo(rx, shoulderY);
        ctx.lineTo(rx + 48, shoulderY + 34);
        ctx.lineTo(rx + 72, shoulderY + 4);
        ctx.stroke();
      }
      return;
    }

    // FRONT LAYER: arms holding buckets / giant bucket / pipe / valve
    if (state.pose === 'holding_bucket' || state.pose === 'running_bucket') {
      const swing = state.pose === 'running_bucket' ? Math.sin(state.time * 16) * 26 : 0;
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 28, shoulderY + 86 + swing * 0.4);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 36, shoulderY + 76 - swing * 0.4);
      ctx.stroke();

      // Drawn wooden bucket in right hand
      this.drawWoodenBucket(ctx, rx + 42, shoulderY + 102 - swing * 0.4, 0.85, true);
    } else if (state.pose === 'carrying_heavy') {
      // Maya carrying giant oversized bucket in front with both arms
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(cx - 56, shoulderY + 82);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(cx + 56, shoulderY + 82);
      ctx.stroke();
      this.drawWoodenBucket(ctx, cx, shoulderY + 104, 1.38, true);
    } else if (state.pose === 'building_pipe') {
      const tap = Math.sin(state.time * 10) * 16;
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(cx - 26, shoulderY + 84);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 56, shoulderY + 34 + tap);
      ctx.stroke();

      // Bamboo pipe segment held horizontally
      ctx.fillStyle = STYLE_TOKENS.colors.bambooTan;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(cx - 54, shoulderY + 68, 126, 26, 8);
      ctx.fill();
      ctx.stroke();
      // Bamboo nodes
      ctx.beginPath();
      ctx.moveTo(cx - 12, shoulderY + 68);
      ctx.lineTo(cx - 12, shoulderY + 94);
      ctx.moveTo(cx + 30, shoulderY + 68);
      ctx.lineTo(cx + 30, shoulderY + 94);
      ctx.stroke();
    } else if (state.pose === 'operating_valve') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 30, shoulderY + 92);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 46, shoulderY + 66);
      ctx.stroke();
      // Small gleaming bucket at side + valve wheel
      this.drawWoodenBucket(ctx, lx - 36, shoulderY + 116, 0.72, true);
    } else if (state.pose === 'watering_can') {
      const tilt = Math.sin(state.time * 5.5) * 0.14;
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 24, shoulderY + 90);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 44, shoulderY + 62);
      ctx.stroke();

      // Cute cel-shaded blue watering can with animated droplets
      ctx.save();
      ctx.translate(rx + 68, shoulderY + 78);
      ctx.rotate(0.25 + tilt);

      // Spout
      ctx.strokeStyle = ink;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(22, 6);
      ctx.lineTo(54, -14);
      ctx.stroke();

      // Handle
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(-20, -4, 18, Math.PI * 0.5, Math.PI * 1.7);
      ctx.stroke();

      // Can body
      ctx.fillStyle = '#3B9AE1';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(-24, -18, 48, 42, 8);
      ctx.fill();
      ctx.stroke();

      // Animated falling water drops
      ctx.fillStyle = '#7ED6FF';
      for (let d = 0; d < 3; d++) {
        const dt = (state.time * 3 + d * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(58 + d * 7, -6 + dt * 52, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (state.pose === 'holding_oar') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 26, shoulderY + 90);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 46, shoulderY + 62);
      ctx.stroke();

      // Tall outlined wooden boat oar held at right side
      ctx.save();
      ctx.translate(rx + 48, shoulderY + 54);
      ctx.rotate(0.14);
      ctx.fillStyle = '#C98A42';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(-8, -125, 16, 215, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-22, -165, 44, 68, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (state.pose === 'holding_map') {
      // Holding an unrolled parchment sea chart in both hands
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(cx - 58, shoulderY + 72);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(cx + 58, shoulderY + 72);
      ctx.stroke();

      ctx.fillStyle = '#F5E6BE';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(cx - 66, shoulderY + 34, 132, 84, 8);
      ctx.fill();
      ctx.stroke();
      // Dashed route & red X on map
      ctx.strokeStyle = '#D93829';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 42, shoulderY + 92);
      ctx.quadraticCurveTo(cx - 6, shoulderY + 52, cx + 34, shoulderY + 66);
      ctx.stroke();
      ctx.fillStyle = '#D93829';
      ctx.beginPath();
      ctx.arc(cx + 36, shoulderY + 66, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (state.pose === 'holding_spyglass') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 22, shoulderY + 94);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 48, shoulderY + 26);
      ctx.stroke();

      // Brass sailor spyglass held outward
      ctx.save();
      ctx.translate(rx + 56, shoulderY + 22);
      ctx.rotate(-0.22);
      ctx.fillStyle = '#E8B338';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 74, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5EC2F7';
      ctx.fillRect(52, -9, 10, 18);
      ctx.restore();
    } else if (state.pose === 'holding_suitcase') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 24, shoulderY + 90);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 32, shoulderY + 86);
      ctx.stroke();

      // Rolling bright red suitcase beside right hand
      ctx.fillStyle = '#D93B2B';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(rx + 18, shoulderY + 114, 72, 106, 12);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx + 54, shoulderY + 82);
      ctx.lineTo(rx + 54, shoulderY + 114);
      ctx.stroke();
    } else if (state.pose === 'holding_cash') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 42, shoulderY + 46);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 42, shoulderY + 46);
      ctx.stroke();

      // Thick green cash bundles in both hands!
      for (const sx of [lx - 66, rx + 20]) {
        ctx.fillStyle = '#43B358';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(sx, shoulderY + 26, 62, 34, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#F5C542';
        ctx.fillRect(sx + 24, shoulderY + 26, 14, 34);
      }
    } else if (state.pose === 'holding_megaphone') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 28, shoulderY + 88);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 42, shoulderY + 16);
      ctx.stroke();

      // Loud red-and-white megaphone
      ctx.fillStyle = '#E03B2D';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(rx + 36, shoulderY + 8);
      ctx.lineTo(rx + 106, shoulderY - 26);
      ctx.lineTo(rx + 106, shoulderY + 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (state.pose === 'dancing_party') {
      const bounce = Math.sin(state.time * 12) * 28;
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(lx - 66, shoulderY - 46 + bounce);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(rx + 66, shoulderY - 46 - bounce);
      ctx.stroke();
    } else if (state.pose === 'covering_ears') {
      ctx.beginPath();
      ctx.moveTo(lx, shoulderY);
      ctx.lineTo(cx - 108, shoulderY - 108);
      ctx.moveTo(rx, shoulderY);
      ctx.lineTo(cx + 108, shoulderY - 108);
      ctx.stroke();
    }
  }

  private drawWoodenBucket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    withWater: boolean
  ): void {
    const ink = this.ink;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Handle arc
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -18, 30, Math.PI, 0);
    ctx.stroke();

    // Bucket trapezoid
    ctx.fillStyle = '#B87634';
    ctx.beginPath();
    ctx.moveTo(-36, -18);
    ctx.lineTo(36, -18);
    ctx.lineTo(26, 36);
    ctx.lineTo(-26, 36);
    ctx.closePath();
    ctx.fill();

    // Right shadow split
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.lineTo(36, -18);
    ctx.lineTo(26, 36);
    ctx.lineTo(6, 36);
    ctx.closePath();
    ctx.fill();

    // Metal iron bands
    ctx.strokeStyle = '#3B4248';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-33, -4);
    ctx.lineTo(33, -4);
    ctx.moveTo(-29, 20);
    ctx.lineTo(29, 20);
    ctx.stroke();

    // Bucket outline
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-36, -18);
    ctx.lineTo(36, -18);
    ctx.lineTo(26, 36);
    ctx.lineTo(-26, 36);
    ctx.closePath();
    ctx.stroke();

    // Water top oval
    if (withWater) {
      ctx.fillStyle = STYLE_TOKENS.colors.waterBlue;
      ctx.beginPath();
      ctx.ellipse(0, -18, 33, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private roundedPillPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  public dispose(): void {
    for (const rig of this.rigs.values()) {
      rig.mesh.geometry.dispose();
      (rig.mesh.material as THREE.Material).dispose();
      rig.mesh.customDepthMaterial?.dispose();
      rig.texture.dispose();
    }
    this.rigs.clear();
  }
}
