import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config.js';
import { initDb } from './db/db.js';
import { kidsRouter } from './routes/kids.js';
import { songsRouter } from './routes/songs.js';
import { playlistsRouter } from './routes/playlists.js';
import { queueRouter } from './routes/queue.js';
import { pinRouter } from './routes/pin.js';
import { spotifyAuthRouter } from './routes/spotifyAuth.js';
import { spotifyRouter } from './routes/spotify.js';

initDb();

const app = express();
// LAN-only app (see project architecture decisions) - no internet exposure,
// so a permissive CORS policy for local dev is fine here.
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/kids', kidsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/pin', pinRouter);
app.use('/api/spotify', spotifyAuthRouter);
app.use('/api/spotify', spotifyRouter);

// The built frontend (production only - the dev workflow runs the
// frontend through its own Vite dev server on a different port instead).
// Mounted after the /api routes so nothing here can shadow them.
app.use(express.static(config.staticDir));

// SPA fallback: client-side routes like /admin (the remote parent-admin
// entry point - see kidStore's isAdmin) have no matching static file, so a
// direct navigation/reload needs index.html served for them too, same as
// any other unknown non-API path.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(config.staticDir, 'index.html'));
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Kids Jukebox backend listening on http://localhost:${config.port}`);
  if (!config.spotify.clientId) {
    // eslint-disable-next-line no-console
    console.log('SPOTIFY_CLIENT_ID not set - copy backend/.env.example to backend/.env and fill in your app credentials.');
  }
});
