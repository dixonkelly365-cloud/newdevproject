// src/tts.js
// Generates narration audio per scene using a single, consistent narrator
// voice throughout the episode — via `msedge-tts` (Microsoft Edge's
// "Read Aloud" service — free, no API key). This channel uses ONE
// narrator voice for every scene (unlike the separate Ghana Stories
// project, which has its own multi-character voice cast system).

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const NARRATOR_VOICE = process.env.NARRATOR_VOICE || 'en-US-JennyNeural';

async function narrateAll() {
  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const audioDir = path.resolve('output/audio');
  fs.mkdirSync(audioDir, { recursive: true });

  for (const scene of storyboard.scenes) {
    console.log(`🔊 Narrating scene "${scene.id}"...`);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(NARRATOR_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
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
    console.error('TTS failed. This step needs internet access (it calls a free Microsoft service).');
    console.error(err.message || err);
    process.exit(1);
  });
}

export default narrateAll;
