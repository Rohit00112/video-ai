import React from 'react';
import { Composition } from 'remotion';
import { VIDEO_SPEC } from '../../config/videoConfig.js';
import { buildDefaultProductionPlan } from '../../config/defaultPlan.js';
import { MainVideo, MainVideoProps } from './MainVideo.js';

const fallbackPlan = buildDefaultProductionPlan();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={fallbackPlan.totalFrames}
        fps={VIDEO_SPEC.fps}
        width={VIDEO_SPEC.width}
        height={VIDEO_SPEC.height}
        defaultProps={{ plan: fallbackPlan } as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => {
          const typed = props as unknown as MainVideoProps;
          const activePlan = typed?.plan ?? fallbackPlan;
          if (typed?.onlySceneNumber) {
            const target = activePlan.scenes.find(
              (s) => s.scene.sceneNumber === typed.onlySceneNumber
            );
            if (target) {
              return {
                durationInFrames: target.durationFrames,
                fps: activePlan.fps,
                width: activePlan.width,
                height: activePlan.height,
              };
            }
          }
          return {
            durationInFrames: activePlan.totalFrames,
            fps: activePlan.fps,
            width: activePlan.width,
            height: activePlan.height,
          };
        }}
      />
    </>
  );
};
