import React from 'react';
import { SceneScript } from '../services/scripting/schema.js';
import { clamp, createSeededRng, easeInOutCubic, lerp, springPop } from '../utils/math.js';

interface ExperimentEffectsOverlayProps {
  scene: SceneScript;
  sceneProgress: number;
  sceneElapsedSeconds: number;
  sceneDurationSeconds: number;
  globalSeconds: number;
}

const RAIN_DROPS = (() => {
  const rng = createSeededRng(9911);
  return Array.from({ length: 68 }, () => ({
    x: rng() * 1180 - 50,
    yPhase: rng(),
    len: 46 + rng() * 54,
    speed: 1.55 + rng() * 0.85,
    opacity: 0.25 + rng() * 0.35,
  }));
})();

export const ExperimentEffectsOverlay: React.FC<ExperimentEffectsOverlayProps> = ({
  scene,
  sceneProgress,
  sceneElapsedSeconds,
  sceneDurationSeconds,
  globalSeconds,
}) => {
  const rainActive = scene.environment.rainActive ?? false;
  const overlay = scene.experimentOverlay;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* 1. Diagonal Animated Storm Rain Overlay (exact RnS8S-d2aOI storm mood!) */}
      {rainActive && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1080 1920"
          style={{ position: 'absolute', inset: 0 }}
        >
          <rect width="1080" height="1920" fill="rgba(16, 30, 48, 0.22)" />
          {RAIN_DROPS.map((d, idx) => {
            const y = ((globalSeconds * d.speed + d.yPhase) % 1.15) * 1980 - 120;
            const x = d.x - y * 0.14;
            return (
              <line
                key={idx}
                x1={x}
                y1={y}
                x2={x - d.len * 0.18}
                y2={y + d.len}
                stroke={`rgba(210, 232, 250, ${d.opacity.toFixed(2)})`}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}

      {/* 2. Full-Screen Animated Tearing Wall Calendar (WEEK 1 -> WEEK 4) */}
      {overlay?.calendarFlip && (
        <WallCalendarFlip
          fromHeader={overlay.calendarFlip.fromHeader}
          toHeader={overlay.calendarFlip.toHeader}
          fromIcon={overlay.calendarFlip.fromIcon}
          toIcon={overlay.calendarFlip.toIcon}
          sceneProgress={sceneProgress}
        />
      )}

      {/* 3. Rising Red Mercury Gauge / Price / Noise Thermometer */}
      {overlay?.gauge && (
        <RisingGaugeOverlay
          label={overlay.gauge.label}
          startVal={overlay.gauge.startVal}
          endVal={overlay.gauge.endVal}
          prefix={overlay.gauge.prefix}
          suffix={overlay.gauge.suffix}
          sceneProgress={sceneProgress}
        />
      )}

      {/* 4. Slamming Rubber Stamp (APPROVED ✓ or tilted crimson BANNED / NO RULES! / RETIRED) */}
      {overlay?.stamp && sceneProgress >= overlay.stamp.atRatio && (
        <StampSlamOverlay
          text={overlay.stamp.text}
          color={overlay.stamp.color}
          elapsed={(sceneProgress - overlay.stamp.atRatio) * sceneDurationSeconds}
        />
      )}

      {/* 5. Blinking Red Slashed NO WI-FI Alert Icon */}
      {overlay?.noWifiPopup && (
        <div
          style={{
            position: 'absolute',
            top: '27%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${clamp(springPop(sceneElapsedSeconds, 240, 15), 0.01, 1.12).toFixed(4)})`,
            opacity: Math.sin(globalSeconds * 10) > -0.45 ? 1 : 0.62,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '12px solid #141414',
              boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="168" height="168" viewBox="0 0 120 120">
              <path d="M22 48 C43 27 77 27 98 48" fill="none" stroke="#141414" strokeWidth="10" strokeLinecap="round" />
              <path d="M36 64 C49 51 71 51 84 64" fill="none" stroke="#141414" strokeWidth="10" strokeLinecap="round" />
              <path d="M48 79 C55 72 65 72 72 79" fill="none" stroke="#141414" strokeWidth="10" strokeLinecap="round" />
              <circle cx="60" cy="94" r="7" fill="#141414" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#D9261E" strokeWidth="12" />
              <line x1="23" y1="23" x2="97" y2="97" stroke="#D9261E" strokeWidth="12" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarPage: React.FC<{
  header: string;
  headerBg: string;
  icon: 'sun_heart' | 'money' | 'rain_cloud' | 'empty_box';
}> = ({ header, headerBg, icon }) => {
  const cells = Array.from({ length: 20 });
  return (
    <div
      style={{
        width: 720,
        height: 920,
        background: '#FFFFFF',
        border: '12px solid #141414',
        borderRadius: 28,
        boxShadow: '0 24px 54px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Arial Rounded MT Bold", "Helvetica Neue", sans-serif',
      }}
    >
      {/* Spiral rings */}
      <div
        style={{
          background: headerBg,
          padding: '30px 24px',
          borderBottom: '10px solid #141414',
          textAlign: 'center',
          color: '#FFFFFF',
          fontSize: 82,
          fontWeight: 900,
          letterSpacing: '0.04em',
        }}
      >
        {header}
      </div>

      {/* 5x4 Calendar Icon Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          padding: '32px 32px 18px',
          flex: 1,
        }}
      >
        {cells.map((_, idx) => (
          <div
            key={idx}
            style={{
              border: '5px solid #141414',
              borderRadius: 14,
              background: '#F9FAFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 900,
            }}
          >
            {icon === 'sun_heart' && (idx % 2 === 0 ? '☀️' : '❤️')}
            {icon === 'money' && (idx % 2 === 0 ? '💵' : '✨')}
            {icon === 'rain_cloud' && '🌧️'}
            {icon === 'empty_box' && '❌'}
          </div>
        ))}
      </div>

      {/* Bottom mood badge */}
      <div
        style={{
          height: 145,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 88,
          paddingBottom: 14,
        }}
      >
        {icon === 'sun_heart' && '😊'}
        {icon === 'money' && '🤑'}
        {icon === 'rain_cloud' && '😠'}
        {icon === 'empty_box' && '😱'}
      </div>
    </div>
  );
};

const WallCalendarFlip: React.FC<{
  fromHeader: string;
  toHeader: string;
  fromIcon: 'sun_heart' | 'money';
  toIcon: 'rain_cloud' | 'empty_box';
  sceneProgress: number;
}> = ({ fromHeader, toHeader, fromIcon, toIcon, sceneProgress }) => {
  // Tear begins at 32% of the scene and finishes by 72%
  const tearT = easeInOutCubic(clamp((sceneProgress - 0.3) / 0.42, 0, 1));
  const slideX = lerp(0, 980, tearT);
  const slideY = lerp(0, 260, tearT);
  const rotDeg = lerp(0, 26, tearT);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(90deg, #A3221C 0px, #A3221C 86px, #871B16 86px, #871B16 92px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Underlying Bad-News Page */}
      <div style={{ position: 'absolute', transform: 'translateY(-40px)' }}>
        <CalendarPage header={toHeader} headerBg="#4A647D" icon={toIcon} />
      </div>

      {/* Top Tearing Good-News Page */}
      {tearT < 0.99 && (
        <div
          style={{
            position: 'absolute',
            transform: `translate(${slideX.toFixed(1)}px, ${(slideY - 40).toFixed(1)}px) rotate(${rotDeg.toFixed(1)}deg)`,
            transformOrigin: '80% 10%',
          }}
        >
          <CalendarPage header={fromHeader} headerBg="#E65285" icon={fromIcon} />
        </div>
      )}
    </div>
  );
};

const RisingGaugeOverlay: React.FC<{
  label: string;
  startVal: number;
  endVal: number;
  prefix?: string;
  suffix?: string;
  sceneProgress: number;
}> = ({ label, startVal, endVal, prefix = '', suffix = '', sceneProgress }) => {
  const t = easeInOutCubic(clamp(sceneProgress * 1.12, 0, 1));
  const current = Math.round(lerp(startVal, endVal, t));
  const fillPct = clamp(15 + t * 82, 15, 97);
  // V3 tick pulse: the number punches each time the counter "jumps" (8 jumps per scene)
  const STEPS = 8;
  const stepFrac = t >= 1 ? 1 : (t * STEPS) % 1;
  const pulse = t >= 1 ? 1 : 1 + 0.16 * Math.exp(-stepFrac * 5);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '8%',
        transform: 'translateX(-50%)',
        background: '#FAF5EA',
        border: '8px solid #141414',
        borderRadius: 28,
        padding: '18px 34px',
        boxShadow: '0 14px 32px rgba(0,0,0,0.42)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        fontFamily: '"Arial Rounded MT Bold", "Helvetica Neue", sans-serif',
        width: 640,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: '#141414', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: '#C61C14',
            letterSpacing: '-0.02em',
            display: 'inline-block',
            transform: `scale(${pulse.toFixed(3)})`,
            transformOrigin: '100% 50%',
          }}
        >
          {prefix}
          {current.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 36,
          borderRadius: 18,
          border: '6px solid #141414',
          background: '#E5E8EC',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${fillPct.toFixed(1)}%`,
            background: 'linear-gradient(90deg, #FF7A36 0%, #D91E18 100%)',
          }}
        />
      </div>
    </div>
  );
};

const StampSlamOverlay: React.FC<{
  text: string;
  color: 'green' | 'red';
  elapsed: number;
}> = ({ text, color, elapsed }) => {
  const slam = springPop(elapsed, 340, 15);
  const scale = color === 'red' ? lerp(2.2, 1.0, clamp(slam, 0, 1.15)) : clamp(slam, 0.01, 1.12);
  const isRed = color === 'red';

  return (
    <div
      style={{
        position: 'absolute',
        top: isRed ? '44%' : '26%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale.toFixed(4)}) rotate(${isRed ? -11 : 0}deg)`,
        fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
      }}
    >
      <div
        style={{
          padding: isRed ? '24px 56px' : '22px 44px',
          borderRadius: isRed ? 18 : 26,
          background: isRed ? 'rgba(217, 36, 28, 0.16)' : '#23A55A',
          border: isRed ? '14px solid #D9241C' : '8px solid #141414',
          color: isRed ? '#D9241C' : '#FFFFFF',
          fontSize: isRed ? 86 : 58,
          fontWeight: 900,
          letterSpacing: '0.06em',
          boxShadow: isRed ? '0 0 0 6px rgba(217,36,28,0.28)' : '0 12px 26px rgba(0,0,0,0.35)',
          textShadow: isRed ? '0 4px 12px rgba(0,0,0,0.25)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  );
};
