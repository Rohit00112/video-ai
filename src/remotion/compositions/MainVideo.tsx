import React, { useMemo } from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { ProductionPlan } from '../../services/scripting/schema.js';
import { TimelineManager } from '../../three/core/TimelineManager.js';
import { ThreeSceneViewport } from './ThreeSceneViewport.js';
import { IllustrationLayer } from './IllustrationLayer.js';
import { FreezeLayer } from '../effects/FreezeLayer.js';
import { CaptionOverlay } from '../captions/CaptionOverlay.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SceneTransitionOverlay } from '../transitions/SceneTransitionOverlay.js';
import { SubscribeCtaOverlay } from '../../components/SubscribeCtaOverlay.js';
import { ExperimentEffectsOverlay } from '../../components/ExperimentEffectsOverlay.js';
import { ChaosOverlay } from '../../components/ChaosOverlay.js';
import { RetentionHudOverlay } from '../../components/RetentionHudOverlay.js';
import { clamp } from '../../utils/math.js';

export interface MainVideoProps {
  plan: ProductionPlan;
  onlySceneNumber?: number;
}

export const MainVideo: React.FC<MainVideoProps> = ({ plan, onlySceneNumber }) => {
  const rawFrame = useCurrentFrame();

  const targetScene = useMemo(() => {
    if (!onlySceneNumber) return null;
    return plan.scenes.find((s) => s.scene.sceneNumber === onlySceneNumber) ?? null;
  }, [plan, onlySceneNumber]);

  const frameOffset = targetScene ? targetScene.startFrame : 0;
  const globalFrame = rawFrame + frameOffset;

  const timeline = useMemo(() => new TimelineManager(plan), [plan]);
  const allFootage = useMemo(() => plan.scenes.every((s) => Boolean(s.scene.footage)), [plan]);
  const state = timeline.evaluate(globalFrame);
  const { compiledScene, sceneLocalFrame, sceneProgress, sceneElapsedSeconds, sceneDurationSeconds, globalSeconds } = state;

  const shake = compiledScene.scene.chaosHud?.shakeIntensity ?? 0;
  const shakeX = shake > 0 ? Math.sin(globalSeconds * 58) * shake * 16 : 0;
  const shakeY = shake > 0 ? Math.cos(globalSeconds * 47) * shake * 14 : 0;

  // Scene-entry transition motion applied to the whole 3D layer
  const transition = compiledScene.scene.transition;
  const tf = sceneLocalFrame;
  let enterScale = 1;
  let enterX = 0;
  let enterBlur = 0;
  let glitchX = 0;
  if (transition === 'zoom_punch' && tf < 9) {
    const k = 1 - tf / 9;
    enterScale = 1 + 0.22 * k * k;
    enterBlur = 6 * k;
  } else if (transition === 'whip_pan' && tf < 8) {
    const k = 1 - tf / 8;
    enterX = -420 * k * k * k;
    enterBlur = 14 * k;
  } else if (transition === 'glitch' && tf < 8) {
    glitchX = (tf % 2 === 0 ? 1 : -1) * (8 - tf) * 6;
  }
  const layerTransforms: string[] = [];
  if (shake > 0) layerTransforms.push(`translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px) scale(1.03)`);
  if (enterScale !== 1) layerTransforms.push(`scale(${enterScale.toFixed(4)})`);
  if (enterX !== 0 || glitchX !== 0) layerTransforms.push(`translateX(${(enterX + glitchX).toFixed(1)}px)`);
  const globalProgress = clamp(globalFrame / Math.max(1, plan.totalFrames - 1), 0, 1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          compiledScene.scene.environment.worldTheme === 'space_chaos'
            ? '#040610'
            : compiledScene.scene.environment.worldTheme === 'subway_chaos'
            ? '#0A0716'
            : '#7BAFD4',
      }}
    >
      {/* Master Three.js 3D world + characters + projected thought bubbles (with optional chaos shake) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: layerTransforms.length ? layerTransforms.join(' ') : undefined,
          filter: enterBlur > 0.2 ? `blur(${enterBlur.toFixed(1)}px)` : undefined,
        }}
      >
        {plan.concept.renderMode === 'illustrated' ? (
          <IllustrationLayer plan={plan} frameOffset={frameOffset} />
        ) : allFootage ? (
          plan.scenes.map((s) => (
            <Sequence key={s.scene.id} from={s.startFrame - frameOffset} durationInFrames={s.durationFrames} name={`SHOT-${s.scene.id}`}>
              {s.scene.shot?.freeze ? (
                <FreezeLayer durationFrames={s.durationFrames} from={s.scene.shot.freeze.from ?? 0} to={s.scene.shot.freeze.to ?? 1}>
                  <OffthreadVideo src={staticFile(s.scene.footage!)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </FreezeLayer>
              ) : (
                <OffthreadVideo src={staticFile(s.scene.footage!)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </Sequence>
          ))
        ) : (
          <ThreeSceneViewport plan={plan} frameOffset={frameOffset} />
        )}
      </div>

      {/* RnS8S-d2aOI-style comedy & weather overlays */}
      <ExperimentEffectsOverlay
        scene={compiledScene.scene}
        sceneProgress={sceneProgress}
        sceneElapsedSeconds={sceneElapsedSeconds}
        sceneDurationSeconds={sceneDurationSeconds}
        globalSeconds={globalSeconds}
      />

      {/* Bespoke Space Sci-Fi & Subway Noir chaos HUD overlays */}
      <ChaosOverlay
        scene={compiledScene.scene}
        sceneElapsedSeconds={sceneElapsedSeconds}
        globalSeconds={globalSeconds}
      />

      {/* Retention HUD: hook title, emoji bursts, watch progress */}
      <RetentionHudOverlay
        scene={compiledScene.scene}
        sceneElapsedSeconds={sceneElapsedSeconds}
        sceneDurationSeconds={sceneDurationSeconds}
        sceneProgress={sceneProgress}
        globalProgress={globalProgress}
        globalSeconds={globalSeconds}
      />

      {/* Animated Like / Subscribe / Bell CTA */}
      <SubscribeCtaOverlay
        visible={compiledScene.scene.environment.showSubscribeCta}
        sceneElapsedSeconds={sceneElapsedSeconds}
        sceneDurationSeconds={sceneDurationSeconds}
        bottom="12%"
      />

      {/* Framing vignette and scene transition layer */}
      <SceneTransitionOverlay
        transition={compiledScene.scene.transition}
        sceneLocalFrame={sceneLocalFrame}
        sceneDurationFrames={compiledScene.durationFrames}
      />

      {/* Word-synced mobile lower-third captions styled per world */}
      <CaptionOverlay
        captions={compiledScene.captions}
        sceneLocalFrame={sceneLocalFrame}
        fps={plan.fps}
        worldTheme={compiledScene.scene.environment.worldTheme}
        highlights={compiledScene.scene.hud?.captionHighlights}
        variant={plan.concept.captionStyle}
        avoidY={
          plan.concept.renderMode === 'illustrated'
            ? (() => {
                // Puppet scenes: speaker's mouth sits ~0.207 × scale of the frame above the feet
                const sp = compiledScene.scene.puppets?.find((p) => p.id === compiledScene.scene.speaker);
                return sp ? sp.y - 0.207 * (sp.scale ?? 1) : compiledScene.scene.illustration?.mouth?.y;
              })()
            : undefined
        }
      />

      {/* Synchronized ElevenLabs narration, pastoral underscore, meadow ambience, and SFX */}
      {!onlySceneNumber && <AudioManager plan={plan} />}
    </AbsoluteFill>
  );
};
