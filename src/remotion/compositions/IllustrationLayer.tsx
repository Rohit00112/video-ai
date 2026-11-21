import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CompiledScene, ProductionPlan } from '../../services/scripting/schema.js';
import { clamp } from '../../utils/math.js';
import { Puppet } from '../puppets/Puppet.js';

const W = 1080;
const H = 1920;

/** Public path convention for ingested painted scenes */
export function illustrationPath(storyId: string, sceneNumber: number): string {
  return `illustrations/${storyId}/scene-${String(sceneNumber).padStart(2, '0')}.jpg`;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** 2.5D camera move on a still: returns CSS transform + origin for scene progress p (0..1) */
function motionTransform(
  motion: NonNullable<CompiledScene['scene']['illustration']>['motion'],
  focus: [number, number],
  p: number,
  seconds: number
): { transform: string; origin: string } {
  const t = easeInOut(clamp(p, 0, 1));
  // Gentle hand-held breathing so stills never feel frozen
  const sway = Math.sin(seconds * 0.9) * 0.18;
  const breathe = 1 + Math.sin(seconds * 1.7) * 0.004;
  let scale = 1.06;
  let tx = 0;
  let ty = 0;
  switch (motion) {
    case 'push_in':
      scale = 1.04 + 0.1 * t;
      break;
    case 'pull_out':
      scale = 1.14 - 0.1 * t;
      break;
    case 'pan_left':
      scale = 1.12;
      tx = (0.03 - 0.06 * t) * W;
      break;
    case 'pan_right':
      scale = 1.12;
      tx = (-0.03 + 0.06 * t) * W;
      break;
    case 'drift_up':
      scale = 1.1;
      ty = (0.02 - 0.04 * t) * H;
      break;
    case 'hold':
    default:
      scale = 1.05 + 0.015 * t;
  }
  return {
    transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${(scale * breathe).toFixed(4)}) rotate(${sway.toFixed(3)}deg)`,
    origin: `${(focus[0] * 100).toFixed(1)}% ${(focus[1] * 100).toFixed(1)}%`,
  };
}

/**
 * Lip-sync mouth drawn over the painted face. While talking it first hides the painted mouth
 * (smile/frown) with a feathered patch of the sampled skin colour, then draws an open mouth sized to the face.
 * When silent, nothing is drawn and the original painted mouth shows.
 */
const PaintedMouth: React.FC<{ x: number; y: number; w: number; coverW?: number; skin?: string; level: number }> = ({
  x,
  y,
  w,
  coverW,
  skin,
  level,
}) => {
  if (level < 0.14) return null;
  const width = w * W * (0.82 + 0.18 * level);
  const open = level < 0.4 ? 0.3 : level < 0.72 ? 0.5 : 0.68;
  const height = width * open;
  const cw = (coverW ?? w * 1.2) * W;
  const ch = Math.max(cw * 0.42, height * 1.5);
  return (
    <>
      {skin && (
        <div
          style={{
            position: 'absolute',
            left: x * W - cw * 0.66,
            top: y * H - ch * 0.62,
            width: cw * 1.32,
            height: ch * 1.24,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 50% 50%, ${skin} 0 58%, ${skin}00 74%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: x * W - width / 2,
          top: y * H - height / 2,
          width,
          height,
          borderRadius: '50% 50% 48% 48% / 40% 40% 60% 60%',
          background: 'radial-gradient(ellipse at 50% 85%, #C9545E 0 34%, #4A2219 36% 100%)',
          border: `${Math.max(2, width * 0.07).toFixed(1)}px solid #3B2416`,
          boxSizing: 'border-box',
        }}
      />
    </>
  );
};

/** Envelope → 3 mouth openness levels, closed (-1) in pauses */
const speakLevel = (lvl: number) => (lvl < 0.14 ? -1 : lvl < 0.4 ? 0.33 : lvl < 0.72 ? 0.66 : 1);

const PaintedScene: React.FC<{ plan: ProductionPlan; compiled: CompiledScene }> = ({ plan, compiled }) => {
  const frame = useCurrentFrame(); // local to this scene's Sequence
  const ill = compiled.scene.illustration!;
  const p = frame / Math.max(1, compiled.durationFrames - 1);
  const { transform, origin } = motionTransform(ill.motion, ill.focus, p, (compiled.startFrame + frame) / plan.fps);
  const level = compiled.mouthEnvelope?.[frame] ?? 0;
  // Short scene-entry fade from the previous scene to hide hard image cuts
  const fadeIn = clamp(frame / 4, 0, 1);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#1A120C', opacity: fadeIn }}>
      <div style={{ position: 'absolute', width: W, height: H, transform, transformOrigin: origin }}>
        <Img
          src={staticFile(illustrationPath(plan.concept.id, compiled.scene.sceneNumber))}
          style={{ width: W, height: H, objectFit: 'cover', display: 'block' }}
        />
        {compiled.scene.puppets && compiled.scene.puppets.length > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            {[...compiled.scene.puppets]
              .sort((a, b) => a.y - b.y)
              .map((beat) => (
                <Puppet
                  key={beat.id}
                  beat={beat}
                  t={frame / plan.fps}
                  dur={compiled.durationFrames / plan.fps}
                  mouthLevel={compiled.scene.speaker === beat.id ? speakLevel(level) : -1}
                  frameW={W}
                  frameH={H}
                />
              ))}
          </svg>
        )}
        {!compiled.scene.puppets && ill.mouth && compiled.scene.speaker && (
          <PaintedMouth x={ill.mouth.x} y={ill.mouth.y} w={ill.mouth.w} coverW={ill.mouth.coverW} skin={ill.mouth.skin} level={level} />
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Painted-scene video layer: one illustration per scene with 2.5D motion and lip-sync */
export const IllustrationLayer: React.FC<{ plan: ProductionPlan; frameOffset: number }> = ({ plan, frameOffset }) => (
  <AbsoluteFill>
    {plan.scenes.map((s) =>
      s.scene.illustration ? (
        <Sequence key={s.scene.id} from={s.startFrame - frameOffset} durationInFrames={s.durationFrames} name={`ART-${s.scene.id}`}>
          <PaintedScene plan={plan} compiled={s} />
        </Sequence>
      ) : null
    )}
  </AbsoluteFill>
);
