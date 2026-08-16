import { Router } from 'express';
import { db } from '../db/db.js';
import { handleSpotifyError, spotifyFetch, spotifyJson, spotifyPaginate } from '../spotify/client.js';
import { mapSpotifyTrack, type SpotifyTrack } from '../spotify/mappers.js';
import { isInLibrary } from '../db/library.js';
import { getSpotifyStatus } from '../spotify/tokens.js';

export const spotifyRouter = Router();

interface SpotifySearchResponse {
  tracks: { items: SpotifyTrack[] };
}

// GET /api/spotify/search?q=... - the "Search all of Spotify" box (README
// 4a). Already-in-library tracks are filtered out; explicit ones are kept
// in (the parent UI renders them as a disabled "Blocked - explicit" row).
spotifyRouter.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json([]);

  try {
    // limit is capped at 10 here - this app is in Spotify's Development
    // Mode (not approved for Extended Quota Mode), which rejects
    // type=track searches with limit > 10 ("Invalid limit"), well under
    // the documented max of 50 for approved apps.
    const data = await spotifyJson<SpotifySearchResponse>(
      `/search?type=track&limit=10&market=from_token&q=${encodeURIComponent(q)}`,
    );
    const results = data.tracks.items.map(mapSpotifyTrack).filter((t) => !isInLibrary(t.id));
    res.json(results);
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// Another /tracks -> /items rename, this time in the response field name
// (not just the URL): GET /me/playlists' per-playlist summary object no
// longer has `tracks: { total }` - it's `items: { total }` now. Verified
// against a live response; don't assume the old field name.
interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  owner: { display_name: string | null; id: string };
  collaborative: boolean;
  items: { total: number };
}

// GET /api/spotify/playlists - "Your Spotify playlists" pick list (README
// 4b), cross-referenced against which ones are already linked locally.
spotifyRouter.get('/playlists', async (_req, res) => {
  try {
    const items = await spotifyPaginate<SpotifyPlaylistSummary>('/me/playlists?limit=50');
    const linkedIds = new Set(
      db
        .prepare<[], { id: string }>('SELECT id FROM playlists WHERE linked = 1')
        .all()
        .map((r) => r.id),
    );
    res.json(
      items.map((p) => ({
        id: p.id,
        name: p.name,
        owner: p.owner.display_name ?? p.owner.id,
        collaborative: p.collaborative,
        trackCount: p.items.total,
        linked: linkedIds.has(p.id),
      })),
    );
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

interface SpotifyConnectDevice {
  id: string | null;
  is_active: boolean;
  name: string;
  type: string;
}

// GET /api/spotify/devices - every Spotify Connect device currently
// available on the account (this kiosk's own Web Playback SDK device, plus
// anything else already on Spotify - smart speakers, phones, etc.) so a
// parent can pick where music plays.
spotifyRouter.get('/devices', async (_req, res) => {
  try {
    const data = await spotifyJson<{ devices: SpotifyConnectDevice[] }>('/me/player/devices');
    const kioskDeviceId = getSpotifyStatus().device;
    res.json(
      data.devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        active: d.is_active,
        isKiosk: d.id !== null && d.id === kioskDeviceId,
      })),
    );
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number | null;
  item: { id: string } | null;
  device: { id: string | null; name: string } | null;
}

// GET /api/spotify/now-playing - account-wide playback truth (which device
// is actually active, what's playing, position). Unlike the kiosk's own Web
// Playback SDK state, this stays accurate once playback has been cast to a
// different Connect device - the SDK only ever reports state for itself,
// so the kiosk goes stale/silent for anything happening on another device.
// Polled from the kiosk (see App.tsx) to correct its "now playing" display
// and its is-anything-already-playing checks while casting elsewhere.
spotifyRouter.get('/now-playing', async (_req, res) => {
  try {
    const resp = await spotifyFetch('/me/player');
    if (resp.status === 204) {
      return res.json({ active: false, isKiosk: false, isPlaying: false, progressMs: 0, trackId: null, deviceId: null, deviceName: null });
    }
    const data = (await resp.json()) as SpotifyPlaybackState;
    const kioskDeviceId = getSpotifyStatus().device;
    res.json({
      active: !!data.device,
      isKiosk: data.device?.id !== null && data.device?.id === kioskDeviceId,
      isPlaying: data.is_playing,
      progressMs: data.progress_ms ?? 0,
      trackId: data.item?.id ?? null,
      deviceId: data.device?.id ?? null,
      deviceName: data.device?.name ?? null,
    });
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// POST /api/spotify/devices/transfer { deviceId } - moves playback to the
// given Connect device. Deliberately omits Spotify's `play` flag (defaults
// to false/keep-current-state) rather than forcing play:true, so casting
// preserves whatever play/pause state it was already in instead of always
// starting playback on transfer.
spotifyRouter.post('/devices/transfer', async (req, res) => {
  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== 'string') return res.status(400).json({ error: 'deviceId is required' });

  try {
    await spotifyFetch('/me/player', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId] }),
    });
    res.json({ ok: true });
  } catch (err) {
    handleSpotifyError(err, res);
  }
});
