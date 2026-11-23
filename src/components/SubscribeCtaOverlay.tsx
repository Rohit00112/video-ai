import React from 'react';
import { clamp, easeInOutCubic, lerp, springPop } from '../utils/math.js';

interface SubscribeCtaOverlayProps {
  visible: boolean;
  sceneElapsedSeconds: number;
  sceneDurationSeconds: number;
  bottom?: string | number;
}

/**
 * Animated Like + Subscribe + Bell button strip inspired by reference finale (01:01 - 01:03)
 */
export const SubscribeCtaOverlay: React.FC<SubscribeCtaOverlayProps> = ({
  visible,
  sceneElapsedSeconds,
  sceneDurationSeconds,
  bottom,
}) => {
  if (!visible) return null;

  const progress = clamp(sceneElapsedSeconds / Math.max(0.1, sceneDurationSeconds), 0, 1);
  const entrance = springPop(Math.max(0, sceneElapsedSeconds - 0.12), 230, 15);
  const clicked = progress >= 0.37;
  const bellActive = progress >= 0.54;

  // Cursor smoothly approaches the Subscribe button then clicks it
  const cursorT = easeInOutCubic(clamp((progress - 0.14) / 0.22, 0, 1));
  const cursorX = lerp(180, -10, cursorT);
  const cursorY = lerp(170, 26, cursorT);
  const cursorOpacity = progress < 0.14 ? 0 : progress > 0.52 ? clamp(1 - (progress - 0.52) / 0.12, 0, 1) : 1;
  const clickPress = Math.abs(progress - 0.37) < 0.04 ? 0.92 : 1;
  const bellSwing = bellActive ? Math.sin((progress - 0.54) * 44) * Math.exp(-(progress - 0.54) * 6) * 22 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: bottom ?? undefined,
        top: bottom ? undefined : '27%',
        left: '50%',
        transform: `translate(-50%, ${bottom ? '0%' : '-50%'}) scale(${clamp(entrance, 0.001, 1.12).toFixed(4)})`,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        pointerEvents: 'none',
        fontFamily: '"Arial Rounded MT Bold", "Helvetica Neue", sans-serif',
      }}
    >
      {/* Blue Like Button */}
      <div
        style={{
          width: 112,
          height: 112,
          borderRadius: '50%',
          background: '#2265D9',
          border: '6px solid #141414',
          boxShadow: '0 8px 18px rgba(0,0,0,0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${progress > 0.25 ? 1.06 : 1})`,
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.59 6.59C7.22 6.95 7 7.45 7 8v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
        </svg>
      </div>

      {/* SUBSCRIBE -> SUBSCRIBED Pill */}
      <div
        style={{
          position: 'relative',
          padding: '26px 48px',
          borderRadius: 32,
          background: clicked ? '#D3D7DC' : '#DF2922',
          color: clicked ? '#181818' : '#FFFFFF',
          border: '6px solid #141414',
          boxShadow: '0 8px 18px rgba(0,0,0,0.32)',
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: '0.03em',
          transform: `scale(${clickPress})`,
        }}
      >
        {clicked ? 'SUBSCRIBED' : 'SUBSCRIBE'}

        {/* Animated Cursor Arrow */}
        <svg
          width="66"
          height="66"
          viewBox="0 0 48 48"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(${cursorX}px, ${cursorY}px) scale(${clickPress})`,
            opacity: cursorOpacity,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
          }}
        >
          <path
            d="M8 4 L40 22 L25 26 L32 42 L25 45 L18 29 L8 36 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Notification Bell Button (pops in right after subscribing) */}
      {clicked && (
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '6px solid #141414',
            boxShadow: '0 8px 18px rgba(0,0,0,0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${clamp(springPop(Math.max(0, (progress - 0.37) * sceneDurationSeconds), 260, 14), 0.01, 1.15)}) rotate(${bellSwing.toFixed(1)}deg)`,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill={bellActive ? '#F5B82E' : '#141414'} stroke="#141414" strokeWidth="1.5">
            <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </div>
      )}
    </div>
  );
};
