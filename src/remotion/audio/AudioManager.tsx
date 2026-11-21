import React from 'react';
import { Audio, Sequence, staticFile, interpolate } from 'remotion';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import { ProductionPlan, SfxId } from '../../services/scripting/schema.js';

interface AudioManagerProps {
  plan: ProductionPlan;
}

/**
 * Synthesized noise-burst effects that read as "disturbance" under calm storytelling narration
 * (measured: impact_boom peaks at 1.00, record_scratch 0.96, tick is a 90 ms click).
 * Dropped entirely in the 'storytime' style.
 */
const HARSH_SFX: ReadonlySet<SfxId> = new Set<SfxId>([
  'impact_boom',
  'record_scratch',
  'crowd_cheer',
  'cash_register',
  'bite_crunch',
  'tick',
  'wood_snap',
  'ui_click',
  'bird_squawk',
]);

/** Frames over which music volume glides between scene levels (no audible steps at cuts) */
const MUSIC_GLIDE_FRAMES = 15;

/**
 * Deterministic multi-track Remotion audio mixer:
 * - Music bed with smooth narration ducking & clean outro fade
 * - Subtle ambient bed
 * - Per-scene ElevenLabs narration tracks at exact timeline frames
 * - Per-scene sound effects with click-free fades (harsh effects removed in 'storytime')
 */
export const AudioManager: React.FC<AudioManagerProps> = ({ plan }) => {
  const totalFrames = plan.totalFrames;
  const fadeOutFrames = Math.round(plan.fps * 0.65);
  const storytime = plan.concept.visualStyle === 'storytime';
  const musicScale = storytime ? 0.7 : 1;
  const sfxScale = storytime ? 0.55 : 1;

  const sceneMusicLevel = (frame: number): number => {
    const active = plan.scenes.find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames);
    return (active?.scene.musicEnergy === 'triumphant'
      ? STYLE_TOKENS.audio.musicVolume
      : STYLE_TOKENS.audio.musicDuckVolume) * musicScale;
  };

  return (
    <>
      {/* Background music bed (level glides between scenes instead of stepping) */}
      <Audio
        src={staticFile(plan.musicFile)}
        loop
        volume={(f) => {
          const outro = interpolate(
            f,
            [Math.max(0, totalFrames - fadeOutFrames), totalFrames],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const intro = interpolate(f, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
          let sum = 0;
          let n = 0;
          for (let k = -MUSIC_GLIDE_FRAMES; k <= MUSIC_GLIDE_FRAMES; k += 3) {
            sum += sceneMusicLevel(Math.min(totalFrames - 1, Math.max(0, f + k)));
            n++;
          }
          return (sum / n) * outro * intro;
        }}
      />

      {/* Subtle ambience */}
      <Audio
        src={staticFile(plan.ambienceFile)}
        loop
        volume={(f) => {
          const outro = interpolate(
            f,
            [Math.max(0, totalFrames - fadeOutFrames), totalFrames],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const intro = interpolate(f, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
          return STYLE_TOKENS.audio.ambienceVolume * outro * intro;
        }}
      />

      {/* Per-scene ElevenLabs narration & synchronized SFX */}
      {plan.scenes.map((compiled) => {
        const sceneStart = compiled.startFrame;
        const sceneDur = compiled.durationFrames;

        return (
          <React.Fragment key={compiled.scene.id}>
            {compiled.audioFile && (
              <Sequence from={sceneStart} durationInFrames={sceneDur} name={`VO-${compiled.scene.id}`}>
                <Audio
                  src={staticFile(compiled.audioFile)}
                  volume={(f) =>
                    // 2-frame fade in/out removes start/stop clicks between narration clips
                    STYLE_TOKENS.audio.narrationVolume *
                    interpolate(f, [0, 2, sceneDur - 3, sceneDur - 1], [0, 1, 1, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    })
                  }
                />
              </Sequence>
            )}

            {compiled.scene.soundEffects
              .filter((cue) => !(storytime && HARSH_SFX.has(cue.sfx)))
              .map((cue, idx) => {
                const sfxFrame = sceneStart + Math.floor(cue.atRatio * Math.max(1, sceneDur - 4));
                const remaining = Math.max(12, totalFrames - sfxFrame);
                const dur = Math.min(remaining, plan.fps * 2);
                const base = cue.volume * STYLE_TOKENS.audio.sfxVolume * sfxScale;
                return (
                  <Sequence
                    key={`${compiled.scene.id}-sfx-${idx}`}
                    from={sfxFrame}
                    durationInFrames={dur}
                    name={`SFX-${compiled.scene.id}-${cue.sfx}`}
                  >
                    <Audio
                      src={staticFile(`sound-effects/${cue.sfx}.wav`)}
                      volume={(f) =>
                        base *
                        interpolate(f, [0, 1, dur - 4, dur - 1], [0, 1, 1, 0], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        })
                      }
                    />
                  </Sequence>
                );
              })}
          </React.Fragment>
        );
      })}
    </>
  );
};
