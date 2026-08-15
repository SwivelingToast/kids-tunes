import { db } from '../db/db.js';
import { config } from '../config.js';

interface SettingsRow {
  spotify_connected: number;
  spotify_access_token: string | null;
  spotify_refresh_token: string | null;
  spotify_token_expires_at: number | null;
  spotify_display_name: string | null;
  spotify_email: string | null;
  spotify_device: string | null;
  spotify_product: string | null;
}

export class SpotifyNotConnectedError extends Error {
  constructor() {
    super('Spotify is not connected.');
    this.name = 'SpotifyNotConnectedError';
  }
}

function getSettingsRow(): SettingsRow {
  const row = db.prepare<[], SettingsRow>('SELECT * FROM settings WHERE id = 1').get();
  if (!row) throw new Error('settings row missing - initDb() must run before serving requests');
  return row;
}

export function getSpotifyStatus() {
  const row = getSettingsRow();
  return {
    connected: !!row.spotify_connected,
    displayName: row.spotify_display_name,
    email: row.spotify_email,
    device: row.spotify_device,
    product: row.spotify_product,
  };
}

export function saveTokens(opts: { accessToken: string; refreshToken?: string; expiresInSeconds: number }) {
  const expiresAt = Date.now() + opts.expiresInSeconds * 1000;
  if (opts.refreshToken) {
    db.prepare(
      `UPDATE settings SET spotify_access_token = ?, spotify_refresh_token = ?, spotify_token_expires_at = ?,
       spotify_connected = 1, updated_at = ? WHERE id = 1`,
    ).run(opts.accessToken, opts.refreshToken, expiresAt, Date.now());
  } else {
    // Spotify's refresh grant doesn't always return a new refresh_token -
    // only overwrite it when one comes back.
    db.prepare('UPDATE settings SET spotify_access_token = ?, spotify_token_expires_at = ? WHERE id = 1').run(
      opts.accessToken,
      expiresAt,
    );
  }
}

export function saveProfile(opts: { displayName: string | null; email: string | null; product: string | null }) {
  db.prepare('UPDATE settings SET spotify_display_name = ?, spotify_email = ?, spotify_product = ? WHERE id = 1').run(
    opts.displayName,
    opts.email,
    opts.product,
  );
}

export function disconnectSpotify() {
  db.prepare(
    `UPDATE settings SET spotify_connected = 0, spotify_access_token = NULL, spotify_refresh_token = NULL,
     spotify_token_expires_at = NULL, spotify_display_name = NULL, spotify_email = NULL, spotify_device = NULL,
     spotify_product = NULL, updated_at = ? WHERE id = 1`,
  ).run(Date.now());
}

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64');
}

// Returns a live access token, refreshing it first if it's expired (or
// close to it). Callers (search/playlist/playback routes) don't need to
// know or care about the refresh cycle.
export async function getValidAccessToken(): Promise<string> {
  const row = getSettingsRow();
  if (!row.spotify_refresh_token) throw new SpotifyNotConnectedError();

  const freshEnough =
    row.spotify_access_token && row.spotify_token_expires_at && row.spotify_token_expires_at > Date.now() + 30_000;
  if (freshEnough) return row.spotify_access_token!;

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuthHeader() },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.spotify_refresh_token }),
  });
  if (!resp.ok) {
    throw new Error(`Spotify token refresh failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in });
  return data.access_token;
}

// For the frontend's Web Playback SDK, which needs a real access token in
// the browser by design (Spotify's own SDK requires it) - the refresh
// token and client secret never leave the server either way. Returns
// expiresAt too so the frontend knows when to ask again rather than
// guessing a TTL.
export async function getAccessTokenInfo(): Promise<{ accessToken: string; expiresAt: number }> {
  const accessToken = await getValidAccessToken();
  const row = getSettingsRow();
  return { accessToken, expiresAt: row.spotify_token_expires_at! };
}

export function saveDevice(deviceId: string) {
  db.prepare('UPDATE settings SET spotify_device = ? WHERE id = 1').run(deviceId);
}
