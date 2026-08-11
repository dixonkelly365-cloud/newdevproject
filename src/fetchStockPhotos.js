// src/fetchStockPhotos.js
// Downloads real, licensed photos (via Pexels' free Photo API) matched to
// each scene's theme — used for the "Ken Burns effect" pipeline (slow zoom/
// pan over a still photo, narrated), a well-established real technique used
// in documentaries and many successful faceless channels. Real photography
// sidesteps every quality ceiling of code-rendered 3D or AI-video-generation
// costs — it's just real, good-looking images, animated simply.
//
// FETCHES TWO PHOTOS PER SCENE (photo_a.jpg, photo_b.jpg) to enable an
// "A/B split" technique — switching visuals partway through each scene,
// a real retention technique used by other open-source faceless-video
// projects with this same tech stack (Gemini + Pexels + FFmpeg). More
// visual variety per scene, same $0 cost, no new signup — just two Pexels
// searches instead of one.
//
// Same free Pexels API key used elsewhere in this project (PEXELS_API_KEY in .env).
// Pexels photos are free for commercial use, no attribution required.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = process.env.PEXELS_API_KEY;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: API_KEY } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse Pexels response: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, outPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, outPath).then(resolve, reject);
      }
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchStockPhotos() {
  if (!API_KEY) {
    throw new Error(
      'PEXELS_API_KEY not set in .env. Get a free key at https://www.pexels.com/api/ ' +
      '(instant approval, no cost) and add it as PEXELS_API_KEY=your_key_here'
    );
  }

  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const photosDir = path.resolve('output/photos');
  fs.mkdirSync(photosDir, { recursive: true });

  const abSplit = (process.env.AB_SPLIT_PHOTOS || 'true').toLowerCase() === 'true';

  const searchCache = {};
  const cursors = {};

  for (const scene of storyboard.scenes) {
    const query = scene.stockQuery || storyboard.title;
    console.log(`📸 Finding photo${abSplit ? 's' : ''} for scene "${scene.id}" (query: "${query}")...`);

    if (!searchCache[query]) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10`;
      const result = await fetchJson(url);
      if (!result.photos || !result.photos.length) {
        throw new Error(`No Pexels photo results for query "${query}". Try a more common search term.`);
      }
      searchCache[query] = result.photos;
      cursors[query] = 0;
    }

    const photos = searchCache[query];

    // Photo A — always fetched, this is the scene's primary image.
    const photoA = photos[cursors[query] % photos.length];
    cursors[query] += 1;
    const urlA = photoA.src.large2x || photoA.src.original;
    await downloadFile(urlA, path.join(photosDir, `${scene.id}_a.jpg`));
    console.log(`   ✅ Photo A saved (by ${photoA.photographer} on Pexels)`);

    if (abSplit) {
      // Photo B — a different result from the same search, used for the
      // second half of the scene (the actual "A/B split" retention technique).
      const photoB = photos[cursors[query] % photos.length];
      cursors[query] += 1;
      const urlB = photoB.src.large2x || photoB.src.original;
      await downloadFile(urlB, path.join(photosDir, `${scene.id}_b.jpg`));
      console.log(`   ✅ Photo B saved (by ${photoB.photographer} on Pexels)`);
    }
  }

  console.log('✅ All photos downloaded.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchStockPhotos().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default fetchStockPhotos;
