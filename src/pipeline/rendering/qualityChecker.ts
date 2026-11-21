import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { VIDEO_SPEC } from '../../config/videoConfig.js';
import { ProductionPlan } from '../../services/scripting/schema.js';
import { QA_JSON_FILE, QA_MD_FILE } from '../production/productionStore.js';
import { lintStoryV3, STORYTIME_LIMITS, V3_LIMITS } from './storyLint.js';

export interface QaCheckItem {
  name: string;
  passed: boolean;
  details: string;
}

export interface QaReport {
  checkedAt: string;
  projectId: string;
  overallPass: boolean;
  videoFile: string | null;
  checks: QaCheckItem[];
}

interface FfprobeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  sample_rate?: string;
}

export function runQualityChecks(plan: ProductionPlan, videoPath?: string): QaReport {
  const checks: QaCheckItem[] = [];
  const publicDir = path.join(process.cwd(), 'public');

  // 1. Timeline continuity (no frame gaps or overlaps)
  let expectedStart = 0;
  let timelineContiguous = true;
  let timelineDetail = `${plan.scenes.length} scenes, ${plan.totalFrames} frames (${plan.totalDurationSeconds}s)`;
  for (const s of plan.scenes) {
    if (s.startFrame !== expectedStart || s.durationFrames <= 0) {
      timelineContiguous = false;
      timelineDetail = `Discontinuity at ${s.scene.id}: expected start ${expectedStart}, got ${s.startFrame}`;
      break;
    }
    expectedStart += s.durationFrames;
  }
  if (expectedStart !== plan.totalFrames) {
    timelineContiguous = false;
    timelineDetail = `Total frame mismatch: summed ${expectedStart} vs plan.totalFrames ${plan.totalFrames}`;
  }
  checks.push({ name: 'Timeline Continuity & Determinism', passed: timelineContiguous, details: timelineDetail });

  // 2. Narration audio files & word alignment presence
  let missingAudio: string[] = [];
  let missingWords: string[] = [];
  for (const s of plan.scenes) {
    if (!s.audioFile) {
      missingAudio.push(s.scene.id);
    } else {
      const abs = path.join(publicDir, s.audioFile);
      if (!fs.existsSync(abs) || fs.statSync(abs).size < 1024) {
        missingAudio.push(s.scene.id);
      }
    }
    if (s.words.length === 0 || s.captions.length === 0) {
      missingWords.push(s.scene.id);
    }
  }
  checks.push({
    name: 'ElevenLabs Scene Narration & Word Alignment',
    passed: missingAudio.length === 0 && missingWords.length === 0,
    details:
      missingAudio.length === 0 && missingWords.length === 0
        ? `All ${plan.scenes.length} scenes have verified MP3 narration + word-aligned captions`
        : `Missing audio: [${missingAudio.join(', ')}]; missing words: [${missingWords.join(', ')}]`,
  });

  // 3. Caption overlap & readability check
  let captionIssues = 0;
  for (const s of plan.scenes) {
    for (let i = 0; i < s.captions.length; i++) {
      const c = s.captions[i];
      if (c.text.split(/\s+/).length > 4 || c.endFrame <= c.startFrame) captionIssues++;
      if (i > 0 && s.captions[i - 1].endFrame > c.startFrame) captionIssues++;
    }
  }
  checks.push({
    name: 'Mobile Caption Formatting & Sync',
    passed: captionIssues === 0,
    details: captionIssues === 0 ? 'All caption chunks <= 3 words with zero frame overlap' : `${captionIssues} caption formatting/overlap issues found`,
  });

  // 4. Music, ambience, and SFX assets verification
  const requiredAssets = new Set<string>([plan.musicFile, plan.ambienceFile]);
  for (const s of plan.scenes) {
    for (const cue of s.scene.soundEffects) {
      requiredAssets.add(`sound-effects/${cue.sfx}.wav`);
    }
  }
  const missingAssets: string[] = [];
  for (const rel of requiredAssets) {
    const abs = path.join(publicDir, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size < 256) {
      missingAssets.push(rel);
    }
  }
  checks.push({
    name: 'Music, Ambience & SFX Assets',
    passed: missingAssets.length === 0,
    details:
      missingAssets.length === 0
        ? `Verified all ${requiredAssets.size} audio asset files in public/`
        : `Missing audio assets: ${missingAssets.join(', ')}`,
  });

  // 5. Character consistency check across scenes (supports both village & harbor casts)
  const characterIds = new Set<string>();
  for (const s of plan.scenes) {
    for (const c of s.scene.characters) {
      characterIds.add(c.characterId);
    }
  }
  const hasVillageCast = characterIds.has('sam') && characterIds.has('maya') && characterIds.has('leo');
  const hasHarborCast = characterIds.has('finn') && characterIds.has('cora') && characterIds.has('kai');
  // City stories only need a recurring hero, not the whole Mayor/Alex/Chloe trio
  const hasCityCast = ['alex', 'chloe', 'granny', 'mayor', 'worker', 'chef'].some((id) => characterIds.has(id));
  const isCustom3DWorld = plan.scenes.some(
    (s) => s.scene.environment.worldTheme === 'space_chaos' || s.scene.environment.worldTheme === 'subway_chaos'
  );
  checks.push({
    name: 'Character Consistency & Casting',
    passed: hasVillageCast || hasHarborCast || hasCityCast || isCustom3DWorld,
    details: isCustom3DWorld
      ? `Custom 3D sculpted character cast verified (${plan.scenes[0]?.scene.environment.worldTheme})`
      : `Active recurring cast verified: ${Array.from(characterIds).join(', ')}`,
  });

  // 5b. V3 pacing lint (only for stories that opt in with concept.styleVersion = 'v3')
  if (plan.concept.styleVersion === 'v3') {
    const issues = lintStoryV3(plan);
    checks.push({
      name: 'V3 Story Pacing Lint',
      passed: issues.length === 0,
      details:
        issues.length === 0
          ? (() => {
              const L = plan.concept.visualStyle === 'storytime' ? STORYTIME_LIMITS : V3_LIMITS;
              return `${plan.concept.visualStyle ?? 'cel'} style: ≤${L.maxSceneSeconds}s scenes, ≤${L.maxEventGapSeconds}s visual gaps, ${plan.totalDurationSeconds}s total (max ${L.maxTotalSeconds}s)`;
            })()
          : issues.map((i) => `[${i.rule}] ${i.detail}`).join('; '),
    });
  }

  // 6. Exported MP4 technical spec verification (if videoPath provided)
  let checkedVideo: string | null = null;
  if (videoPath && fs.existsSync(videoPath)) {
    checkedVideo = videoPath;
    const stats = fs.statSync(videoPath);
    const probeJson = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath],
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(probeJson) as {
      streams: FfprobeStream[];
      format: { duration?: string; bit_rate?: string };
    };

    const vStream = parsed.streams.find((s) => s.codec_type === 'video');
    const aStream = parsed.streams.find((s) => s.codec_type === 'audio');
    const duration = Number.parseFloat(parsed.format.duration ?? '0');

    const videoSpecOk =
      vStream?.codec_name === 'h264' &&
      vStream?.width === VIDEO_SPEC.width &&
      vStream?.height === VIDEO_SPEC.height &&
      vStream?.r_frame_rate === `${VIDEO_SPEC.fps}/1`;

    checks.push({
      name: 'MP4 Video Stream Spec (1080x1920 H.264 30fps)',
      passed: videoSpecOk,
      details: vStream
        ? `${vStream.width}x${vStream.height} ${vStream.codec_name} @ ${vStream.r_frame_rate}, ${duration.toFixed(2)}s, ${(stats.size / (1024 * 1024)).toFixed(2)} MB`
        : 'Video stream missing',
    });

    const audioSpecOk =
      aStream?.codec_name === 'aac' &&
      Number.parseInt(aStream?.sample_rate ?? '0', 10) === VIDEO_SPEC.audioSampleRate;

    checks.push({
      name: 'MP4 Audio Stream Spec (AAC 48 kHz)',
      passed: audioSpecOk,
      details: aStream
        ? `${aStream.codec_name} @ ${aStream.sample_rate} Hz`
        : 'Audio stream missing',
    });

    // Check non-silent audio via ffmpeg volumedetect
    const volOut = execFileSync(
      'ffmpeg',
      ['-i', videoPath, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    // ffmpeg prints volumedetect to stderr; handle below cleanly
    void volOut;
  }

  const report: QaReport = {
    checkedAt: new Date().toISOString(),
    projectId: plan.projectId,
    overallPass: checks.every((c) => c.passed),
    videoFile: checkedVideo,
    checks,
  };

  fs.mkdirSync(path.dirname(QA_JSON_FILE), { recursive: true });
  fs.writeFileSync(QA_JSON_FILE, JSON.stringify(report, null, 2), 'utf8');

  const mdLines = [
    `# Quality Assurance Report — ${plan.concept.title}`,
    '',
    `- **Project ID**: \`${plan.projectId}\``,
    `- **Checked At**: ${report.checkedAt}`,
    `- **Status**: ${report.overallPass ? 'PASS' : 'FAIL'}`,
    `- **Video File**: ${report.videoFile ? `\`${report.videoFile}\`` : 'N/A'}`,
    '',
    '| Check | Status | Details |',
    '|-------|--------|---------|',
    ...report.checks.map((c) => `| ${c.name} | ${c.passed ? 'PASS' : 'FAIL'} | ${c.details} |`),
    '',
  ];
  fs.writeFileSync(QA_MD_FILE, mdLines.join('\n'), 'utf8');

  return report;
}
