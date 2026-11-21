import React from 'react';
import { PuppetAction, PuppetBeat, PuppetExpression } from '../../services/scripting/schema.js';

/**
 * Rigged 2D "storytime" puppets matching the Gemini character sheet
 * (illustrations-ref/five-hundred-iq-v1/character-sheet.jpg): big round cream heads, small dot eyes,
 * blush, soft painterly shading, warm dark-brown outlines.
 *
 * Local units: origin at the feet centre, y up is negative. A scale-1 puppet is ~560 units tall.
 * Joint angles are in degrees "outward" from hanging straight down (negative = across the body).
 */

const INK = '#4A2A1C';
const SKIN = '#FBE6B6';
const SKIN_SHADE = '#EFCB93';
const CHEEK = '#F4A98E';
const STROKE = 5;

export type PuppetId = 'alex' | 'chloe' | 'mayor' | 'chef' | 'granny';
type Outfit = 'default' | 'labcoat' | 'tophat';

interface Pose {
  rS: number; // screen-right arm shoulder (outward degrees)
  rE: number; // screen-right elbow
  lS: number;
  lE: number;
  rH: number; // screen-right hip
  rK: number; // knee
  lH: number;
  lK: number;
  lean: number; // torso lean (deg, + leans to screen right)
  tilt: number; // head tilt
  bob: number; // vertical offset (units, + = down)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Pose for an action at time `t` (seconds since the action started) */
export function actionPose(action: PuppetAction, t: number, seed: number): Pose {
  const s = Math.sin;
  const breathe = s(t * 2.6 + seed) * 2;
  const base: Pose = { rS: 8, rE: 4, lS: 8, lE: 4, rH: 3, rK: 0, lH: 3, lK: 0, lean: 0, tilt: 0, bob: breathe };
  switch (action) {
    case 'idle':
      return { ...base, rS: 8 + s(t * 1.3 + seed) * 2, lS: 8 + s(t * 1.1 + seed + 1) * 2, tilt: s(t * 0.9 + seed) * 2 };
    case 'talk':
      return {
        ...base,
        rS: 28 + s(t * 3.1 + seed) * 10,
        rE: -55 + s(t * 4.3 + seed) * 18,
        lS: 14 + s(t * 2.3 + seed) * 4,
        lE: -10,
        tilt: s(t * 2.1 + seed) * 4,
      };
    case 'point':
      return { ...base, rS: 112, rE: -6, lS: 10, lE: -20, lean: 3, tilt: 4 };
    case 'wave':
      return { ...base, rS: 150, rE: 20 + s(t * 11) * 28, tilt: -3 };
    case 'shrug':
      return { ...base, rS: 34, rE: 82, lS: 34, lE: 82, tilt: 8 + s(t * 1.5) * 2, bob: -6 + breathe };
    case 'cheer':
      return {
        ...base,
        rS: 162,
        rE: 12 + s(t * 8) * 10,
        lS: 162,
        lE: 12 - s(t * 8) * 10,
        bob: -Math.abs(s(t * 7)) * 22,
        tilt: s(t * 7) * 5,
      };
    case 'hands_hips':
      return { ...base, rS: 32, rE: -104, lS: 32, lE: -104, lean: s(t * 1.2) * 1.5 };
    case 'cross_arms':
      return { ...base, rS: 14, rE: -122, lS: 14, lE: -122, tilt: -4 };
    case 'think':
      return { ...base, rS: 22, rE: -152, lS: 12, lE: -96, tilt: -7 + s(t * 1.2) * 2 };
    case 'surprised':
      return { ...base, rS: 62, rE: 42, lS: 62, lE: 42, lean: 0, tilt: 0, bob: -10 + s(t * 20) * Math.exp(-t * 4) * 6 };
    case 'facepalm':
      return { ...base, rS: 26, rE: -166, lS: 8, lE: 4, tilt: 12, bob: 4 };
    case 'slump':
      return { ...base, rS: 4, rE: 2, lS: 4, lE: 2, lean: 4, tilt: 14, bob: 10 };
    case 'dance': {
      const ph = s(t * 6.5);
      return {
        ...base,
        rS: 120 + ph * 40,
        rE: 30,
        lS: 120 - ph * 40,
        lE: 30,
        rH: 6 + ph * 6,
        lH: 6 - ph * 6,
        lean: ph * 6,
        tilt: -ph * 6,
        bob: -Math.abs(Math.sin(t * 13)) * 14,
      };
    }
    case 'walk': {
      const ph = s(t * 8.5);
      return {
        ...base,
        rS: 10 - ph * 14,
        rE: 6,
        lS: 10 + ph * 14,
        lE: 6,
        rH: ph * 16,
        rK: Math.max(0, -ph) * 22,
        lH: -ph * 16,
        lK: Math.max(0, ph) * 22,
        bob: -Math.abs(Math.sin(t * 8.5)) * 9,
        tilt: ph * 2,
      };
    }
    default:
      return base;
  }
}

function blendPose(a: Pose, b: Pose, t: number): Pose {
  const k = ease(clamp01(t));
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => {
    o[key] = lerp(a[key], b[key], k);
  });
  return o;
}

/** Capsule limb from (0,0) down to (0,len) in its own rotated frame */
const Limb: React.FC<{ len: number; w: number; fill: string; shade?: string }> = ({ len, w, fill, shade }) => (
  <>
    <rect x={-w / 2} y={-w / 2} width={w} height={len + w} rx={w / 2} fill={fill} stroke={INK} strokeWidth={STROKE} />
    {shade && <rect x={w * 0.08} y={0} width={w * 0.3} height={len} rx={w * 0.15} fill={shade} opacity={0.35} />}
  </>
);

interface Look {
  sleeve: string;
  sleeveShade: string;
  pants: string;
  shoe: string;
  legSkin?: boolean; // bare legs below a dress
  legLen: number;
}

function lookFor(id: PuppetId, outfit: Outfit): Look {
  if (outfit === 'labcoat') return { sleeve: '#F7F4EA', sleeveShade: '#C9C2B0', pants: '#2C2833', shoe: '#2F2126', legLen: 1 };
  switch (id) {
    case 'alex':
      return { sleeve: '#3F4766', sleeveShade: '#272C42', pants: '#2C2833', shoe: '#2F2126', legLen: 1 };
    case 'chloe':
      return { sleeve: '#5E8A45', sleeveShade: '#3F6230', pants: SKIN, shoe: '#2F2126', legSkin: true, legLen: 1 };
    case 'mayor':
      return { sleeve: '#F3EACB', sleeveShade: '#CFC29C', pants: '#F0E6C4', shoe: '#5A2E1E', legLen: 1 };
    case 'chef':
      return { sleeve: '#F8F4E4', sleeveShade: '#CFC8B2', pants: '#2C2833', shoe: '#2F2126', legLen: 1 };
    case 'granny':
      return { sleeve: '#8E5C9E', sleeveShade: '#62407A', pants: '#6E6670', shoe: '#2F2126', legSkin: false, legLen: 0.92 };
  }
}

/** Torso / clothing drawn around the spine. y=0 is the hip line, shoulders at -130. */
const Torso: React.FC<{ id: PuppetId; outfit: Outfit; uid: string }> = ({ id, outfit, uid }) => {
  if (outfit === 'labcoat') {
    return (
      <g>
        {/* hoodie underneath */}
        <path d="M-70,-128 Q0,-142 70,-128 L78,6 Q0,18 -78,6 Z" fill="#3F4766" stroke={INK} strokeWidth={STROKE} />
        <path d="M-80,-130 Q-40,-140 -14,-136 L-6,40 L-86,40 Z" fill={`url(#${uid}-coat)`} stroke={INK} strokeWidth={STROKE} />
        <path d="M80,-130 Q40,-140 14,-136 L6,40 L86,40 Z" fill={`url(#${uid}-coat)`} stroke={INK} strokeWidth={STROKE} />
        <path d="M-14,-136 L-30,-96 L-10,-80" fill="none" stroke={INK} strokeWidth={4} />
        <path d="M14,-136 L30,-96 L10,-80" fill="none" stroke={INK} strokeWidth={4} />
        <rect x={34} y={-70} width={24} height={14} rx={3} fill="#9CB8D8" stroke={INK} strokeWidth={3} />
      </g>
    );
  }
  switch (id) {
    case 'alex':
      return (
        <g>
          <path d="M-62,-140 Q0,-170 62,-140 L46,-118 Q0,-132 -46,-118 Z" fill="#2E3550" stroke={INK} strokeWidth={STROKE} />
          <path d="M-72,-128 Q0,-142 72,-128 L80,4 Q0,16 -80,4 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M-8,-124 L-12,-82 M8,-124 L12,-82" stroke="#EDE6D6" strokeWidth={4} strokeLinecap="round" />
          <path d="M-38,-44 L38,-44 L44,-6 L-44,-6 Z" fill="#363D58" stroke={INK} strokeWidth={4} />
        </g>
      );
    case 'chloe':
      return (
        <g>
          <path d="M-62,-130 Q0,-142 62,-130 L92,64 Q0,82 -92,64 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M-22,-136 Q0,-118 22,-136" fill="none" stroke={INK} strokeWidth={4} />
        </g>
      );
    case 'mayor':
      return (
        <g>
          <path d="M-72,-128 Q0,-142 72,-128 L78,8 Q0,18 -78,8 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M-18,-134 L0,-80 L18,-134 Z" fill="#FFFFFF" stroke={INK} strokeWidth={3} />
          <path d="M-5,-122 L5,-122 L8,-62 L0,-52 L-8,-62 Z" fill="#2E3140" stroke={INK} strokeWidth={3} />
          <path d="M-18,-134 L-34,-84 L-4,-40 M18,-134 L34,-84 L4,-40" fill="none" stroke={INK} strokeWidth={4} />
          <circle cx={0} cy={-26} r={4} fill={INK} />
        </g>
      );
    case 'chef':
      return (
        <g>
          <path d="M-74,-128 Q0,-142 74,-128 L78,10 Q0,20 -78,10 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M-26,-138 L26,-138 L22,-122 L-22,-122 Z" fill="#FFFFFF" stroke={INK} strokeWidth={3} />
          {[-96, -64, -32].map((y) => (
            <g key={y}>
              <circle cx={-18} cy={y} r={6} fill="#E3A62B" stroke={INK} strokeWidth={2} />
              <circle cx={18} cy={y} r={6} fill="#E3A62B" stroke={INK} strokeWidth={2} />
            </g>
          ))}
        </g>
      );
    case 'granny':
      return (
        <g>
          <path d="M-52,-128 Q0,-138 52,-128 L74,72 Q0,86 -74,72 Z" fill="#4A3550" stroke={INK} strokeWidth={STROKE} />
          {[[-30, -60], [10, -30], [30, 20], [-20, 40], [0, -100]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={5} fill="#8A6E92" />
          ))}
          <path d="M-72,-130 Q-40,-140 -18,-134 L-26,30 L-82,24 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M72,-130 Q40,-140 18,-134 L26,30 L82,24 Z" fill={`url(#${uid}-cloth)`} stroke={INK} strokeWidth={STROKE} />
          <path d="M-20,-136 Q-10,-124 0,-132 Q10,-124 20,-136" fill="#FFFFFF" stroke={INK} strokeWidth={3} />
        </g>
      );
  }
};

/** Hair / hats drawn on the head (head centre at 0,0, radius ~96) */
const Headwear: React.FC<{ id: PuppetId; outfit: Outfit; front: boolean }> = ({ id, outfit, front }) => {
  if (outfit === 'tophat' && front) {
    return (
      <g>
        <ellipse cx={0} cy={-84} rx={78} ry={14} fill="#1E1C22" stroke={INK} strokeWidth={STROKE} />
        <rect x={-48} y={-176} width={96} height={94} rx={6} fill="#24222A" stroke={INK} strokeWidth={STROKE} />
        <rect x={-48} y={-106} width={96} height={14} fill="#7A2C2C" />
      </g>
    );
  }
  switch (id) {
    case 'alex':
      return front ? (
        <path
          d="M-92,-20 Q-104,-70 -76,-96 L-92,-118 L-54,-110 L-48,-140 L-20,-118 L0,-146 L18,-116 L52,-138 L52,-106 L90,-112 L76,-82 Q104,-56 90,-18 Q70,-66 30,-74 Q-10,-58 -40,-74 Q-74,-62 -92,-20 Z"
          fill="#7B3A22"
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      ) : null;
    case 'chloe':
      return front ? (
        <g>
          <circle cx={0} cy={-120} r={36} fill="#CF541C" stroke={INK} strokeWidth={STROKE} />
          <path
            d="M-96,30 Q-108,-80 -30,-96 Q30,-104 80,-70 Q104,-30 96,30 Q80,-30 40,-56 Q-10,-40 -60,-56 Q-84,-20 -96,30 Z"
            fill="#CF541C"
            stroke={INK}
            strokeWidth={STROKE}
          />
        </g>
      ) : (
        <circle cx={0} cy={-120} r={36} fill="#CF541C" stroke={INK} strokeWidth={STROKE} />
      );
    case 'mayor':
      return front ? (
        <g>
          <path d="M-56,-74 Q-50,-140 0,-142 Q50,-140 56,-74 Z" fill="#FBF3D6" stroke={INK} strokeWidth={STROKE} />
          <rect x={-56} y={-92} width={112} height={14} fill="#8C6A4A" />
          <ellipse cx={0} cy={-74} rx={140} ry={24} fill="#FBF3D6" stroke={INK} strokeWidth={STROKE} />
        </g>
      ) : null;
    case 'chef':
      return front ? (
        <g>
          <rect x={-60} y={-150} width={120} height={70} fill="#FCFAF0" stroke={INK} strokeWidth={STROKE} />
          {[-48, -12, 26].map((x, i) => (
            <circle key={i} cx={x + 10} cy={-178} r={42} fill="#FCFAF0" stroke={INK} strokeWidth={STROKE} />
          ))}
          <rect x={-58} y={-160} width={116} height={30} fill="#FCFAF0" />
          <path d="M-90,-30 Q-90,-70 -60,-80 L60,-80 Q90,-70 90,-30 Q60,-60 0,-62 Q-60,-60 -90,-30 Z" fill="#2E2420" stroke={INK} strokeWidth={STROKE} />
        </g>
      ) : null;
    case 'granny':
      return front ? (
        <g>
          <circle cx={0} cy={-112} r={32} fill="#C9C3BC" stroke={INK} strokeWidth={STROKE} />
          <path
            d="M-96,10 Q-100,-84 0,-98 Q100,-84 96,10 Q84,-46 40,-62 Q0,-50 -40,-62 Q-84,-46 -96,10 Z"
            fill="#C9C3BC"
            stroke={INK}
            strokeWidth={STROKE}
          />
        </g>
      ) : (
        <circle cx={0} cy={-112} r={32} fill="#C9C3BC" stroke={INK} strokeWidth={STROKE} />
      );
  }
};

const Face: React.FC<{
  id: PuppetId;
  expression: PuppetExpression;
  blink: boolean;
  mouthLevel: number; // -1 = not talking
  look: number; // -1..1 horizontal gaze
}> = ({ id, expression, blink, mouthLevel, look }) => {
  const ex = 34;
  const ey = 4;
  const lx = look * 6;
  const sunglasses = id === 'mayor';
  const eyeH = expression === 'surprised' ? 15 : 12;
  const halfLid = expression === 'annoyed' || expression === 'tired';
  const browY = expression === 'surprised' ? -32 : -24;
  const brow = (side: number) => {
    const inner = side * 18;
    const outer = side * 48;
    if (expression === 'worried' || expression === 'sad')
      return `M${inner},${browY - 8} Q${(inner + outer) / 2},${browY - 6} ${outer},${browY + 2}`;
    if (expression === 'annoyed' || expression === 'determined')
      return `M${inner},${browY + 6} Q${(inner + outer) / 2},${browY - 2} ${outer},${browY - 6}`;
    return `M${inner},${browY - 2} Q${(inner + outer) / 2},${browY - 9} ${outer},${browY - 2}`;
  };
  let mouth: React.ReactNode;
  if (mouthLevel >= 0) {
    const w = 15 + mouthLevel * 4;
    const h = 3 + mouthLevel * 12;
    mouth = (
      <g>
        <ellipse cx={0} cy={44} rx={w} ry={h} fill="#4A2219" stroke={INK} strokeWidth={3} />
        {mouthLevel > 0.5 && <ellipse cx={0} cy={44 + h * 0.5} rx={w * 0.55} ry={h * 0.35} fill="#C9545E" />}
      </g>
    );
  } else {
    switch (expression) {
      case 'excited':
        mouth = <path d="M-20,38 Q0,40 20,38 Q16,62 0,62 Q-16,62 -20,38 Z" fill="#4A2219" stroke={INK} strokeWidth={3} />;
        break;
      case 'surprised':
        mouth = <ellipse cx={0} cy={46} rx={10} ry={13} fill="#4A2219" stroke={INK} strokeWidth={3} />;
        break;
      case 'sad':
      case 'worried':
        mouth = <path d="M-16,50 Q0,38 16,50" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
        break;
      case 'annoyed':
      case 'tired':
        mouth = <path d="M-14,46 L14,44" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
        break;
      case 'smug':
        mouth = <path d="M-14,44 Q4,52 18,40" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
        break;
      case 'determined':
      case 'neutral':
        mouth = <path d="M-12,46 L12,46" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
        break;
      default:
        mouth = <path d="M-18,40 Q0,54 18,40" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
    }
  }
  return (
    <g>
      {/* cheeks */}
      <ellipse cx={-56} cy={26} rx={16} ry={10} fill={CHEEK} opacity={0.75} />
      <ellipse cx={56} cy={26} rx={16} ry={10} fill={CHEEK} opacity={0.75} />
      {/* eyes */}
      {sunglasses ? (
        <g>
          <path d="M-66,-10 L-8,-10 L-12,18 Q-38,26 -62,14 Z" fill="#1E1E22" stroke={INK} strokeWidth={3} />
          <path d="M66,-10 L8,-10 L12,18 Q38,26 62,14 Z" fill="#1E1E22" stroke={INK} strokeWidth={3} />
          <path d="M-8,-6 L8,-6" stroke="#1E1E22" strokeWidth={5} />
          <path d="M-52,-4 L-40,-4" stroke="#FFFFFF" strokeWidth={3} opacity={0.6} />
        </g>
      ) : (
        [-1, 1].map((side) =>
          blink || expression === 'happy_closed' ? (
            <path key={side} d={`M${side * ex - 10},${ey + 2} Q${side * ex},${ey - 6} ${side * ex + 10},${ey + 2}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          ) : (
            <g key={side}>
              <ellipse cx={side * ex + lx} cy={ey} rx={9} ry={eyeH} fill="#2B1810" />
              <circle cx={side * ex + lx + 3} cy={ey - 5} r={3.5} fill="#FFFFFF" />
              {halfLid && <rect x={side * ex - 12 + lx} y={ey - eyeH - 2} width={24} height={eyeH} fill={SKIN} />}
              {halfLid && <path d={`M${side * ex - 11 + lx},${ey - 1} L${side * ex + 11 + lx},${ey - 1}`} stroke={INK} strokeWidth={3} />}
            </g>
          )
        )
      )}
      {/* brows */}
      {!sunglasses && [-1, 1].map((side) => <path key={side} d={brow(side)} fill="none" stroke="#5A2E1E" strokeWidth={5} strokeLinecap="round" />)}
      {/* granny wrinkles */}
      {id === 'granny' && <path d="M-22,-40 Q0,-46 22,-40" fill="none" stroke="#C9A27A" strokeWidth={2} />}
      {/* nose */}
      <ellipse cx={lx * 0.5} cy={20} rx={7} ry={9} fill="#F0A07E" />
      {mouth}
    </g>
  );
};

export interface PuppetRenderProps {
  beat: PuppetBeat;
  /** seconds since scene start */
  t: number;
  /** scene duration seconds */
  dur: number;
  /** narration loudness 0..1 for the speaker, -1 otherwise */
  mouthLevel: number;
  /** frame width/height in px */
  frameW: number;
  frameH: number;
}

/** Resolve the active action, blended from the previous one over 0.28 s */
function resolvePose(beat: PuppetBeat, t: number, dur: number, seed: number): { pose: Pose; x: number; expr: PuppetExpression } {
  const acts = [...(beat.actions ?? [])].sort((a, b) => a.at - b.at);
  if (acts.length === 0 || acts[0].at > 0) acts.unshift({ at: 0, action: 'idle' });
  let i = 0;
  for (let k = 0; k < acts.length; k++) if (t >= acts[k].at * dur) i = k;
  const cur = acts[i];
  const start = cur.at * dur;
  const curPose = actionPose(cur.action, t - start, seed);
  let pose = curPose;
  if (i > 0) {
    const prev = acts[i - 1];
    const prevPose = actionPose(prev.action, t - prev.at * dur, seed);
    pose = blendPose(prevPose, curPose, (t - start) / 0.28);
  }
  // Walking moves the puppet between x positions
  let x = beat.x;
  for (let k = 0; k <= i; k++) {
    const a = acts[k];
    if (a.action === 'walk' && a.toX !== undefined) {
      const end = k + 1 < acts.length ? acts[k + 1].at * dur : dur;
      const fromX = x;
      const p = k === i ? clamp01((t - a.at * dur) / Math.max(0.1, end - a.at * dur)) : 1;
      x = lerp(fromX, a.toX, p);
    }
  }
  let expr = beat.expression ?? 'happy';
  for (let k = 0; k <= i; k++) if (acts[k].expression) expr = acts[k].expression!;
  return { pose, x, expr };
}

export const Puppet: React.FC<PuppetRenderProps> = ({ beat, t, dur, mouthLevel, frameW, frameH }) => {
  const id = beat.id as PuppetId;
  const outfit = (beat.outfit ?? 'default') as Outfit;
  const seed = id.length * 1.7 + beat.x * 10;
  const { pose, x, expr } = resolvePose(beat, t, dur, seed);
  const look = lookFor(id, outfit);
  const uid = `pp-${id}-${Math.round(beat.x * 1000)}`;
  const facing = beat.facing ?? 'front';
  const flip = facing === 'left' ? -1 : 1;
  const blink = (t + seed) % 3.7 > 3.58;
  const scale = (beat.scale ?? 1) * (frameH / 1920);
  const thigh = 92 * look.legLen;
  const shin = 86 * look.legLen;
  const hipY = -(thigh + shin + 26);
  const upper = 76;
  const fore = 70;
  const handR = 15;
  const shoulderY = -130;

  const arm = (side: 1 | -1, sh: number, el: number) => (
    <g transform={`translate(${side * 74},${shoulderY}) rotate(${-side * sh})`}>
      <Limb len={upper} w={34} fill={look.sleeve} shade={look.sleeveShade} />
      <g transform={`translate(0,${upper}) rotate(${-side * el})`}>
        <Limb len={fore} w={30} fill={look.sleeve} shade={look.sleeveShade} />
        <circle cx={0} cy={fore + 10} r={handR} fill={SKIN} stroke={INK} strokeWidth={STROKE} />
      </g>
    </g>
  );
  const leg = (side: 1 | -1, hip: number, knee: number) => (
    <g transform={`translate(${side * 30},${hipY + 10}) rotate(${-side * hip})`}>
      <Limb len={thigh} w={36} fill={look.pants} />
      <g transform={`translate(0,${thigh}) rotate(${side * knee})`}>
        <Limb len={shin} w={32} fill={look.legSkin ? SKIN : look.pants} />
        <ellipse cx={side * 8} cy={shin + 16} rx={26} ry={13} fill={look.shoe} stroke={INK} strokeWidth={STROKE} />
      </g>
    </g>
  );

  const px = x * frameW;
  const py = beat.y * frameH + pose.bob * scale;
  return (
    <g transform={`translate(${px.toFixed(1)},${py.toFixed(1)}) scale(${(scale * flip).toFixed(4)},${scale.toFixed(4)})`}>
      <defs>
        <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={lightenFor(id, outfit)} />
          <stop offset="1" stopColor={look.sleeveShade} />
        </linearGradient>
        <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9D3C2" />
        </linearGradient>
        <radialGradient id={`${uid}-skin`} cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFF4D6" />
          <stop offset="0.7" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
      </defs>
      {/* contact shadow */}
      <ellipse cx={0} cy={4} rx={78} ry={14} fill="#2A1A10" opacity={0.28} />
      {leg(-1, pose.lH, pose.lK)}
      {leg(1, pose.rH, pose.rK)}
      <g transform={`translate(0,${hipY}) rotate(${pose.lean})`}>
        {arm(-1, pose.lS, pose.lE)}
        <Torso id={id} outfit={outfit} uid={uid} />
        {arm(1, pose.rS, pose.rE)}
        <g transform={`translate(0,${shoulderY - 6}) rotate(${pose.tilt}) translate(0,-112) scale(1.24)`}>
          {/* back hair / bun behind head */}
          {(id === 'chloe' || id === 'granny') && <Headwear id={id} outfit={outfit} front={false} />}
          <ellipse cx={-98} cy={14} rx={16} ry={22} fill={SKIN} stroke={INK} strokeWidth={STROKE} />
          <ellipse cx={98} cy={14} rx={16} ry={22} fill={SKIN} stroke={INK} strokeWidth={STROKE} />
          <ellipse cx={0} cy={0} rx={100} ry={96} fill={`url(#${uid}-skin)`} stroke={INK} strokeWidth={STROKE} />
          <g transform={`scale(${flip},1)`}>
            <Face id={id} expression={expr} blink={blink} mouthLevel={mouthLevel} look={facing === 'front' ? 0 : 1} />
          </g>
          <Headwear id={id} outfit={outfit} front={true} />
        </g>
      </g>
    </g>
  );
};

function lightenFor(id: PuppetId, outfit: Outfit): string {
  if (outfit === 'labcoat') return '#FFFFFF';
  switch (id) {
    case 'alex':
      return '#56607F';
    case 'chloe':
      return '#76A35A';
    case 'mayor':
      return '#FFF8DE';
    case 'chef':
      return '#FFFFFF';
    case 'granny':
      return '#A574B6';
  }
}
