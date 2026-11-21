import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

let loaded = false;

export interface EnvConfig {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsModelId: string;
}

export function loadEnv(): EnvConfig {
  if (!loaded) {
    const root = process.cwd();
    const envLocalPath = path.join(root, '.env.local');
    const envPath = path.join(root, '.env');
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: false });
    }
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
    loaded = true;
  }

  return {
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? '',
    // Default expressive storytelling American male voice (Brian / Chris / Adam fallback resolved dynamically)
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? 'nPczCjzI2devNBz1zQrb',
    elevenLabsModelId: process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2',
  };
}
