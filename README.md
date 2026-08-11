# Money Facts: Short-Form + Long-Form, 2 Posts a Day, Free, Automated

A standalone project for ONE YouTube channel posting **both formats daily**: a short-form
video (vertical, 35-55 seconds) and a long-form compilation video (horizontal, ~9 minutes,
35 stitched facts) — two separate, independently-scheduled automated workflows, same channel,
same credentials.

## Why both formats

Real 2026 data: Shorts CPM runs ~95% lower than long-form CPM, regardless of niche — so
long-form carries the real revenue upside. But Shorts still have real value: faster to
produce, better for reach/discovery, and lower risk per video. Running both captures Shorts'
discovery advantage and long-form's revenue advantage on the same channel.

## How the two formats stay in sync, not duplicating each other

Both `generateStory.js` (short-form) and `generateStoryLongform.js` (long-form) write to the
**same** `output-state/history-topics.json` file — so a fact covered in this morning's short
video won't reappear in this evening's long-form compilation, and vice versa. One shared,
ever-growing memory across both formats.

## The two independent daily workflows
- **`.github/workflows/auto-post-shortform.yml`** — runs at 14:00 UTC, one short video
- **`.github/workflows/auto-post-longform.yml`** — runs at 20:00 UTC, one ~9-minute compilation

Different times, so they don't compete for the same runner slot or collide on git commits.


A standalone project for a repurposed YouTube channel (previously the toddler-content
channel): real, factual money and finance videos — history of money, psychology of spending,
how financial systems work, surprising true finance facts. General financial education, NOT
investment advice or stock picks — a deliberate choice to stay honest and safe for an
automated pipeline while still accessing meaningfully higher CPM than pure entertainment
content. Reuses the same proven, free pipeline architecture as your other channels.

## Why this niche

Real 2026 CPM data: Finance is genuinely one of YouTube's highest-paying niches ($15-35+ CPM
for well-positioned content, vs. $8-15 for general education, $1-5 for entertainment/gaming).
This channel targets the "general financial literacy and money facts" lane specifically —
still meaningfully higher-earning than pure entertainment, while avoiding the liability and
credibility requirements of actual investment-advice content, which isn't something an
automated pipeline should be doing.

## Important: this replaces your toddler-content pipeline in the SAME repo

This is meant to go into the same repo/channel currently running the toddler project — same
YouTube credentials, same account, just a full content swap. Steps:

1. **Rename the YouTube channel** in YouTube Studio (Settings → Channel → Basic info) to
   something matching this new content (e.g. "Money Facts Daily," "The Money Minute").
2. **Push this project's code into that same repo**, replacing the toddler code entirely.
3. **No new secrets needed** — `GEMINI_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`,
   `YOUTUBE_REDIRECT_URI`, `YOUTUBE_REFRESH_TOKEN` should already be set on that repo from the
   toddler project. Just add `PEXELS_API_KEY` if it isn't already there.

## Setup (if starting fresh / verifying)

### 1. Install
```bash
npm install
```
Also install ffmpeg.

### 2. Free Gemini + Pexels keys
Same key types as your other channels — reuse or create fresh ones.

### 3. YouTube — reuse existing credentials
Since this goes into the same repo as the toddler project, the YouTube OAuth setup should
already be done. If starting completely fresh instead, see the other projects' READMEs for
the full one-time OAuth walkthrough.

## Running it

```bash
npm run pipeline
```

Or step by step: `npm run generate`, `npm run fetch-photos`, `npm run narrate`,
`npm run assemble`, `npm run upload`.

## Fully automated on GitHub

`.github/workflows/auto-post.yml` runs daily. Videos post as `private` by default — review
quality before switching to `public`.

## Project structure
```
money-facts/
├── .env.example / env.example.txt
├── package.json
├── assets/bgm_loop.wav
├── src/
│   ├── generateStory.js    # real, factual money/finance scripts (Gemini, free)
│   ├── fetchStockPhotos.js # real Pexels photos, A/B split
│   ├── tts.js                # single-narrator narration (free neural voice)
│   ├── assembleVideo.js      # Ken Burns + word-by-word captions + music -> final_video.mp4
│   ├── authYoutube.js / uploadYoutube.js
│   └── pipeline.js
├── .github/workflows/auto-post.yml
└── output/
```
