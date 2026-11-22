import React from 'react';
import { ProjectedBubbleState } from '../three/core/SceneManager.js';
import { clamp, lerp, springPop } from '../utils/math.js';

interface ThoughtBubbleOverlayProps {
  bubbles: ProjectedBubbleState[];
  width: number;
  height: number;
}

const BubbleContent: React.FC<{ item: ProjectedBubbleState }> = ({ item }) => {
  const { cue, localProgress } = item;

  switch (cue.kind) {
    case 'question':
      return (
        <span
          style={{
            fontSize: 78,
            fontWeight: 900,
            color: '#141414',
            lineHeight: 1,
          }}
        >
          ?
        </span>
      );

    case 'splash_text':
      return (
        <span
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#141414',
            letterSpacing: '-0.02em',
          }}
        >
          {cue.label ?? 'splash!'}
        </span>
      );

    case 'zero_liters':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.02 }}>
          <span style={{ fontSize: 54, fontWeight: 900, color: '#141414' }}>0</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#355A7A' }}>liters</span>
        </div>
      );

    case 'one_bucket':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.05 }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: '#141414' }}>1</span>
          <span style={{ fontSize: 27, fontWeight: 800, color: '#141414' }}>bucket</span>
        </div>
      );

    case 'half_drop':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="56" height="62" viewBox="0 0 56 62">
            <path
              d="M28 5 C28 5 9 28 9 41 C9 51 17.5 58 28 58 C38.5 58 47 51 47 41 C47 28 28 5 28 5 Z"
              fill="#FFFFFF"
              stroke="#141414"
              strokeWidth="4.5"
            />
            <clipPath id="halfClip">
              <rect x="0" y="36" width="56" height="30" />
            </clipPath>
            <path
              d="M28 5 C28 5 9 28 9 41 C9 51 17.5 58 28 58 C38.5 58 47 51 47 41 C47 28 28 5 28 5 Z"
              fill="#35A3E8"
              clipPath="url(#halfClip)"
            />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#141414' }}>50%</span>
        </div>
      );

    case 'calendar': {
      const startVal = cue.counterStart ?? 1;
      const endVal = cue.counterEnd ?? 30;
      const currentDay = Math.round(lerp(startVal, endVal, clamp(localProgress * 1.08, 0, 1)));
      return (
        <div
          style={{
            width: 96,
            height: 98,
            borderRadius: 14,
            border: '5px solid #141414',
            overflow: 'hidden',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#D93B2B',
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 900,
              textAlign: 'center',
              padding: '4px 0',
              borderBottom: '4px solid #141414',
            }}
          >
            DAY
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: currentDay >= 100 ? 34 : 42,
              fontWeight: 900,
              color: '#141414',
            }}
          >
            {currentDay}
          </div>
        </div>
      );
    }

    case 'lightbulb':
      return (
        <svg width="86" height="86" viewBox="0 0 86 86">
          <g stroke="#F5B82E" strokeWidth="5" strokeLinecap="round">
            <line x1="43" y1="6" x2="43" y2="15" />
            <line x1="15" y1="20" x2="22" y2="26" />
            <line x1="71" y1="20" x2="64" y2="26" />
            <line x1="10" y1="44" x2="19" y2="44" />
            <line x1="67" y1="44" x2="76" y2="44" />
          </g>
          <path
            d="M43 21 C30 21 22 30 22 42 C22 50 27 55 31 60 L31 66 L55 66 L55 60 C59 55 64 50 64 42 C64 30 56 21 43 21 Z"
            fill="#FFE047"
            stroke="#141414"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <rect x="33" y="66" width="20" height="10" rx="4" fill="#9AA3AB" stroke="#141414" strokeWidth="4" />
        </svg>
      );

    case 'pipe_icon':
      return (
        <svg width="96" height="72" viewBox="0 0 96 72">
          <rect x="10" y="24" width="76" height="24" rx="7" fill="#C99B49" stroke="#141414" strokeWidth="4.5" />
          <line x1="34" y1="24" x2="34" y2="48" stroke="#141414" strokeWidth="4" />
          <line x1="62" y1="24" x2="62" y2="48" stroke="#141414" strokeWidth="4" />
          <path d="M18 14 L78 14 M70 7 L78 14 L70 21" fill="none" stroke="#35A3E8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'counter': {
      const startVal = cue.counterStart ?? 1;
      const endVal = cue.counterEnd ?? 100;
      const currentVal = Math.round(lerp(startVal, endVal, clamp(localProgress * 1.12, 0, 1)));
      const hasSuffix = Boolean(cue.counterSuffix && cue.counterSuffix.length > 0);
      return (
        <span
          style={{
            fontSize: hasSuffix ? 46 : currentVal >= 100 ? 64 : 74,
            fontWeight: 900,
            color: '#141414',
            letterSpacing: '-0.03em',
          }}
        >
          {currentVal}
          {cue.counterSuffix ?? ''}
        </span>
      );
    }

    case 'heart':
      return (
        <svg width="78" height="74" viewBox="0 0 78 74">
          <path
            d="M39 65 C39 65 9 47 9 25 C9 14 18 7 28 7 C34 7 37 11 39 15 C41 11 44 7 50 7 C60 7 69 14 69 25 C69 47 39 65 39 65 Z"
            fill="#E53935"
            stroke="#141414"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <ellipse cx="25" cy="22" rx="6" ry="4" fill="rgba(255,255,255,0.45)" transform="rotate(-25 25 22)" />
        </svg>
      );

    case 'seed_icon':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <path
              d="M32 10 C45 20 48 38 32 54 C16 38 19 20 32 10 Z"
              fill="#C89342"
              stroke="#141414"
              strokeWidth="4.5"
            />
            <path d="M32 16 C35 28 35 38 32 48" stroke="#6E4A1D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#141414' }}>{cue.label ?? '1 seed'}</span>
        </div>
      );

    case 'zero_cm':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.02 }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#141414' }}>0 cm</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#7A5430' }}>dirt</span>
        </div>
      );

    case 'year_calendar': {
      const startVal = cue.counterStart ?? 1;
      const endVal = cue.counterEnd ?? 4;
      const currentYr = Math.round(lerp(startVal, endVal, clamp(localProgress * 1.05, 0, 1)));
      return (
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 14,
            border: '5px solid #141414',
            overflow: 'hidden',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#2E7D32',
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 900,
              textAlign: 'center',
              padding: '4px 0',
              borderBottom: '4px solid #141414',
            }}
          >
            YEAR
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 900,
              color: '#141414',
            }}
          >
            {currentYr}
          </div>
        </div>
      );
    }

    case 'roots_icon':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="86" height="68" viewBox="0 0 86 68">
            <line x1="10" y1="22" x2="76" y2="22" stroke="#6E4A22" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M43 22 C43 34 32 42 20 56 M43 22 C43 36 43 48 43 60 M43 22 C43 34 54 42 66 56 M34 36 C26 42 22 46 14 48 M52 36 C60 42 64 46 72 48"
              fill="none"
              stroke="#E8A81E"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <circle cx="43" cy="14" r="7" fill="#52B734" stroke="#141414" strokeWidth="3.5" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#8A5B09' }}>deep roots</span>
        </div>
      );

    case 'daisy_icon':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="68" height="62" viewBox="0 0 68 62">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse
                key={deg}
                cx="34"
                cy="16"
                rx="7"
                ry="12"
                fill="#FFFFFF"
                stroke="#141414"
                strokeWidth="3.5"
                transform={`rotate(${deg} 34 30)`}
              />
            ))}
            <circle cx="34" cy="30" r="9" fill="#F5C542" stroke="#141414" strokeWidth="3.5" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#141414' }}>10 cm</span>
        </div>
      );

    case 'blank_map':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="78" height="62" viewBox="0 0 78 62">
            <path
              d="M8 14 L28 8 L50 14 L70 8 L70 50 L50 56 L28 50 L8 56 Z"
              fill="#F5E6BE"
              stroke="#141414"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <line x1="28" y1="8" x2="28" y2="50" stroke="#A68B5B" strokeWidth="3" />
            <line x1="50" y1="14" x2="50" y2="56" stroke="#A68B5B" strokeWidth="3" />
            <text x="39" y="40" textAnchor="middle" fontSize="26" fontWeight="900" fill="#141414">
              ?
            </text>
          </svg>
          <span style={{ fontSize: 21, fontWeight: 900, color: '#141414' }}>blank</span>
        </div>
      );

    case 'secret_lock':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="66" height="66" viewBox="0 0 66 66">
            <path d="M20 28 V20 C20 12 26 7 33 7 C40 7 46 12 46 20 V28" fill="none" stroke="#141414" strokeWidth="6" />
            <rect x="13" y="27" width="40" height="31" rx="8" fill="#F2B632" stroke="#141414" strokeWidth="4.5" />
            <circle cx="33" cy="40" r="4.5" fill="#141414" />
            <line x1="33" y1="43" x2="33" y2="51" stroke="#141414" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 21, fontWeight: 900, color: '#8C5A08' }}>secret</span>
        </div>
      );

    case 'zero_fish':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.02 }}>
          <span style={{ fontSize: 54, fontWeight: 900, color: '#141414' }}>0</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#2B6E94' }}>fish</span>
        </div>
      );

    case 'one_boat':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="74" height="58" viewBox="0 0 74 58">
            <path d="M36 8 L36 38 L58 34 Z" fill="#FFFFFF" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
            <path d="M12 40 L62 40 L54 52 L20 52 Z" fill="#D95338" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#141414' }}>1 boat</span>
        </div>
      );

    case 'map_pins':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="82" height="60" viewBox="0 0 82 60">
            <rect x="8" y="8" width="66" height="44" rx="6" fill="#F5E6BE" stroke="#141414" strokeWidth="4" />
            <circle cx="24" cy="24" r="6" fill="#E53935" stroke="#141414" strokeWidth="2.5" />
            <circle cx="44" cy="36" r="6" fill="#2E86DE" stroke="#141414" strokeWidth="2.5" />
            <circle cx="58" cy="22" r="6" fill="#27AE60" stroke="#141414" strokeWidth="2.5" />
            <path d="M24 24 L44 36 L58 22" fill="none" stroke="#141414" strokeWidth="2.5" strokeDasharray="4 3" />
          </svg>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#141414' }}>open map</span>
        </div>
      );

    case 'lighthouse_icon':
      return (
        <svg width="76" height="78" viewBox="0 0 76 78">
          <polygon points="38,8 49,22 27,22" fill="#D93829" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
          <rect x="29" y="22" width="18" height="12" fill="#FFE066" stroke="#141414" strokeWidth="4" />
          <polygon points="27,34 49,34 54,70 22,70" fill="#FFFFFF" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="25,46 51,46 52.5,58 23.5,58" fill="#D93829" stroke="#141414" strokeWidth="3.5" />
        </svg>
      );

    case 'puzzle':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <rect x="12" y="12" width="48" height="48" rx="8" fill="#F4A261" stroke="#141414" strokeWidth="5" />
            <path d="M12 36 Q22 28 26 36 Q30 44 40 36 L60 36" fill="none" stroke="#141414" strokeWidth="4" />
            <path d="M36 12 Q44 22 36 26 Q28 30 36 40 L36 60" fill="none" stroke="#141414" strokeWidth="4" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#D97706' }}>puzzle</span>
        </div>
      );

    case 'clock':
      return (
        <svg width="74" height="74" viewBox="0 0 74 74">
          <circle cx="37" cy="37" r="32" fill="#FFF9ED" stroke="#141414" strokeWidth="5" />
          <line x1="37" y1="37" x2="37" y2="18" stroke="#141414" strokeWidth="5" strokeLinecap="round" />
          <line x1="37" y1="37" x2="52" y2="37" stroke="#E63946" strokeWidth="4" strokeLinecap="round" />
          <circle cx="37" cy="37" r="4" fill="#141414" />
        </svg>
      );

    case 'zzz':
      return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontFamily: '"Arial Black", sans-serif' }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#4A6FA5' }}>z</span>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#2B4C7E' }}>z</span>
          <span style={{ fontSize: 50, fontWeight: 900, color: '#1A2E4C' }}>Z</span>
        </div>
      );

    default:
      return <span style={{ fontSize: 48, fontWeight: 900, color: '#141414' }}>{cue.label ?? '!'}</span>;
  }
};

export const ThoughtBubbleOverlay: React.FC<ThoughtBubbleOverlayProps> = ({ bubbles, width, height }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {bubbles.map((item) => {
        const pop = springPop(item.elapsedSinceStart, 260, 16);
        const finalScale = clamp(pop, 0.01, 1.15) * item.scale;
        const size = item.cue.kind === 'splash_text' ? 210 : 168;
        const clampedX = clamp(item.screenX, size * 0.6, width - size * 0.6);
        const clampedY = clamp(item.screenY - size * 0.72, size * 0.62, height * 0.66);

        return (
          <div
            key={item.cue.id}
            style={{
              position: 'absolute',
              left: clampedX,
              top: clampedY,
              transform: `translate(-50%, -50%) scale(${finalScale.toFixed(4)})`,
              transformOrigin: '50% 100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontFamily: '"Arial Rounded MT Bold", "Nunito", "Helvetica Neue", sans-serif',
            }}
          >
            {/* Main white bubble with right-side inner crescent cel shade */}
            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 34% 34%, #FFFFFF 64%, #DCE1E7 100%)',
                border: '7px solid #141414',
                boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <BubbleContent item={item} />
            </div>

            {/* Trailing small thought-bubble dots */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '5px solid #141414',
                marginTop: 7,
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '4px solid #141414',
                marginTop: 5,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
