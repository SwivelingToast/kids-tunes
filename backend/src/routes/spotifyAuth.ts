import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/db.js';
import { config, SPOTIFY_SCOPES } from '../config.js';
import {
  disconnectSpotify,
  getAccessTokenInfo,
  getSpotifyStatus,
  getValidAccessToken,
  saveDevice,
  saveProfile,
  saveTokens,
} from '../spotify/tokens.js';
import { handleSpotifyError } from '../spotify/client.js';
import { linkAndSyncPlaylist } from '../spotify/playlistSync.js';

export const spotifyAuthRouter = Router();

// Single-process, single-admin flow (see project decisions: LAN-only, one
// parent doing setup at a time) - an in-memory pending state is enough to
// guard the callback against CSRF without a session store.
let pendingState: string | null = null;

spotifyAuthRouter.get('/login', (_req, res) => {
  if (!config.spotify.clientId || !config.spotify.clientSecret) {
    return res.status(500).send('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set - see backend/.env.example.');
  }
  pendingState = randomUUID();
  const params = new URLSearchParams({
    client_id: config.spotify.clientId,
    response_type: 'code',
    redirect_uri: config.spotify.redirectUri,
    scope: SPOTIFY_SCOPES,
    state: pendingState,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

spotifyAuthRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${config.frontendUrl}/?spotifyError=${encodeURIComponent(String(error))}`);
  }
  if (!pendingState || state !== pendingState) {
    return res.redirect(`${config.frontendUrl}/?spotifyError=state_mismatch`);
  }
  pendingState = null;
  if (typeof code !== 'string') {
    return res.redirect(`${config.frontendUrl}/?spotifyError=missing_code`);
  }

  try {
    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.spotify.redirectUri,
      }),
    });
    if (!tokenResp.ok) {
      throw new Error(`token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`);
    }
    const tokenData = (await tokenResp.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    saveTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresInSeconds: tokenData.expires_in,
    });

    const profileResp = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileResp.ok) {
      const profile = (await profileResp.json()) as { display_name: string | null; email: string | null; product: string | null };
      saveProfile({ displayName: profile.display_name, email: profile.email, product: profile.product });
    }

    res.redirect(`${config.frontendUrl}/?spotifyConnected=1`);
  } catch (err) {
    console.error('Spotify OAuth callback failed:', err);
    res.redirect(`${config.frontendUrl}/?spotifyError=callback_failed`);
  }
});

spotifyAuthRouter.get('/status', (_req, res) => {
  res.json(getSpotifyStatus());
});

spotifyAuthRouter.post('/disconnect', (_req, res) => {
  disconnectSpotify();
  res.json({ ok: true });
});

// GET /api/spotify/playback-token - hands the frontend a live access token
// for the Web Playback SDK (which needs one in the browser by design) and
// for direct-to-Spotify playback calls (play/pause/transfer), matching the
// pattern of not routing every single play/pause through our own backend.
// The refresh token and client secret still never leave the server.
spotifyAuthRouter.get('/playback-token', async (_req, res) => {
  try {
    const info = await getAccessTokenInfo();
    res.json(info);
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// POST /api/spotify/device { deviceId } - records which Connect device the
// Web Playback SDK registered as, so the Spotify Account tab can show it.
spotifyAuthRouter.post('/device', (req, res) => {
  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== 'string') return res.status(400).json({ error: 'deviceId is required' });
  saveDevice(deviceId);
  res.json({ ok: true });
});

// POST /api/spotify/resync - "Re-sync library" button (README 4d):
// refreshes the connected profile and re-syncs every currently-linked
// playlist in one action.
spotifyAuthRouter.post('/resync', async (_req, res) => {
  try {
    const token = await getValidAccessToken();
    const profileResp = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    if (profileResp.ok) {
      const profile = (await profileResp.json()) as { display_name: string | null; email: string | null; product: string | null };
      saveProfile({ displayName: profile.display_name, email: profile.email, product: profile.product });
    }

    const linkedPlaylists = db.prepare<[], { id: string }>('SELECT id FROM playlists WHERE linked = 1').all();
    let addedCount = 0;
    let removedCount = 0;
    for (const p of linkedPlaylists) {
      const result = await linkAndSyncPlaylist(p.id);
      addedCount += result.addedCount;
      removedCount += result.removedCount;
    }

    res.json({ ok: true, addedCount, removedCount, playlistsSynced: linkedPlaylists.length });
  } catch (err) {
    handleSpotifyError(err, res);
  }
});
