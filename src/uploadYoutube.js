// src/uploadYoutube.js
// Uploads output/final_video.mp4 to YouTube using the refresh token
// obtained from `npm run auth`. Fully non-interactive after that point —
// this is the piece that lets the whole pipeline run unattended.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

async function upload() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const videoPath = path.resolve('output/final_video.mp4');

  if (!fs.existsSync(videoPath)) {
    throw new Error('output/final_video.mp4 not found — run the assemble step first.');
  }

  console.log(`📤 Uploading "${storyboard.title}" to YouTube...`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: process.env.VIDEO_TITLE || storyboard.title,
        description: `An AI-generated animated story.\n\n${storyboard.scenes.map(s => s.narration).join(' ')}`,
        tags: ['AI animation', '3D animation', 'short story'],
        categoryId: '1', // Film & Animation
      },
      status: {
        privacyStatus: process.env.PRIVACY_STATUS || 'private', // 'private' | 'unlisted' | 'public'
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  console.log(`✅ Uploaded! Video ID: ${res.data.id}`);
  console.log(`   https://youtu.be/${res.data.id}`);

  // Set a custom thumbnail if a hand-designed one exists for this theme —
  // this matters more for clicks than in-video quality does, and a hand-
  // illustrated flat-design thumbnail looks far better than any frame
  // grabbed from the (still fairly simple) 3D animation itself.
  const thumbPath = path.resolve('assets', `thumbnail_${storyboard.theme}.png`);
  if (fs.existsSync(thumbPath)) {
    console.log(`🖼  Setting custom thumbnail (assets/thumbnail_${storyboard.theme}.png)...`);
    try {
      await youtube.thumbnails.set({
        videoId: res.data.id,
        media: { body: fs.createReadStream(thumbPath) },
      });
      console.log('   ✅ Thumbnail set.');
    } catch (err) {
      // Custom thumbnails require the YouTube account to be phone-verified —
      // if that hasn't been done, this fails gracefully rather than crashing
      // the whole upload (the video itself still uploads fine either way).
      console.log('   ⚠️  Could not set thumbnail (often requires phone-verifying your YouTube account):', err.message);
    }
  } else {
    console.log(`ℹ️  No custom thumbnail found for theme "${storyboard.theme}" (assets/thumbnail_${storyboard.theme}.png) — using YouTube's auto-generated one.`);
  }

  return res.data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  upload().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default upload;
