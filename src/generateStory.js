// src/generateStory.js
// FREE, no-credit-card-ever story generator for the Money & Finance Facts
// channel — real, factual money/finance content: history of money, the
// psychology of spending/saving, how financial systems actually work,
// surprising facts about currency and markets. This is deliberately
// GENERAL financial education, NOT specific investment advice, stock
// picks, or "buy this" recommendations — that distinction matters both
// for honesty (an automated pipeline shouldn't be giving individualized
// financial advice) and for staying in a safe content lane.
//
// Finance is genuinely one of YouTube's highest-CPM niches, but that
// premium mostly applies to real investment/credit-card-comparison
// content requiring real authority. This channel instead targets the
// "general financial literacy and money facts" lane — still meaningfully
// higher CPM than pure entertainment, while staying honest and safe for
// an automated, faceless pipeline.
//
// Same proven unlimited-topic mechanism as the other channels in this
// pipeline family.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TOPICS_PATH = path.resolve('output-state/history-topics.json');

const SYSTEM_PROMPT = `You write short-form videos about REAL, genuinely surprising money and
finance facts — specific, vivid, "wait, really?" true stories and facts, not vague generalities.
Think: a specific real historical event with real numbers, a real named psychological effect
with a concrete example, a real surprising detail about how money/currency/banking actually
works. Every video should teach the viewer something concrete they didn't know, with real
specific details — not a general statement they've already heard a version of.

Content pillars to draw from (pick a genuinely fresh one each time) — EVERY topic must be
directly, centrally about money, currency, banking, markets, spending, or a financial
mechanism. A story about a king's agricultural policy, a war, a general historical event, or
anything where money is only a tangential side-detail does NOT qualify, even if you could
loosely connect it to "economics" — the money/finance angle must be the actual center of the
story, not a footnote to a different kind of story:
1. Real historical events specifically ABOUT money/currency/finance (a real currency collapse,
   a real historic financial scam or fraud, the real origin of a specific financial instrument
   like paper money or insurance, a real historical fortune won or lost through a financial
   event specifically)
2. Named psychological/behavioral-economics effects related to money, explained through a
   concrete, specific example (not just "people don't like losing money" — the actual named
   effect, a real study, a real vivid illustration of it)
3. Genuinely surprising true mechanics of how money/finance actually works — the specific real
   detail most people don't know (not a generic "here's how interest works" explainer)
4. A real, specific historical figure or event where FINANCIAL dealings/fraud/wealth are the
   actual subject of the story, not a side detail

Before finalizing your topic, check: "Is this story fundamentally ABOUT money/currency/finance,
or does it just happen to have money mentioned somewhere in it?" If it's the second, pick a
different topic.

The ONLY hard rule beyond staying on-topic: never give personalized investment advice, never
recommend a specific current stock/crypto/asset to buy, never fabricate a statistic you're not
confident is real. Within that, be as specific and vivid as possible — real dates, real
numbers, real names, real historical detail. Specificity is what makes this interesting; vague
generalities are boring and you must avoid them.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "topic_slug": string,
  "title": string,           // e.g. "The $27 Deal That Bought Manhattan | Money Facts"
  "theme": string,
  "hook": string,              // opening line, must create curiosity in <12 words
  "affiliate_search_query": string, // a genuine, specific product/book category directly
                                      // related to THIS video's actual topic — e.g. for a
                                      // video about a historical event, a book about that
                                      // event/era; for a video about a psychological money
                                      // effect, a behavioral-economics book; for a video about
                                      // how a financial mechanism works, a relevant personal-
                                      // finance book on that exact mechanism. Must be genuinely
                                      // topical to this specific video, not a generic "finance
                                      // book" reused every time.
  "scenes": [
    {
      "id": string,
      "speaker": "narrator",
      "narration": string,     // the spoken line — warm, conversational, not clinical
      "duration_seconds": number,
      "stockQuery": string     // 2-4 word search term for a real, relevant stock photo
    }
  ]
}

Rules:
- Pick a genuinely fresh topic NOT in the already-covered list you're given.
- **Be specific, not general.** Use real names, real dates, real numbers where you're
  confident they're accurate. "A king once devalued his country's currency overnight" is
  boring — "In [year], [specific event] happened" is interesting. If a draft feels like it
  could apply to any topic in this niche, it's too vague — rewrite it with real specifics.
- 6-9 scenes, 35-55 seconds total (duration_seconds 5-7 each). Hook-first: scene 1 opens
  with the specific surprising fact or story — no throat-clearing intros, no generic setup.
- Build genuine narrative momentum: setup the specific situation, reveal the surprising
  detail, land on why it's genuinely remarkable — not a flat explainer.
- **The final scene must be a short spoken outro** pointing viewers to the description —
  e.g. "Curious to learn more? Check the link in the description." Keep it brief, natural,
  not pushy — one sentence, duration_seconds 3-4.
- Conversational, engaging tone — written to be spoken aloud, not read as a textbook.
- Output nothing but the JSON object.`;

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
      generationConfig: { temperature: 0.9, maxOutputTokens: 2000 },
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

  const usedTopics = loadUsedTopics();
  const userMessage = usedTopics.length
    ? `Already-covered topics, pick something genuinely different: ${usedTopics.join(', ')}`
    : 'Pick any genuinely interesting, real money/finance fact.';

  const rawText = await callGemini(userMessage);
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  let storyboard;
  try {
    storyboard = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse storyboard JSON. Raw response:\n', rawText);
    throw err;
  }

  usedTopics.push(storyboard.topic_slug || storyboard.theme || storyboard.title);
  saveUsedTopics(usedTopics);

  const outDir = path.resolve('output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));

  console.log(`✅ Storyboard generated: "${storyboard.title}" (${storyboard.scenes.length} scenes)`);
  console.log(`   Topics covered so far: ${usedTopics.length}`);
  console.log(`   Saved to output/storyboard.json`);
  return storyboard;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateStory().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default generateStory;
