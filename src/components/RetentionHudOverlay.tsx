import React from 'react';
import { SceneScript } from '../services/scripting/schema.js';
import { clamp, createSeededRng, springPop } from '../utils/math.js';

interface RetentionHudOverlayProps {
  scene: SceneScript;
  sceneElapsedSeconds: number;
  sceneDurationSeconds: number;
  sceneProgress: number;
  globalProgress: number;
  globalSeconds: number;
}

const TONES = {
  yellow: { bg: '#FFD60A', text: '#141414' },
  red: { bg: '#E5243B', text: '#FFFFFF' },
  green: { bg: '#2BD45E', text: '#0B2414' },
  white: { bg: '#FFFFFF', text: '#141414' },
};

/**
 * Shorts retention layer:
 * - Big tilted "hook" title card at the top of the frame (stays readable over the 3D)
 * - Emoji burst that explodes from screen center on a story beat
 * - Slim watch-progress bar so viewers feel how close the payoff is
 */
export const RetentionHudOverlay: React.FC<RetentionHudOverlayProps> = ({
  scene,
  sceneElapsedSeconds,
  sceneDurationSeconds,
  sceneProgress,
  globalProgress,
  globalSeconds,
}) => {
  const hud = scene.hud;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Watch progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: 'rgba(0,0,0,0.35)' }}>
        <div
          style={{
            width: `${(clamp(globalProgress, 0, 1) * 100).toFixed(2)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FF3D3D, #FFD60A)',
            boxShadow: '0 0 14px rgba(255, 214, 10, 0.8)',
          }}
        />
      </div>

      {hud?.topTitle && <TopTitle text={hud.topTitle} tone={hud.topTitleTone ?? 'yellow'} elapsed={sceneElapsedSeconds} remaining={sceneDurationSeconds - sceneElapsedSeconds} globalSeconds={globalSeconds} />}

      {hud?.emojiBurst && sceneProgress >= hud.emojiBurst.atRatio && (
        <EmojiBurst
          emoji={hud.emojiBurst.emoji}
          count={hud.emojiBurst.count}
          elapsed={(sceneProgress - hud.emojiBurst.atRatio) * sceneDurationSeconds}
          seed={scene.sceneNumber * 97}
        />
      )}
    </div>
  );
};

const TopTitle: React.FC<{ text: string; tone: keyof typeof TONES; elapsed: number; remaining: number; globalSeconds: number }> = ({
  text,
  tone,
  elapsed,
  remaining,
  globalSeconds,
}) => {
  const pop = clamp(springPop(elapsed, 360, 14), 0, 1.15);
  const out = clamp(remaining / 0.12, 0, 1);
  const wobble = Math.sin(globalSeconds * 3.2) * 1.2;
  const c = TONES[tone];
  // V3 slam: drop from above for 0.16s, then squash on landing and settle
  const DROP = 0.16;
  const dropT = clamp(elapsed / DROP, 0, 1);
  const dropY = (1 - dropT * dropT) * -320;
  const sinceLand = Math.max(0, elapsed - DROP);
  const squash = elapsed < DROP ? 0 : 0.22 * Math.exp(-sinceLand * 9) * Math.cos(sinceLand * 24);
  const scaleX = pop * (1 + squash);
  const scaleY = pop * (1 - squash);
  return (
    <div
      style={{
        position: 'absolute',
        top: 210,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: out,
      }}
    >
      <div
        style={{
          transform: `translateY(${dropY.toFixed(1)}px) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) rotate(${(-3 + wobble).toFixed(2)}deg)`,
          transformOrigin: '50% 100%',
          background: c.bg,
          color: c.text,
          padding: '22px 44px',
          borderRadius: 26,
          border: '8px solid #141414',
          boxShadow: '0 14px 0 #141414, 0 22px 40px rgba(0,0,0,0.45)',
          fontFamily: '"Arial Rounded MT Bold", "Arial Black", sans-serif',
          fontWeight: 900,
          fontSize: 78,
          lineHeight: 1.02,
          textTransform: 'uppercase',
          textAlign: 'center',
          maxWidth: 900,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const EmojiBurst: React.FC<{ emoji: string; count: number; elapsed: number; seed: number }> = ({ emoji, count, elapsed, seed }) => {
  if (elapsed > 1.6) return null;
  const rng = createSeededRng(seed);
  const parts = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.6;
    const speed = 520 + rng() * 380;
    const spin = (rng() - 0.5) * 540;
    const size = 90 + rng() * 70;
    return { angle, speed, spin, size };
  });
  return (
    <>
      {parts.map((p, i) => {
        const t = elapsed;
        const x = Math.cos(p.angle) * p.speed * t;
        const y = Math.sin(p.angle) * p.speed * t + 900 * t * t - 120 * t;
        const opacity = clamp(1 - (t - 0.9) / 0.7, 0, 1);
        const s = clamp(springPop(t, 380, 12), 0, 1.2);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 540 + x - p.size / 2,
              top: 820 + y - p.size / 2,
              fontSize: p.size,
              opacity,
              transform: `scale(${s.toFixed(3)}) rotate(${(p.spin * t).toFixed(1)}deg)`,
              filter: 'drop-shadow(0 8px 6px rgba(0,0,0,0.35))',
            }}
          >
            {emoji}
          </div>
        );
      })}
    </>
  );
};
