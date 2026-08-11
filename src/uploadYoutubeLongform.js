// src/uploadYoutube.js
// Uploads the long-form compilation video to YouTube, with a real
// auto-generated thumbnail and the honest per-compilation affiliate link
// + FTC disclosure — same proven mechanisms from the short-form project,
// adapted for this longer format.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

function buildDescription(storyboard) {
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  const searchTopic = storyboard.affiliate_search_query || 'personal finance books';
  const amazonLink = `https://www.amazon.com/s?k=${encodeURIComponent(searchTopic)}${tag ? `&tag=${tag}` : ''}`;
  const disclosure = 'As an Amazon Associate I earn from qualifying purchases.';

  if (!tag) {
    console.log('⚠️  AMAZON_ASSOCIATE_TAG not set — the Amazon link will NOT be tagged, no commission will be earned.');
  }

  return `${storyboard.title}\n\n` +
    `A compilation of genuinely surprising, real money and finance facts.\n\n` +
    `👉 More on this topic: ${amazonLink}\n\n` +
    `General financial education — not investment advice.\n\n` +
    `${disclosure}`;
}

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
        description: buildDescription(storyboard),
        tags: ['money facts', 'finance facts', 'financial literacy', 'personal finance', 'facts compilation'],
        categoryId: '27', // Education
      },
      status: {
        privacyStatus: process.env.PRIVACY_STATUS || 'private',
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  console.log(`✅ Uploaded! Video ID: ${res.data.id}`);
  console.log(`   https://youtu.be/${res.data.id}`);

  try {
    console.log('🖼  Generating custom thumbnail...');
    const thumbPath = await generateThumbnail(storyboard);
    console.log(`🖼  Setting custom thumbnail (${thumbPath})...`);
    await youtube.thumbnails.set({
      videoId: res.data.id,
      media: { body: fs.createReadStream(thumbPath) },
    });
    console.log('   ✅ Thumbnail set.');
  } catch (err) {
    console.log('   ⚠️  Could not set thumbnail (often requires phone-verifying your YouTube account):', err.message);
  }

  return res.data;
}

async function generateThumbnail(storyboard) {
  const { execSync } = await import('child_process');
  const firstScene = storyboard.scenes.find((s) => s.id !== 'intro') || storyboard.scenes[0];
  const photoCandidates = [
    path.resolve('output/photos', `${firstScene.id}_a.jpg`),
    path.resolve('output/photos', `${firstScene.id}.jpg`),
  ];
  const bgPhoto = photoCandidates.find((p) => fs.existsSync(p));
  if (!bgPhoto) throw new Error('No source photo found to build a thumbnail from.');

  const hookText = (storyboard.hook || storyboard.title || '').toUpperCase().replace(/['"]/g, '').slice(0, 60);
  const words = hookText.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 22) { lines.push(current.trim()); current = word; }
    else { current += ' ' + word; }
  }
  if (current.trim()) lines.push(current.trim());

  const lineHeight = 100;
  const blockHeight = lines.length * lineHeight;
  const startY = 720 - 90 - blockHeight;
  const drawtextFilters = lines.map((line, i) => {
    const escaped = line.replace(/:/g, '\\:').replace(/'/g, '');
    const yPos = startY + i * lineHeight;
    return `drawtext=text='${escaped}':fontsize=64:fontcolor=white:borderw=8:bordercolor=black:x=(w-text_w)/2:y=${yPos}:font=DejaVu-Sans-Bold`;
  }).join(',');

  const outPath = path.resolve('output/thumbnail.jpg');
  execSync(
    `ffmpeg -y -i "${bgPhoto}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,` +
    `eq=contrast=1.15:brightness=-0.03:saturation=1.2,${drawtextFilters}" -q:v 2 "${outPath}"`
  );
  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  upload().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default upload;
