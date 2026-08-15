import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 3001),
  // Where the browser lands after the Spotify OAuth redirect completes. In
  // production the backend serves the built frontend itself (see
  // staticDir below), so this should just be the backend's own address.
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  // The built frontend (frontend/dist), served as static files. Resolved
  // relative to this file's own location so it works the same whether
  // running compiled (backend/dist/config.js) or, in dev, unbuilt (nothing
  // is here yet, express.static just 404s harmlessly - the frontend runs
  // via its own Vite dev server instead).
  staticDir: process.env.STATIC_DIR ?? path.join(__dirname, '../../frontend/dist'),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3001/api/spotify/callback',
  },
};

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-email',
  'user-read-private',
].join(' ');
