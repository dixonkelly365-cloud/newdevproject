# Toddler Original: Genuinely Original Kids' Content, $0, Automated

A standalone project — completely separate from any other repo — for a NEW YouTube channel:
original toddler-education videos (counting, colors, shapes, animals, manners, routines),
with a fresh original character each episode. This is genuinely original content — not
reposted, edited, or based on any existing children's show. Every script is freshly
generated, and the visual style (simple bold shapes) is a real, deliberate design choice
appropriate to the genre.

## Why original, not reposts/edits

Reposting or re-editing existing children's content (even changed/sped up/remixed) is still
built on someone else's copyrighted material and gets caught by YouTube's Content ID system
regularly — channels doing this get struck and terminated. This project instead generates
entirely new scripts, new original character names, and new visuals every time.

## What it does

1. Gemini writes a short, original episode — one educational topic (counting, colors,
   shapes, animals, manners, or a routine), with a fresh original character
2. Simple, bold, bright visuals rendered directly in code — no API needed, no cost, and
   genuinely the right aesthetic for this genre
3. Free neural voice narration
4. Assembled with music and captions
5. Posted to YouTube automatically, daily

## Honest expectations

- **Visual style is simple by design** — bold flat shapes and colors, not detailed
  illustration or animation. This matches a real, legitimate style used in actual children's
  content, not just a cost-saving compromise.
- **Content stays genuinely simple and safe** — short sentences, always positive, no
  conflict or scary content, by explicit instruction to the generator.
- **Unlimited unique episodes** — Gemini actively avoids repeating any topic already covered
  (tracked permanently).
- **Genuinely $0** — Gemini (free), visuals (code-drawn, no API), narration (free).

## Setup

### 1. Install
```bash
npm install
```
Also install ffmpeg and librsvg2-bin (`brew install ffmpeg librsvg` on Mac,
`sudo apt install ffmpeg librsvg2-bin` on Linux).

### 2. Free Gemini API key
https://aistudio.google.com/apikey → sign in with any Google account → create a key.

### 3. A NEW YouTube channel
1. https://console.cloud.google.com/ → new project → enable YouTube Data API v3
2. Configure OAuth consent screen: External audience, add yourself as a test user
3. Create an OAuth Client ID (Web application — add
   `http://localhost:8085/oauth2callback` as an authorized redirect URI)
4. Add Client ID/Secret to `.env`
5. Make sure the account has an actual YouTube channel created
6. Run `npm run auth` once — prints a refresh token to paste into `.env`

## Running it

**Full run:**
```bash
npm run pipeline
```

**Step by step:**
```bash
npm run generate
npm run fetch-visuals
npm run narrate
npm run assemble
npm run upload
```

## Fully automated on GitHub

`.github/workflows/auto-post.yml` runs daily on GitHub's own servers.

1. Push this project to its own new GitHub repo.
2. Repo → Settings → Secrets and variables → Actions → add:
   `GEMINI_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`,
   `YOUTUBE_REFRESH_TOKEN`
3. Videos post as private by default — review quality before switching to public.

## Project structure
```
toddler-original/
├── .env.example / env.example.txt
├── package.json
├── assets/bgm_loop.wav
├── src/
│   ├── generateStory.js
│   ├── fetchVisuals.js
│   ├── tts.js
│   ├── assembleVideo.js
│   ├── authYoutube.js / uploadYoutube.js
│   └── pipeline.js
├── .github/workflows/auto-post.yml
└── output/
```
