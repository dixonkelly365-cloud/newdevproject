// src/authYoutube.js
// Run this ONCE to authorize your YouTube account. It opens a browser,
// you log in and grant upload permission, and it prints a refresh token
// to paste into your .env as YOUTUBE_REFRESH_TOKEN. After that, uploads
// are fully automatic (no browser needed) until you revoke access.

import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';
import open from 'open';
import url from 'url';

const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8085/oauth2callback';
const PORT = new URL(REDIRECT_URI).port || 8085;

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) return;
  const qs = new url.URL(req.url, REDIRECT_URI).searchParams;
  const code = qs.get('code');
  res.end('Authorization complete! You can close this tab and return to the terminal.');
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n✅ Success! Add this line to your .env file:\n');
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
});

server.listen(PORT, () => {
  console.log(`Opening browser for YouTube authorization...`);
  console.log(`If it doesn't open automatically, visit:\n${authUrl}\n`);
  open(authUrl);
});
