import React from 'react';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import { CaptionChunk, EnvironmentState } from '../../services/scripting/schema.js';
import { clamp, springPop } from '../../utils/math.js';

interface CaptionOverlayProps {
  captions: CaptionChunk[];
  sceneLocalFrame: number;
  fps: number;
  worldTheme?: EnvironmentState['worldTheme'];
  highlights?: string[];
  variant?: 'karaoke' | 'documentary' | 'storytime';
  /** Painted scenes: speaker mouth height (0..1). Storytime captions move below the chin so lip-sync stays visible */
  avoidY?: number;
}

const HIGHLIGHT_PALETTE = ['#FFE14D', '#5CFF7A', '#FF5C8A', '#4DD8FF'];

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9$%'-]/g, '');
}

/** Numbers, money and explicitly flagged story words pop in color */
function isKeyword(word: string, highlights: Set<string>): boolean {
  const w = normalize(word);
  if (!w) return false;
  if (highlights.has(w)) return true;
  if (/[0-9$%]/.test(w)) return true;
  return false;
}

/**
 * Retention-style kinetic captions (Shorts/TikTok idiom):
 * - Big uppercase rounded type with thick ink stroke, placed above the Shorts UI safe zone
 * - Karaoke active-word emphasis (the spoken word scales up and lights up)
 * - Keywords (numbers, money, flagged story words) colored for scannability
 * - Springy pop-in per chunk with alternating micro tilt
 */
export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  captions,
  sceneLocalFrame,
  fps,
  worldTheme,
  highlights = [],
  variant = 'karaoke',
  avoidY,
}) => {
  const activeIndex = captions.findIndex(
    (c) => sceneLocalFrame >= c.startFrame && sceneLocalFrame <= c.endFrame
  );
  if (activeIndex < 0) return null;
  const active = captions[activeIndex];

  if (variant === 'documentary') {
    return <DocumentaryCaption text={active.text} />;
  }
  if (variant === 'storytime') {
    // Default sits at 30% from bottom (centre ≈ 0.67); if a speaking mouth is near there, drop below the chin
    const bottomPct =
      avoidY !== undefined && avoidY > 0.45 && avoidY < 0.8 ? (1 - Math.min(0.83, avoidY + 0.14)) * 100 : 30;
    return <StorytimeCaption text={active.text} elapsed={(sceneLocalFrame - active.startFrame) / fps} bottomPct={bottomPct} />;
  }

  const highlightSet = new Set(highlights.map(normalize));
  const elapsed = (sceneLocalFrame - active.startFrame) / fps;
  const pop = springPop(elapsed, 420, 18);
  const scale = clamp(0.7 + pop * 0.3, 0.7, 1.1);
  const tilt = activeIndex % 2 === 0 ? -2 : 2;

  const neon = worldTheme === 'space_chaos' || worldTheme === 'subway_chaos';
  const baseFill = neon ? '#FFFFFF' : STYLE_TOKENS.colors.captionFill;

  const words =
    active.words && active.words.length > 0
      ? active.words
      : active.text.split(/\s+/).map((t) => ({ text: t, startFrame: active.startFrame }));

  // V3: shrink the chunk when its longest word would clip at the frame edges.
  // ~0.76 em per uppercase glyph (Arial Rounded/Black), +14% for the active-word pop.
  const usableWidth = 1080 - 140 - 40;
  const longest = Math.max(...words.map((w) => w.text.length));
  const fontSize = Math.min(104, Math.floor(usableWidth / (Math.max(1, longest) * 0.76 * 1.14)));

  // Which word is being spoken right now
  let speaking = 0;
  for (let i = 0; i < words.length; i++) {
    if (sceneLocalFrame >= words[i].startFrame) speaking = i;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '29%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        padding: '0 70px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          rowGap: 0,
          transform: `scale(${scale.toFixed(4)}) rotate(${tilt}deg)`,
          fontFamily: '"Arial Rounded MT Bold", "Arial Black", "Helvetica Neue", sans-serif',
          fontSize,
          fontWeight: 900,
          lineHeight: 1.04,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {words.map((w, i) => {
          const spoken = sceneLocalFrame >= w.startFrame;
          const isActive = i === speaking;
          const keyword = isKeyword(w.text, highlightSet);
          const color = keyword
            ? HIGHLIGHT_PALETTE[(activeIndex + i) % HIGHLIGHT_PALETTE.length]
            : baseFill;
          const wordElapsed = Math.max(0, (sceneLocalFrame - w.startFrame) / fps);
          // V3: keywords punch in harder (1.32x spring) the moment they are spoken
          const wordPop = keyword && spoken
            ? 1 + 0.32 * Math.exp(-wordElapsed * 7) * Math.cos(wordElapsed * 14)
            : isActive
            ? 1 + 0.14 * Math.exp(-wordElapsed * 6)
            : 1;
          return (
            <span
              key={`${i}-${w.text}`}
              style={{
                display: 'inline-block',
                margin: '0 20px',
                transformOrigin: '50% 60%',
                color,
                opacity: spoken ? 1 : 0.55,
                transform: `scale(${((keyword ? 1.08 : 1) * wordPop).toFixed(3)}) translateY(${isActive ? -6 : 0}px)`,
                WebkitTextStroke: `${Math.round(18 * (fontSize / 104))}px ${STYLE_TOKENS.colors.captionStroke}`,
                paintOrder: 'stroke fill',
                textShadow: keyword
                  ? `0 0 26px ${color}88, 0 10px 0 rgba(0,0,0,0.55)`
                  : '0 10px 0 rgba(0,0,0,0.5)',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Storytime caption (reference: Ricks Clips Shorts): one spoken word at a time, sentence case as spoken,
 * bold white with a firm black stroke, lower-middle of the frame, tiny settle-in pop.
 */
const StorytimeCaption: React.FC<{ text: string; elapsed: number; bottomPct?: number }> = ({ text, elapsed, bottomPct = 30 }) => {
  const pop = clamp(springPop(elapsed, 520, 22), 0, 1.06);
  const scale = 0.86 + 0.14 * pop;
  const fontSize = Math.min(92, Math.floor(860 / (Math.max(1, text.length) * 0.62)));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${bottomPct.toFixed(1)}%`, display: 'flex', justifyContent: 'center', padding: '0 80px', pointerEvents: 'none' }}>
      <div
        style={{
          transform: `scale(${scale.toFixed(3)})`,
          fontFamily: '"Arial Rounded MT Bold", "Nunito", "Helvetica Neue", Arial, sans-serif',
          fontWeight: 900,
          fontSize,
          color: '#FFFFFF',
          textAlign: 'center',
          lineHeight: 1.05,
          WebkitTextStroke: '12px #111111',
          paintOrder: 'stroke fill',
          textShadow: '0 6px 10px rgba(0,0,0,0.45)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Clean zackdfilms-style caption: bold white lowercase, thin dark outline + soft shadow, no motion */
const DocumentaryCaption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '27%', display: 'flex', justifyContent: 'center', padding: '0 90px', pointerEvents: 'none' }}>
    <div
      style={{
        fontFamily: '"Helvetica Neue", "Arial", sans-serif',
        fontWeight: 800,
        fontSize: 82,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 1.05,
        WebkitTextStroke: '6px rgba(0,0,0,0.85)',
        paintOrder: 'stroke fill',
        textShadow: '0 4px 14px rgba(0,0,0,0.55)',
      }}
    >
      {text}
    </div>
  </div>
);
