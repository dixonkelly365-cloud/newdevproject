// src/generateStory.js
// Generates ORIGINAL short toddler-education content — simple songs/rhymes
// about colors, counting, animals, sharing, and daily routines — with a
// recurring original character. This is NOT reposted, edited, or "inspired
// by" any existing children's show — every line is freshly generated,
// original content, explicitly instructed to avoid resembling any existing
// characters, songs, or shows.
//
// Uses the same free Gemini API as the other projects in this pipeline.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TOPICS_PATH = path.resolve('output-state/covered-topics.json');

const SYSTEM_PROMPT = `You write short, ORIGINAL toddler-education video scripts (ages 2-5) —
simple, warm, positive songs/rhymes teaching one thing: counting, colors, shapes, animals,
sharing, manners, or a daily routine (brushing teeth, bedtime, washing hands).

CRITICAL: this must be entirely ORIGINAL content. Do not reference, mimic the style of, echo
song structures from, or write anything reminiscent of any existing children's show, character,
or song (CoComelon, Peppa Pig, Baby Shark, nursery rhymes in copyright, etc.). Invent a fresh,
simple, original recurring character each time you're asked (a friendly animal or simple
creature), with a name that doesn't resemble any existing character.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "topic_slug": string,        // e.g. "counting-to-five", "sharing-toys"
  "title": string,               // simple, e.g. "Let's Count to Five!"
  "character_name": string,      // original, simple, easy to say
  "character_type": string,      // e.g. "a friendly round bear", "a cheerful little fox"
  "scenes": [
    {
      "id": string,
      "narration": string,        // ONE simple, short line — toddler-simple vocabulary,
                                    // warm and cheerful, repetition is good here
      "duration_seconds": number, // 4-6 seconds
      "visualType": string,       // one of: "number", "color", "animal", "character", "shape"
      "visualValue": string       // the specific number/color-name/animal/shape this scene shows
    }
  ]
}

Rules:
- Pick a genuinely fresh topic NOT in the already-covered list you're given.
- 8-12 short scenes, 35-55 seconds total. Simple, repetitive, cheerful — toddlers respond well
  to repetition and clear simple structure (e.g. counting 1 to 5 one number per scene).
- Every line must be simple enough for a 2-5 year old: short words, short sentences, warm tone.
- Always positive and safe — no scary content, no conflict, gentle and encouraging only.
- End with a cheerful goodbye scene: narration something like "Great job! See you next time!",
  duration_seconds 4, visualType "character", visualValue the character_type.
- Output nothing but the JSON object.`;

function loadCoveredTopics() {
  try {
    return JSON.parse(fs.readFileSync(TOPICS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveCoveredTopics(topics) {
  fs.mkdirSync(path.dirname(TOPICS_PATH), { recursive: true });
  fs.writeFileSync(TOPICS_PATH, JSON.stringify(topics, null, 2));
}

async function callGemini(userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 3000 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Unexpected Gemini response shape: ${JSON.stringify(data).slice(0, 300)}`);
  return text;
}

async function generateStory() {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/apikey and add to .env.');
  }

  const covered = loadCoveredTopics();
  const userMessage = covered.length
    ? `Already-covered topics, pick something genuinely different: ${covered.join(', ')}`
    : 'Pick any genuinely good toddler-education topic (counting, colors, shapes, animals, manners, or a routine).';

  const rawText = await callGemini(userMessage);
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  let storyboard;
  try {
    storyboard = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse storyboard JSON. Raw response:\n', rawText);
    throw err;
  }

  covered.push(storyboard.topic_slug || storyboard.title);
  saveCoveredTopics(covered);

  const outDir = path.resolve('output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));

  console.log(`✅ Original episode generated: "${storyboard.title}" (character: ${storyboard.character_name})`);
  console.log(`   Topics covered so far: ${covered.length}`);
  return storyboard;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateStory().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default generateStory;
