# Autonomous Cinematic Short-Form Video Production Studio

A reusable TypeScript production pipeline that analyzes a reference YouTube Short, extracts its visual and narrative production language into `REFERENCE_STYLE_BIBLE.md`, and autonomously produces original 1080×1920 30 FPS vertical Shorts using **Three.js**, **ElevenLabs**, and **Remotion**.

## Architecture

- **Reference Style Bible**: [`REFERENCE_STYLE_BIBLE.md`](./REFERENCE_STYLE_BIBLE.md) (single source of truth extracted from `https://www.youtube.com/shorts/a3QMItAtEGo`)
- **Three.js 3D Engine (`src/three/`)**:
  - `core/SceneManager.ts`, `core/AssetManager.ts`, `core/TimelineManager.ts`
  - `characters/CharacterManager.ts` (2D-in-3D cel-shaded stickman figures casting real 3D silhouette shadows)
  - `environments/EnvironmentManager.ts` (low-poly outlined forest, winding cobblestone road, cottages, bamboo aqueduct, crimson watermill with 3D spinning waterwheel, hero mountain spring)
  - `animation/AnimationManager.ts` (`AnimationMixer`, `QuaternionKeyframeTrack`, deterministic `setTime`)
  - `cameras/CameraManager.ts` (crane, dolly, pan, orbit, wide pullback + 3D-to-2D projection)
  - `lighting/LightingManager.ts` (sunlight + PCF shadows, hemisphere fill, sky dome, distance fog)
  - `physics/PhysicsManager.ts` (deterministic cartoon smoke poofs, ballistic water drops, golden sparkles)
- **Remotion Composition (`src/remotion/`)**:
  - `compositions/MainVideo.tsx`, `ThreeSceneViewport.tsx`, `Root.tsx`
  - `captions/CaptionOverlay.tsx` (word-aligned lowercase bold outlined mobile captions)
  - `audio/AudioManager.tsx` (narration, ducked pastoral underscore, meadow ambience, synced SFX)
  - `transitions/SceneTransitionOverlay.tsx`
- **Services (`src/services/`)**:
  - `elevenlabs/ElevenLabsService.ts` (official `/with-timestamps` API, content-hash caching, per-scene regeneration)
  - `assets/AudioAssetGenerator.ts` (deterministic 48 kHz WAV synthesizer for music, ambience, and SFX)
  - `scripting/schema.ts`, `timelineCompiler.ts`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local`:
   ```env
   ELEVENLABS_API_KEY=your_api_key_here
   # Optional overrides:
   # ELEVENLABS_VOICE_ID=nPczCjzI2devNBz1zQrb
   # ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   ```

## Usage

### Run Full Autonomous Pipeline
```bash
npm run produce
```

### Step-by-Step Commands
```bash
npm run generate:script                  # Write validated concept & 16-scene script
npm run generate:assets                  # Generate 48 kHz music, ambience & SFX WAVs
npm run generate:voice                   # Generate ElevenLabs narration + word timestamps
npm run generate:voice -- --scene=4      # Regenerate narration for scene 4 only
npm run render:preview                   # Render fast 540x960 preview MP4
npm run render:final -- --stills         # Render 1080x1920 30fps H.264 MP4 + QA stills
npx tsx scripts/render-video.ts --scene=11 # Render a single scene preview
npm run qa                               # Run automated ffprobe + timeline QA checks
npm run studio                           # Open interactive Remotion Studio preview
npm test                                 # Run unit test suite
```

## Export Specification

- **Resolution**: `1080 × 1920` (9:16)
- **Video**: H.264 (`yuv420p`), `30 FPS`, CRF 18
- **Audio**: AAC, `48 kHz`, stereo
- **Output Directory**: `output/videos/`
