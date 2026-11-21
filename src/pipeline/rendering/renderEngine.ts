import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { PREVIEW_SPEC, VIDEO_SPEC } from '../../config/videoConfig.js';
import { ProductionPlan } from '../../services/scripting/schema.js';

export interface RenderOptions {
  plan: ProductionPlan;
  preview?: boolean;
  onlySceneNumber?: number;
  captureStills?: boolean;
  stillsOnly?: boolean;
}

export interface RenderResult {
  outputVideoPath: string;
  stillPaths: string[];
  durationMs: number;
}

let cachedServeUrl: string | null = null;

async function ensureBundle(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;
  const entryPoint = path.join(process.cwd(), 'src', 'remotion', 'index.ts');
  const publicDir = path.join(process.cwd(), 'public');
  cachedServeUrl = await bundle({
    entryPoint,
    publicDir,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          '.js': ['.ts', '.tsx', '.js'],
          '.jsx': ['.tsx', '.jsx'],
        },
      },
    }),
  });
  return cachedServeUrl;
}

export async function renderProductionVideo(options: RenderOptions): Promise<RenderResult> {
  const started = Date.now();
  const serveUrl = await ensureBundle();

  const effectivePlan: ProductionPlan = options.preview
    ? {
        ...options.plan,
        width: PREVIEW_SPEC.width,
        height: PREVIEW_SPEC.height,
      }
    : options.plan;

  const inputProps: Record<string, unknown> = {
    plan: effectivePlan,
    ...(options.onlySceneNumber ? { onlySceneNumber: options.onlySceneNumber } : {}),
  };

  const chromiumOptions = {
    gl: 'angle' as const,
  };

  const onBrowserLog = (log: { type: string; text: string }) => {
    if (log.type === 'error' || log.type === 'warning') {
      console.error(`[browser:${log.type}] ${log.text}`);
    }
  };

  const composition = await selectComposition({
    serveUrl,
    id: 'MainVideo',
    inputProps,
    chromiumOptions,
    onBrowserLog,
  });

  const outDir = options.preview || options.onlySceneNumber
    ? path.join(process.cwd(), 'output', 'previews')
    : path.join(process.cwd(), 'output', 'videos');
  fs.mkdirSync(outDir, { recursive: true });

  const suffix = options.onlySceneNumber
    ? `-scene-${String(options.onlySceneNumber).padStart(2, '0')}`
    : options.preview
    ? '-preview'
    : '';
  const outputVideoPath = path.join(outDir, `${options.plan.projectId}${suffix}.mp4`);

  const stillPaths: string[] = [];
  if (options.captureStills && !options.onlySceneNumber) {
    const stillsDir = path.join(process.cwd(), 'output', 'previews', 'stills');
    fs.mkdirSync(stillsDir, { recursive: true });

    // Capture representative QA frames across the narrative arc
    for (const f of fs.readdirSync(stillsDir)) {
      if (f.endsWith('.png')) fs.rmSync(path.join(stillsDir, f));
    }
    const sampleSceneNumbers = effectivePlan.scenes.map((s) => s.scene.sceneNumber);
    for (const sceneNum of sampleSceneNumbers) {
      const compiled = effectivePlan.scenes.find((s) => s.scene.sceneNumber === sceneNum);
      if (!compiled) continue;
      const sampleFrame = compiled.startFrame + Math.floor(compiled.durationFrames * 0.65);
      const stillPath = path.join(
        stillsDir,
        `scene-${String(sceneNum).padStart(2, '0')}-frame-${sampleFrame}.png`
      );
      await renderStill({
        composition,
        serveUrl,
        output: stillPath,
        frame: sampleFrame,
        inputProps,
        chromiumOptions,
        onBrowserLog,
      });
      stillPaths.push(stillPath);
    }
  }

  if (options.stillsOnly) {
    return {
      outputVideoPath: '',
      stillPaths,
      durationMs: Date.now() - started,
    };
  }

  let lastLoggedBucket = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: VIDEO_SPEC.codec,
    audioCodec: VIDEO_SPEC.audioCodec,
    pixelFormat: VIDEO_SPEC.pixelFormat,
    crf: options.preview ? PREVIEW_SPEC.crf : VIDEO_SPEC.crf,
    outputLocation: outputVideoPath,
    inputProps,
    // Each tab owns a WebGL context + composer; half the logical cores keeps GPU contention sane
    concurrency: Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2))),
    chromiumOptions,
    onBrowserLog,
    ffmpegOverride: ({ args }) => {
      // Enforce 48 kHz audio sample rate required by Phase 10 export specification
      const idx = args.indexOf('-c:a');
      if (idx !== -1) {
        const next = [...args];
        next.splice(idx + 2, 0, '-ar', String(VIDEO_SPEC.audioSampleRate));
        return next;
      }
      return args;
    },
    onProgress: ({ progress }) => {
      const bucket = Math.floor(progress * 10);
      if (bucket > lastLoggedBucket) {
        lastLoggedBucket = bucket;
        console.log(`  [render] ${Math.round(progress * 100)}%`);
      }
    },
  });

  return {
    outputVideoPath,
    stillPaths,
    durationMs: Date.now() - started,
  };
}
