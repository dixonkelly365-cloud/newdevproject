// src/pipeline.js
// Runs the full pipeline: original story -> simple bold visuals -> narrate
// -> assemble -> YouTube.

import 'dotenv/config';
import generateStory from './generateStory.js';
import fetchVisuals from './fetchVisuals.js';
import narrateAll from './tts.js';
import assemble from './assembleVideo.js';
import upload from './uploadYoutube.js';

async function main() {
  console.log('=== Step 1/5: Generating original episode ===');
  await generateStory();

  console.log('\n=== Step 2/5: Rendering visuals ($0, no API) ===');
  await fetchVisuals();

  console.log('\n=== Step 3/5: Generating narration ===');
  await narrateAll();

  console.log('\n=== Step 4/5: Assembling final video ===');
  const finalVideo = await assemble();
  console.log(`\n🎉 Video ready at: ${finalVideo}`);

  const autoUpload = (process.env.PIPELINE_AUTO_UPLOAD || 'false').toLowerCase() === 'true';
  if (autoUpload) {
    console.log('\n=== Step 5/5: Uploading to YouTube ===');
    await upload();
  } else {
    console.log('\n=== Step 5/5: YouTube upload skipped (PIPELINE_AUTO_UPLOAD is not "true") ===');
    console.log('Review output/final_video.mp4, then run: npm run upload');
  }
}

main().catch((err) => {
  console.error('\n❌ Pipeline failed:', err.message);
  process.exit(1);
});
