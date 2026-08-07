// src/fetchVisuals.js
// Generates simple, bold, bright visuals per scene — genuinely the right
// aesthetic for toddler content (real kids' shows use bold simple shapes
// deliberately, not just because it's cheap). Code-drawn SVG, converted to
// JPG, $0, no API needed for this step at all.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WIDTH = 1080;
const HEIGHT = 1920;

const BRIGHT_PALETTE = [
  { bg: '#FFD966', accent: '#FF6B6B' },
  { bg: '#6EC6CA', accent: '#FFE066' },
  { bg: '#F7A072', accent: '#4C6E5D' },
  { bg: '#A8DADC', accent: '#E76F51' },
  { bg: '#FFB4A2', accent: '#6D6875' },
];

const COLOR_NAME_TO_HEX = {
  red: '#E63946', blue: '#457B9D', green: '#2A9D8F', yellow: '#FFD60A',
  orange: '#F4A261', purple: '#9B5DE5', pink: '#F72585', brown: '#8D5524',
  black: '#2B2B2B', white: '#F8F9FA',
};

function svgHeader() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">`;
}

function background(palette) {
  return `<rect width="1080" height="1920" fill="${palette.bg}"/>
    <circle cx="900" cy="250" r="180" fill="${palette.accent}" opacity="0.25"/>
    <circle cx="150" cy="1700" r="220" fill="${palette.accent}" opacity="0.2"/>`;
}

function simpleCharacter(palette, x, y, scale = 1, bounceOffset = 0, eyeScale = 1) {
  return `<g transform="translate(${x},${y + bounceOffset}) scale(${scale})">
    <ellipse cx="0" cy="180" rx="140" ry="30" fill="#000" opacity="${0.12 - bounceOffset * 0.0003}"/>
    <circle cx="0" cy="0" r="170" fill="${palette.accent}"/>
    <circle cx="-55" cy="-30" r="32" fill="white"/>
    <circle cx="55" cy="-30" r="32" fill="white"/>
    <circle cx="-55" cy="-30" r="${14 * eyeScale}" fill="#2B2B2B"/>
    <circle cx="55" cy="-30" r="${14 * eyeScale}" fill="#2B2B2B"/>
    <path d="M-40,50 Q0,90 40,50" stroke="#2B2B2B" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="-100" cy="10" r="20" fill="${palette.accent}"/>
    <circle cx="100" cy="10" r="20" fill="${palette.accent}"/>
  </g>`;
}

// Real, simple procedural animation: a gentle bounce + occasional blink,
// rendered as a short sequence of frames and stitched into a seamlessly
// looping video clip via ffmpeg. This is genuine movement (not a static
// image with a Ken Burns zoom like everything else in this pipeline) —
// honest about what it is: a simple bounce/blink loop, not full character
// animation with gestures or lip-sync.
function renderCharacterAnimation(palette, outPath, durationSeconds = 3) {
  const fps = 24;
  const totalFrames = Math.round(durationSeconds * fps);
  const framesDir = outPath.replace(/\.mp4$/, '_frames');
  fs.mkdirSync(framesDir, { recursive: true });

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames; // 0 to 1 across the loop
    // Gentle sine-wave bounce, completes exactly one cycle per loop (seamless)
    const bounceOffset = -Math.sin(t * Math.PI * 2) * 22;
    // Quick blink twice per loop
    const blinkPhase = (t * 4) % 1;
    const eyeScale = blinkPhase > 0.92 ? 0.15 : 1;

    const svg = svgHeader() + background(palette) + simpleCharacter(palette, 540, 1000, 1.3, bounceOffset, eyeScale) + `</svg>`;
    const svgPath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.svg`);
    fs.writeFileSync(svgPath, svg);
    execSync(`rsvg-convert -w ${WIDTH} -h ${HEIGHT} "${svgPath}" -o "${svgPath.replace('.svg', '.png')}"`);
    fs.unlinkSync(svgPath);
  }

  execSync(
    `ffmpeg -y -framerate ${fps} -i "${framesDir}/frame_%04d.png" ` +
    `-c:v libx264 -pix_fmt yuv420p -t ${durationSeconds} "${outPath}"`
  );
  fs.rmSync(framesDir, { recursive: true, force: true });
}

function numberScene(value, palette) {
  return svgHeader() + background(palette) +
    `<text x="540" y="1050" font-family="sans-serif" font-size="600" font-weight="900"
      text-anchor="middle" fill="white" stroke="${palette.accent}" stroke-width="12">${value}</text>` +
    simpleCharacter(palette, 540, 1550, 0.55) +
    `</svg>`;
}

function colorScene(colorName, palette) {
  const hex = COLOR_NAME_TO_HEX[colorName.toLowerCase()] || palette.accent;
  return svgHeader() + background(palette) +
    `<rect x="240" y="500" width="600" height="600" rx="60" fill="${hex}" stroke="white" stroke-width="16"/>` +
    `<text x="540" y="1250" font-family="sans-serif" font-size="110" font-weight="800"
      text-anchor="middle" fill="white">${colorName}</text>` +
    simpleCharacter(palette, 540, 1600, 0.5) +
    `</svg>`;
}

function shapeScene(shapeName, palette) {
  let shape = '';
  const s = shapeName.toLowerCase();
  if (s.includes('circle')) shape = `<circle cx="540" cy="750" r="280" fill="${palette.accent}"/>`;
  else if (s.includes('square')) shape = `<rect x="270" y="480" width="540" height="540" fill="${palette.accent}"/>`;
  else if (s.includes('triangle')) shape = `<polygon points="540,470 830,980 250,980" fill="${palette.accent}"/>`;
  else if (s.includes('star')) shape = `<polygon points="540,460 620,700 880,700 670,850 750,1090 540,940 330,1090 410,850 200,700 460,700" fill="${palette.accent}"/>`;
  else shape = `<circle cx="540" cy="750" r="280" fill="${palette.accent}"/>`;

  return svgHeader() + background(palette) + shape +
    `<text x="540" y="1250" font-family="sans-serif" font-size="100" font-weight="800"
      text-anchor="middle" fill="white">${shapeName}</text>` +
    simpleCharacter(palette, 540, 1600, 0.5) +
    `</svg>`;
}

function animalScene(animalName, palette) {
  return svgHeader() + background(palette) +
    `<text x="540" y="850" font-family="sans-serif" font-size="90" font-weight="700"
      text-anchor="middle" fill="white">${animalName}</text>` +
    simpleCharacter(palette, 540, 1200, 0.9) +
    `</svg>`;
}

function characterScene(palette) {
  return svgHeader() + background(palette) +
    simpleCharacter(palette, 540, 1000, 1.3) +
    `</svg>`;
}

function renderScene(scene, palette, outPath) {
  let svg;
  switch (scene.visualType) {
    case 'number': svg = numberScene(scene.visualValue, palette); break;
    case 'color': svg = colorScene(scene.visualValue, palette); break;
    case 'shape': svg = shapeScene(scene.visualValue, palette); break;
    case 'animal': svg = animalScene(scene.visualValue, palette); break;
    default: svg = characterScene(palette);
  }
  const svgPath = outPath.replace(/\.jpg$/, '.svg');
  fs.writeFileSync(svgPath, svg);
  execSync(`rsvg-convert -w ${WIDTH} -h ${HEIGHT} "${svgPath}" -o "${outPath}"`);
  fs.unlinkSync(svgPath);
}

async function fetchVisuals() {
  const storyboard = JSON.parse(fs.readFileSync(path.resolve('output/storyboard.json'), 'utf-8'));
  const photosDir = path.resolve('output/photos');
  fs.mkdirSync(photosDir, { recursive: true });

  for (const scene of storyboard.scenes) {
    const palette = BRIGHT_PALETTE[Math.floor(Math.random() * BRIGHT_PALETTE.length)];
    console.log(`🎨 Rendering scene "${scene.id}" (${scene.visualType}: ${scene.visualValue})...`);

    if (scene.visualType === 'character') {
      // Real animated bounce+blink loop for character scenes specifically.
      const outPath = path.join(photosDir, `${scene.id}_a.mp4`);
      renderCharacterAnimation(palette, outPath, Math.max(2, Math.min(4, scene.duration_seconds || 3)));
      console.log(`   ✅ Saved ${outPath} (animated)`);
    } else {
      const outPath = path.join(photosDir, `${scene.id}_a.jpg`);
      renderScene(scene, palette, outPath);
      console.log(`   ✅ Saved ${outPath}`);
    }
  }

  console.log('✅ All visuals ready ($0 cost, no API needed).');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchVisuals().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default fetchVisuals;
