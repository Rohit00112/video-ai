import React from 'react';
import { TransitionType } from '../../services/scripting/schema.js';
import { clamp } from '../../utils/math.js';

interface SceneTransitionOverlayProps {
  transition: TransitionType;
  sceneLocalFrame: number;
  sceneDurationFrames: number;
}

/**
 * Adds reference-matched subtle top/bottom cinematic framing vignette and clean transitions.
 */
export const SceneTransitionOverlay: React.FC<SceneTransitionOverlayProps> = ({
  transition,
  sceneLocalFrame,
  sceneDurationFrames,
}) => {
  let flashOpacity = 0;
  let flashColor = 'rgba(18, 22, 18, ';
  if (transition === 'white_flash' && sceneLocalFrame < 7) {
    flashOpacity = clamp(1 - sceneLocalFrame / 7, 0, 1) * 0.96;
    flashColor = 'rgba(255, 255, 255, ';
  } else if (transition === 'whip_fade' && sceneLocalFrame < 5) {
    flashOpacity = clamp(1 - sceneLocalFrame / 5, 0, 1) * 0.35;
  } else if (transition === 'zoom_punch' && sceneLocalFrame < 4) {
    flashOpacity = clamp(1 - sceneLocalFrame / 4, 0, 1) * 0.55;
    flashColor = 'rgba(255, 255, 255, ';
  } else if (transition === 'glitch' && sceneLocalFrame < 6) {
    flashOpacity = sceneLocalFrame % 2 === 0 ? 0.25 : 0;
    flashColor = 'rgba(255, 40, 90, ';
  } else if (transition === 'crossfade' && sceneLocalFrame < 6) {
    flashOpacity = clamp(1 - sceneLocalFrame / 6, 0, 1) * 0.45;
  }

  const endFade =
    sceneDurationFrames > 15 && sceneLocalFrame > sceneDurationFrames - 4 && transition === 'crossfade'
      ? clamp((sceneLocalFrame - (sceneDurationFrames - 4)) / 4, 0, 1) * 0.35
      : 0;

  return (
    <>
      {(flashOpacity > 0 || endFade > 0) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundColor: `${flashColor}${(flashOpacity + endFade).toFixed(3)})`,
          }}
        />
      )}
    </>
  );
};
