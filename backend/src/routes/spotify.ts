import { Router } from 'express';
import { db } from '../db/db.js';
import { handleSpotifyError, spotifyJson, spotifyPaginate } from '../spotify/client.js';
import { mapSpotifyTrack, type SpotifyTrack } from '../spotify/mappers.js';
import { isInLibrary } from '../db/library.js';

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
