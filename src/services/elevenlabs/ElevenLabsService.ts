import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadEnv } from '../../config/env.js';
import { SceneScript, WordTimestamp } from '../scripting/schema.js';

export interface SceneVoiceArtifact {
  sceneId: string;
  sceneNumber: number;
  audioPublicPath: string;
  audioAbsolutePath: string;
  durationSeconds: number;
  words: WordTimestamp[];
  voiceId: string;
  contentHash: string;
  cached: boolean;
  /** Per-character timing from ElevenLabs (drives viseme lip-sync) */
  chars?: { c: string; s: number; e: number }[];
}

interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface ElevenLabsWithTimestampsResponse {
  audio_base64: string;
  alignment?: ElevenLabsAlignment | null;
  normalized_alignment?: ElevenLabsAlignment | null;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
}

const PREFERRED_VOICE_NAMES = ['Brian', 'Chris', 'Adam', 'Charlie', 'Liam', 'Josh', 'George'];

export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly defaultVoiceId: string;
  private readonly modelId: string;
  private readonly outputDir: string;

  constructor(outputDir = path.join(process.cwd(), 'public', 'audio')) {
    const env = loadEnv();
    this.apiKey = env.elevenLabsApiKey;
    this.defaultVoiceId = env.elevenLabsVoiceId;
    this.modelId = env.elevenLabsModelId;
    this.outputDir = outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  public isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  public async resolveStorytellerVoiceId(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('ELEVENLABS_API_KEY is missing in environment (.env.local)');
    }

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this.apiKey },
      });
      if (!res.ok) {
        return this.defaultVoiceId;
      }
      const data = (await res.json()) as { voices?: ElevenLabsVoice[] };
      const voices = data.voices ?? [];
      if (voices.length === 0) return this.defaultVoiceId;

      if (voices.some((v) => v.voice_id === this.defaultVoiceId)) {
        return this.defaultVoiceId;
      }

      for (const preferred of PREFERRED_VOICE_NAMES) {
        const match = voices.find((v) =>
          v.name.toLowerCase().includes(preferred.toLowerCase())
        );
        if (match) return match.voice_id;
      }

      const maleNarration = voices.find(
        (v) =>
          v.labels?.gender?.toLowerCase() === 'male' &&
          (v.labels?.use_case?.toLowerCase().includes('narration') ||
            v.labels?.accent?.toLowerCase().includes('american'))
      );
      if (maleNarration) return maleNarration.voice_id;

      return voices[0].voice_id;
    } catch {
      return this.defaultVoiceId;
    }
  }

  public computeHash(scene: SceneScript, voiceId: string): string {
    const payload = JSON.stringify({
      text: scene.narration,
      voiceId,
      modelId: this.modelId,
      voiceSettings: scene.voiceSettings,
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  public async generateSceneVoice(
    scene: SceneScript,
    voiceId: string,
    options: { force?: boolean; requireChars?: boolean } = {}
  ): Promise<SceneVoiceArtifact> {
    if (!this.isConfigured()) {
      throw new Error('ELEVENLABS_API_KEY is missing in environment (.env.local)');
    }

    const contentHash = this.computeHash(scene, voiceId);
    const mp3Filename = `${scene.id}.mp3`;
    const metaFilename = `${scene.id}.alignment.json`;
    const mp3Path = path.join(this.outputDir, mp3Filename);
    const metaPath = path.join(this.outputDir, metaFilename);
    const publicPath = `audio/${mp3Filename}`;

    if (!options.force && fs.existsSync(mp3Path) && fs.existsSync(metaPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as SceneVoiceArtifact;
        if (existing.contentHash === contentHash && existing.durationSeconds > 0.2 && (!options.requireChars || existing.chars?.length)) {
          return { ...existing, cached: true };
        }
      } catch {
        // Regenerate if metadata is malformed
      }
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text: scene.narration,
        model_id: this.modelId,
        voice_settings: {
          stability: scene.voiceSettings.stability,
          similarity_boost: scene.voiceSettings.similarityBoost,
          style: scene.voiceSettings.style,
          use_speaker_boost: true,
          speed: scene.voiceSettings.speed,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `ElevenLabs API failed for ${scene.id} (HTTP ${response.status}): ${errText.slice(0, 300)}`
      );
    }

    const payload = (await response.json()) as ElevenLabsWithTimestampsResponse;
    if (!payload.audio_base64) {
      throw new Error(`ElevenLabs returned empty audio_base64 for ${scene.id}`);
    }

    const audioBuffer = Buffer.from(payload.audio_base64, 'base64');
    fs.writeFileSync(mp3Path, audioBuffer);

    const alignment = payload.alignment ?? payload.normalized_alignment ?? null;
    const probedDuration = this.probeAudioDuration(mp3Path);
    const words = alignment
      ? this.extractWordsFromAlignment(alignment)
      : this.estimateWordTimestamps(scene.narration, probedDuration);

    const lastWordEnd = words.length > 0 ? words[words.length - 1].endSeconds : 0;
    const durationSeconds = Math.max(probedDuration, lastWordEnd, 0.8);

    const artifact: SceneVoiceArtifact = {
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      audioPublicPath: publicPath,
      audioAbsolutePath: mp3Path,
      durationSeconds,
      words,
      voiceId,
      contentHash,
      cached: false,
      chars: alignment
        ? (alignment.characters ?? []).map((c, i) => ({
            c,
            s: alignment.character_start_times_seconds?.[i] ?? 0,
            e: alignment.character_end_times_seconds?.[i] ?? 0,
          }))
        : undefined,
    };

    fs.writeFileSync(metaPath, JSON.stringify(artifact, null, 2), 'utf8');
    return artifact;
  }

  public extractWordsFromAlignment(alignment: ElevenLabsAlignment): WordTimestamp[] {
    const chars = alignment.characters ?? [];
    const starts = alignment.character_start_times_seconds ?? [];
    const ends = alignment.character_end_times_seconds ?? [];
    const words: WordTimestamp[] = [];

    let currentWord = '';
    let wordStart = -1;
    let wordEnd = 0;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const st = starts[i] ?? wordEnd;
      const en = ends[i] ?? st + 0.05;

      if (/\s/.test(ch)) {
        if (currentWord.length > 0) {
          words.push({
            word: currentWord,
            startSeconds: Math.max(0, wordStart),
            endSeconds: Math.max(wordStart + 0.04, wordEnd),
          });
          currentWord = '';
          wordStart = -1;
        }
      } else {
        if (wordStart < 0) wordStart = st;
        currentWord += ch;
        wordEnd = en;
      }
    }

    if (currentWord.length > 0) {
      words.push({
        word: currentWord,
        startSeconds: Math.max(0, wordStart),
        endSeconds: Math.max(wordStart + 0.04, wordEnd),
      });
    }

    return words;
  }

  public estimateWordTimestamps(text: string, durationSeconds: number): WordTimestamp[] {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const totalChars = tokens.reduce((acc, w) => acc + Math.max(2, w.length), 0);
    let cursor = 0.04;
    const usable = Math.max(0.4, durationSeconds - 0.12);

    return tokens.map((word) => {
      const weight = Math.max(2, word.length) / totalChars;
      const dur = usable * weight;
      const startSeconds = cursor;
      const endSeconds = cursor + dur;
      cursor = endSeconds;
      return { word, startSeconds, endSeconds };
    });
  }

  private probeAudioDuration(filePath: string): number {
    try {
      const out = execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          filePath,
        ],
        { encoding: 'utf8' }
      ).trim();
      const parsed = Number.parseFloat(out);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    } catch {
      // Fallback handled below
    }
    return 2.5;
  }
}
