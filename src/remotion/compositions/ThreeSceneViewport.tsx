import React, { useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { ProductionPlan } from '../../services/scripting/schema.js';
import { ProjectedBubbleState, SceneManager } from '../../three/core/SceneManager.js';
import { ThoughtBubbleOverlay } from '../../components/ThoughtBubbleOverlay.js';

interface ThreeSceneViewportProps {
  plan: ProductionPlan;
  frameOffset?: number;
}

/**
 * Deterministic Three.js viewport integrated directly into Remotion's timeline.
 * Renders synchronously per Remotion frame and projects active 3D world coordinates
 * cleanly to crisp vector ThoughtBubbleOverlay elements.
 */
export const ThreeSceneViewport: React.FC<ThreeSceneViewportProps> = ({
  plan,
  frameOffset = 0,
}) => {
  const frame = useCurrentFrame() + frameOffset;
  const { width, height } = useVideoConfig();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [bubbles, setBubbles] = useState<ProjectedBubbleState[]>([]);
  const [initHandle] = useState<number>(() => delayRender('Initializing Three.js SceneManager'));
  const resolvedRef = useRef(false);

  // Initialize SceneManager once per viewport mount
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const manager = new SceneManager(canvas, plan, width, height);
      managerRef.current = manager;

      const out = manager.renderAtFrame(frame, width, height);
      setBubbles(out.bubbles);

      if (!resolvedRef.current) {
        resolvedRef.current = true;
        continueRender(initHandle);
      }
    } catch (err) {
      console.error('[ThreeSceneViewport] Init error:', err);
      cancelRender(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, width, height]);

  // Synchronously render every Remotion frame
  useLayoutEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      const out = manager.renderAtFrame(frame, width, height);
      setBubbles(out.bubbles);
    } catch (err) {
      console.error('[ThreeSceneViewport] Render error:', err);
      cancelRender(err instanceof Error ? err : new Error(String(err)));
    }
  }, [frame, width, height]);

  return (
    <div style={{ position: 'absolute', inset: 0, width, height, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <ThoughtBubbleOverlay bubbles={bubbles} width={width} height={height} />
    </div>
  );
};
