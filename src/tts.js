// src/tts.js
// Generates narration audio per scene using a free neural voice — a warm,
// friendly, clear voice suited to toddler content (via `msedge-tts`,
// Microsoft Edge's "Read Aloud" service — free, no API key).

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICE = process.env.TTS_VOICE || 'en-US-AnaNeural'; // warm, bright, clear — suits young audiences

async function narrateAll() {
  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const audioDir = path.resolve('output/audio');
  fs.mkdirSync(audioDir, { recursive: true });

  for (const scene of storyboard.scenes) {
    console.log(`🔊 Narrating scene "${scene.id}"...`);
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(audioDir, scene.narration);
    const finalPath = path.join(audioDir, `${scene.id}.mp3`);
    fs.renameSync(audioFilePath, finalPath);
    tts.close();
    console.log(`   ✅ Saved ${finalPath}`);
  }

  console.log('✅ All narration audio generated.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  narrateAll().catch((err) => {
    console.error('TTS failed. This step needs internet access.');
    console.error(err.message || err);
    process.exit(1);
  });
}

export default narrateAll;
