// src/generateStory.js
// Generates a LONG-FORM compilation video ("20 Surprising Money Facts You
// Didn't Know") by calling the same proven single-fact generation logic
// used in the short-form money-facts channel, N times in a row, and
// combining the results into one longer video with numbered segment
// transitions. This is deliberately NOT a rearchitecture — it reuses the
// exact same, already-tested per-fact prompt and quality bar, just
// repeated and stitched together, which is a lower-risk path to
// long-form than asking one huge single generation to produce everything
// at once (real risk of truncation/parsing issues at that size).
//
// WHY LONG-FORM: YouTube Shorts CPM runs roughly 95% lower than long-form
// CPM as of 2026, regardless of niche — the format itself matters more
// for revenue than niche choice. This targets real long-form ad
// eligibility (8+ minutes unlocks mid-roll ads).

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TOPICS_PATH = path.resolve('output-state/history-topics.json');
const FACTS_PER_COMPILATION = parseInt(process.env.FACTS_PER_COMPILATION || '35', 10);

const SYSTEM_PROMPT = `You write ONE segment for a money/finance facts compilation video — real,
genuinely surprising, specific money and finance facts. EVERY topic must be directly, centrally
about money, currency, banking, markets, spending, or a financial mechanism — not general
history/policy where money is only a tangential detail.

Content pillars (pick a genuinely fresh one each time):
1. Real historical events specifically ABOUT money/currency/finance (a real currency collapse,
   a real historic financial scam or fraud, the real origin of a specific financial instrument,
   a real historical fortune won or lost through a financial event specifically)
2. Named psychological/behavioral-economics effects related to money, with a concrete example
3. Genuinely surprising true mechanics of how money/finance actually works
4. A real, specific historical figure or event where financial dealings are the actual subject

Before finalizing, check: "Is this fundamentally ABOUT money/finance, or does money just
happen to be mentioned?" If the second, pick a different topic.

The only hard rule: never give personalized investment advice, never recommend a specific
current stock/crypto/asset, never fabricate a statistic you're not confident is real. Be
specific and vivid — real dates, real numbers, real names.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "fact_title": string,        // short, e.g. "The $27 Deal That Bought Manhattan"
  "narration_lines": [string], // 3-5 short spoken lines telling this ONE fact, hook-first
  "stock_queries": [string]    // one 2-4 word photo search term per narration line, same order
}

Output nothing but the JSON object.`;

function loadUsedTopics() {
  try {
    return JSON.parse(fs.readFileSync(TOPICS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsedTopics(topics) {
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
      generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
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

async function generateOneFact(usedTopics) {
  const userMessage = usedTopics.length
    ? `Already-covered topics, pick something genuinely different: ${usedTopics.slice(-60).join(', ')}`
    : 'Pick any genuinely interesting, real money/finance fact.';

  const rawText = await callGemini(userMessage);
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

async function generateStory() {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/apikey and add to .env.');
  }

  const usedTopics = loadUsedTopics();
  const scenes = [];
  const factTitles = [];

  // Intro scene
  scenes.push({
    id: 'intro',
    speaker: 'narrator',
    narration: `${FACTS_PER_COMPILATION} genuinely surprising money facts, coming right up. Let's start.`,
    duration_seconds: 4,
    stockQuery: 'money stack coins',
  });

  for (let i = 0; i < FACTS_PER_COMPILATION; i++) {
    console.log(`Generating fact ${i + 1}/${FACTS_PER_COMPILATION}...`);
    let fact;
    try {
      fact = await generateOneFact([...usedTopics, ...factTitles]);
    } catch (err) {
      console.error(`Failed to generate fact ${i + 1}, skipping:`, err.message);
      continue;
    }

    factTitles.push(fact.fact_title);

    // Numbered segment transition
    scenes.push({
      id: `segment${i + 1}_intro`,
      speaker: 'narrator',
      narration: `Fact number ${i + 1}.`,
      duration_seconds: 2,
      stockQuery: 'question mark curiosity',
    });

    fact.narration_lines.forEach((line, lineIdx) => {
      scenes.push({
        id: `segment${i + 1}_line${lineIdx + 1}`,
        speaker: 'narrator',
        narration: line,
        duration_seconds: 5,
        stockQuery: fact.stock_queries?.[lineIdx] || 'money finance',
      });
    });
  }

  // Outro scene with affiliate CTA
  scenes.push({
    id: 'outro',
    speaker: 'narrator',
    narration: 'That\'s all for today. If any of these surprised you, check the description for more — and subscribe for more facts like these.',
    duration_seconds: 5,
    stockQuery: 'thank you subscribe',
  });

  const storyboard = {
    topic_slug: `compilation-${Date.now()}`,
    title: `${FACTS_PER_COMPILATION} Surprising Money Facts You Didn't Know | Money Facts`,
    theme: 'money facts compilation',
    hook: `${FACTS_PER_COMPILATION} genuinely surprising money facts, coming right up.`,
    affiliate_search_query: 'personal finance books',
    scenes,
  };

  saveUsedTopics([...usedTopics, ...factTitles]);

  const outDir = path.resolve('output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  console.log(`✅ Compilation generated: "${storyboard.title}"`);
  console.log(`   ${factTitles.length} facts, ${scenes.length} scenes, ~${Math.round(totalDuration / 60)} minutes`);
  return storyboard;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateStory().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default generateStory;
