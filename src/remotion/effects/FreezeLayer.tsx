import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * "Time stopped" look for Blender footage: cool, slightly desaturated grade while frozen,
 * plus a soft ripple ring on the snap (freeze) and a warm ripple on the unfreeze.
 */
export const FreezeLayer: React.FC<{
  durationFrames: number;
  from: number;
  to: number;
  children: React.ReactNode;
}> = ({ durationFrames, from, to, children }) => {
  const f = useCurrentFrame();
  const f0 = Math.round(from * durationFrames);
  const f1 = Math.round(to * durationFrames);
  const fadeIn = f0 === 0 ? 1 : interpolate(f, [f0, f0 + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = to >= 1 ? 1 : interpolate(f, [f1, f1 + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const k = Math.min(fadeIn, fadeOut);

  const ring = (start: number, color: string) => {
    const t = (f - start) / 16;
    if (start <= 0 || t < 0 || t > 1) return null;
    const size = interpolate(t, [0, 1], [80, 2300]);
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: '50%',
          border: `${interpolate(t, [0, 1], [26, 4])}px solid ${color}`,
          opacity: interpolate(t, [0, 0.15, 1], [0, 0.85, 0]),
          boxShadow: `0 0 40px ${color}`,
        }}
      />
    );
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: k > 0 ? `saturate(${1 - 0.32 * k}) brightness(${1 + 0.03 * k})` : undefined }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: 'rgb(110,170,235)', mixBlendMode: 'soft-light', opacity: 0.35 * k }} />
      {ring(f0, 'rgba(200,235,255,0.95)')}
      {to < 1 ? ring(f1, 'rgba(255,225,160,0.95)') : null}
    </AbsoluteFill>
  );
};
