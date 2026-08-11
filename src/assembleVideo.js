// src/assembleVideo.js
// Stitches each scene's real photo (animated with a Ken Burns slow zoom/pan
// effect) + narration audio into a per-scene .mp4, then concatenates all
// scenes into the final output/final_video.mp4. Requires ffmpeg on PATH.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FPS = parseInt(process.env.FPS || '30', 10);
const WIDTH = parseInt(process.env.WIDTH || '1080', 10);
const HEIGHT = parseInt(process.env.HEIGHT || '1920', 10);

function run(cmd) {
  console.log(`   $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function getMediaDuration(filePath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  ).toString().trim();
  return parseFloat(out);
}

async function assemble() {
  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const scenesDir = path.resolve('output/scenes_rendered');
  fs.mkdirSync(scenesDir, { recursive: true });

  // Normalize every narration clip to the same loudness target first, so
  // volume doesn't jump between scenes (a common issue with TTS services,
  // where clips can come out at inconsistent levels).
  const normDir = path.resolve('output/audio_normalized');
  fs.mkdirSync(normDir, { recursive: true });
  for (const scene of storyboard.scenes) {
    const rawPath = path.resolve('output/audio', `${scene.id}.mp3`);
    if (!fs.existsSync(rawPath)) continue;
    const normPath = path.join(normDir, `${scene.id}.mp3`);
    run(`ffmpeg -y -i "${rawPath}" -af loudnorm=I=-16:TP=-1.5:LRA=11 "${normPath}"`);
  }

  const sceneVideoPaths = [];

  for (const scene of storyboard.scenes) {
    const photoPathA = path.resolve('output/photos', `${scene.id}_a.jpg`);
    const photoPathB = path.resolve('output/photos', `${scene.id}_b.jpg`);
    const audioPath = path.resolve(normDir, `${scene.id}.mp3`);
    const sceneOut = path.join(scenesDir, `${scene.id}.mp4`);
    const hasSplit = fs.existsSync(photoPathB);

    if (!fs.existsSync(photoPathA)) {
      throw new Error(`Missing photo for scene "${scene.id}" — run the fetch-photos step first.`);
    }

    const targetDuration = fs.existsSync(audioPath) ? getMediaDuration(audioPath) : scene.duration_seconds;
    const sceneIndex = storyboard.scenes.indexOf(scene);
    const zoomIn = sceneIndex % 2 === 0;

    function kenBurnsClip(photoPath, duration, outPath, zoomDirIn) {
      const totalFrames = Math.round(duration * FPS);
      const zoomExpr = zoomDirIn
        ? `min(zoom+0.0012,1.3)`
        : `if(lte(zoom,1.0),1.3,max(1.0,zoom-0.0012))`;
      const filter =
        `scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase,` +
        `crop=${WIDTH * 2}:${HEIGHT * 2},` +
        `zoompan=z='${zoomExpr}':d=${totalFrames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`;
      run(
        `ffmpeg -y -loop 1 -i "${photoPath}" -filter_complex "[0:v]${filter}[v]" ` +
        `-map "[v]" -an -c:v libx264 -pix_fmt yuv420p -t ${duration.toFixed(2)} "${outPath}"`
      );
    }

    console.log(`🎞  Assembling scene "${scene.id}" (${hasSplit ? 'A/B split' : 'single photo'}, Ken Burns, ${targetDuration.toFixed(2)}s)`);

    let silentVideoPath;
    if (hasSplit) {
      // A/B split: switch photos at the midpoint — the actual retention
      // technique borrowed from another open-source project using this
      // same free tech stack (Gemini + Pexels + FFmpeg).
      const half1 = targetDuration / 2;
      const half2 = targetDuration - half1;
      const clipA = path.join(scenesDir, `${scene.id}_clipA.mp4`);
      const clipB = path.join(scenesDir, `${scene.id}_clipB.mp4`);
      kenBurnsClip(photoPathA, half1, clipA, zoomIn);
      kenBurnsClip(photoPathB, half2, clipB, !zoomIn);

      const halfListFile = path.join(scenesDir, `${scene.id}_halves.txt`);
      fs.writeFileSync(halfListFile, `file '${clipA}'\nfile '${clipB}'\n`);
      silentVideoPath = path.join(scenesDir, `${scene.id}_silent.mp4`);
      run(`ffmpeg -y -f concat -safe 0 -i "${halfListFile}" -c copy "${silentVideoPath}"`);
    } else {
      silentVideoPath = path.join(scenesDir, `${scene.id}_silent.mp4`);
      kenBurnsClip(photoPathA, targetDuration, silentVideoPath, zoomIn);
    }

    // Mux the full scene's narration audio over the (possibly two-part) silent video.
    if (fs.existsSync(audioPath)) {
      run(
        `ffmpeg -y -i "${silentVideoPath}" -i "${audioPath}" ` +
        `-map 0:v -map 1:a -c:v copy -c:a aac -shortest "${sceneOut}"`
      );
    } else {
      run(`ffmpeg -y -i "${silentVideoPath}" -c copy "${sceneOut}"`);
    }
    sceneVideoPaths.push(sceneOut);
  }

  // Concatenate all scene videos into the final file
  const listFile = path.resolve('output/concat_list.txt');
  fs.writeFileSync(listFile, sceneVideoPaths.map((p) => `file '${p}'`).join('\n'));

  const concatOut = path.resolve('output/final_video_nocaps.mp4');
  run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${concatOut}"`);

  // Mix in cheerful background music (looped to match video length, mixed
  // quietly under the narration) — this is what gives toddler content that
  // "dancing along" feel instead of silence between spoken lines.
  const addMusic = (process.env.BACKGROUND_MUSIC || 'true').toLowerCase() === 'true';
  const musicPath = path.resolve('assets/bgm_loop.wav');
  let musicOut = concatOut;
  if (addMusic && fs.existsSync(musicPath)) {
    const totalDuration = getMediaDuration(concatOut);
    musicOut = path.resolve('output/final_video_with_music.mp4');
    console.log(`🎵 Mixing background music (${totalDuration.toFixed(1)}s)...`);
    run(
      `ffmpeg -y -stream_loop -1 -i "${musicPath}" -i "${concatOut}" ` +
      `-filter_complex "[0:a]volume=0.18,atrim=0:${totalDuration.toFixed(2)}[bgm];` +
      `[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]" ` +
      `-map 1:v -map "[aout]" -c:v copy -c:a aac -shortest "${musicOut}"`
    );
  }

  const finalOut = path.resolve('output/final_video.mp4');
  const burnCaptions = (process.env.BURN_CAPTIONS || 'false').toLowerCase() === 'true';
  const cinematic = (process.env.CINEMATIC_LOOK || 'true').toLowerCase() === 'true';

  // Cinematic grading: gentle desaturation + a cool-shadow/warm-highlight
  // ("teal-orange") color curve, a soft vignette, subtle film grain, and
  // thin black bars top/bottom — the visual cues that read as "documentary/
  // film" rather than a flat, ungraded phone-camera look.
  const gradingFilters = cinematic
    ? `eq=saturation=0.85:contrast=1.08,` +
      `curves=r='0/0.02 0.5/0.48 1/0.95':b='0/0.06 0.5/0.5 1/0.88',` +
      `vignette=PI/4,` +
      `noise=alls=6:allf=t+u,` +
      `drawbox=x=0:y=0:w=iw:h=ih*0.055:color=black@1.0:t=fill,` +
      `drawbox=x=0:y=ih*0.945:w=iw:h=ih*0.055:color=black@1.0:t=fill,`
    : '';

  if (burnCaptions) {
    const assPath = path.resolve('output/captions.ass');
    writeWordByWordAss(storyboard.scenes, assPath, WIDTH, HEIGHT);
    const escapedAss = assPath.replace(/:/g, '\\:');
    run(
      `ffmpeg -y -i "${musicOut}" -vf "${gradingFilters}ass=${escapedAss}" ` +
      `-c:a copy "${finalOut}"`
    );
  } else if (cinematic) {
    // Trailing comma from gradingFilters needs stripping when it's the last filter in the chain.
    run(`ffmpeg -y -i "${musicOut}" -vf "${gradingFilters.replace(/,$/, '')}" -c:a copy "${finalOut}"`);
  } else {
    fs.renameSync(musicOut, finalOut);
  }

  console.log(`✅ Final video assembled: ${finalOut}`);
  return finalOut;
}

function assTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds - Math.floor(seconds)) * 100);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

// Word-by-word "pop" style captions (think MrBeast/Hormozi-style short-form
// captions) — 1-3 words on screen at a time, large and bold, instead of a
// full sentence sitting in a block. Real timing per word isn't available
// without a speech-to-text pass (which the open-source projects this was
// adapted from use Whisper for) — instead, each word's on-screen duration
// is estimated proportional to its character length (longer words get
// slightly more time), distributed across the scene's known total
// duration. Not perfectly synced to the actual TTS audio the way Whisper-
// based timing would be, but a real, tested, reasonable approximation
// that needs no extra dependency.
function writeWordByWordAss(scenes, outPath, width, height) {
  const fontSize = Math.round(width * 0.075);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,60,60,${Math.round(height * 0.28)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const WORDS_PER_CHUNK = 2; // 1-3 reads well; 2 is a good energy/readability balance

  let cursor = 0;
  const events = [];

  for (const scene of scenes) {
    const words = scene.narration.split(/\s+/).filter(Boolean);
    if (!words.length) { cursor += scene.duration_seconds; continue; }

    // Weight each word's share of the scene's duration by its character
    // length (with a floor so short words like "a" still get visible time).
    const weights = words.map((w) => Math.max(w.length, 3));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let wordStart = cursor;
    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
      const chunkWords = words.slice(i, i + WORDS_PER_CHUNK);
      const chunkWeights = weights.slice(i, i + WORDS_PER_CHUNK);
      const chunkDuration = (chunkWeights.reduce((a, b) => a + b, 0) / totalWeight) * scene.duration_seconds;
      const chunkEnd = wordStart + chunkDuration;

      const text = chunkWords.join(' ').toUpperCase().replace(/[{}]/g, '');
      events.push(`Dialogue: 0,${assTimestamp(wordStart)},${assTimestamp(chunkEnd)},Default,,0,0,0,,${text}`);

      wordStart = chunkEnd;
    }

    cursor += scene.duration_seconds;
  }

  fs.writeFileSync(outPath, header + events.join('\n') + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assemble().catch((err) => {
    console.error('Assembly failed. Make sure ffmpeg is installed and on PATH.');
    console.error(err);
    process.exit(1);
  });
}

export default assemble;
