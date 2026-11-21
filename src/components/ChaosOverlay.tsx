import React from 'react';
import { SceneScript } from '../services/scripting/schema.js';
import { clamp, springPop } from '../utils/math.js';

interface ChaosOverlayProps {
  scene: SceneScript;
  sceneElapsedSeconds: number;
  globalSeconds: number;
}

/**
 * Custom sci-fi HUD & neon synthwave comedy overlays for unique chaos Shorts
 * (zero overlap with earlier village/harbor/experiment visual templates).
 */
export const ChaosOverlay: React.FC<ChaosOverlayProps> = ({
  scene,
  sceneElapsedSeconds,
  globalSeconds,
}) => {
  const hud = scene.chaosHud;
  if (!hud) return null;

  const pop = clamp(springPop(sceneElapsedSeconds, 280, 15), 0.01, 1.12);
  const pulse = 0.78 + 0.22 * Math.sin(globalSeconds * 12);

  const bannerPalette = {
    red_alert: { bg: '#D91E2A', border: '#FFE047', text: '#FFFFFF', glow: 'rgba(255, 30, 50, 0.65)' },
    cyan_holo: { bg: 'rgba(8, 28, 52, 0.88)', border: '#2BF5FF', text: '#2BF5FF', glow: 'rgba(43, 245, 255, 0.55)' },
    neon_magenta: { bg: 'rgba(24, 8, 42, 0.9)', border: '#FF2E93', text: '#2AF598', glow: 'rgba(255, 46, 147, 0.6)' },
    gold_ceo: { bg: '#F5C542', border: '#141414', text: '#141414', glow: 'rgba(245, 197, 66, 0.65)' },
  };
  const colors = bannerPalette[hud.bannerTone ?? 'cyan_holo'];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Red Alert pulsing edge frame */}
      {hud.bannerTone === 'red_alert' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 110px rgba(255, 24, 48, ${(0.3 + 0.35 * Math.abs(Math.sin(globalSeconds * 8))).toFixed(2)})`,
          }}
        />
      )}

      {/* Top Graphic HUD Banner */}
      {hud.bannerText && (
        <div
          style={{
            position: 'absolute',
            top: '9%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${pop.toFixed(4)}) rotate(${hud.bannerTone === 'red_alert' ? -2 : 0}deg)`,
            opacity: hud.bannerTone === 'red_alert' ? pulse : 1,
            background: colors.bg,
            border: `7px solid ${colors.border}`,
            borderRadius: 22,
            padding: '18px 42px',
            boxShadow: `0 0 36px ${colors.glow}`,
            fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
            fontSize: 44,
            fontWeight: 900,
            color: colors.text,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {hud.bannerText}
        </div>
      )}

      {/* Punchy Comic Callout Badge */}
      {hud.calloutText && (
        <div
          style={{
            position: 'absolute',
            top: '21%',
            right: 48,
            transform: `scale(${clamp(springPop(Math.max(0, sceneElapsedSeconds - 0.3), 300, 14), 0.01, 1.15).toFixed(4)}) rotate(6deg)`,
            background: '#FFE047',
            border: '7px solid #141414',
            borderRadius: 20,
            padding: '14px 28px',
            boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
            fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
            fontSize: 38,
            fontWeight: 900,
            color: '#141414',
          }}
        >
          {hud.calloutText}
        </div>
      )}

      {/* Ridiculous Subway Vending Machine 20% Tip Receipt Popup */}
      {hud.receiptPopup && (
        <div
          style={{
            position: 'absolute',
            top: '24%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${pop.toFixed(4)}) rotate(-3deg)`,
            width: 520,
            background: '#FFFDF7',
            border: '8px solid #141414',
            borderRadius: 16,
            padding: '28px 34px',
            boxShadow: '0 20px 44px rgba(255, 46, 147, 0.45)',
            fontFamily: '"Courier New", monospace',
            color: '#141414',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 900, textAlign: 'center', borderBottom: '4px dashed #141414', paddingBottom: 12 }}>
            VEND-O-TRON RECEIPT
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, marginTop: 16 }}>
            <span>1x MYSTERY SNACK</span>
            <span>$0.99</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, marginTop: 8, color: '#D91E2A' }}>
            <span>ATTITUDE FEE</span>
            <span>+20% TIP</span>
          </div>
          <div
            style={{
              marginTop: 18,
              background: '#FF2E93',
              color: '#FFFFFF',
              textAlign: 'center',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 24,
              fontWeight: 900,
              fontFamily: '"Arial Black", sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            PAY TIP OR I CALL MOM
          </div>
        </div>
      )}
    </div>
  );
};
