import { Router } from 'express';
import { db } from '../db/db.js';
import { handleSpotifyError } from '../spotify/client.js';
import { linkAndSyncPlaylist, removePlaylistTrackFromSpotify } from '../spotify/playlistSync.js';
import { serializeSong, type SongRow } from '../db/serializeSong.js';

export const playlistsRouter = Router();

interface PlaylistRow {
  id: string;
  name: string;
  owner: string;
  collaborative: number;
  linked: number;
}

function serialize(row: PlaylistRow) {
  const songCount = db
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) AS n FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       WHERE ps.playlist_id = ? AND s.explicit = 0`,
    )
    .get(row.id)!.n;
  const explicitHidden = db
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) AS n FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       WHERE ps.playlist_id = ? AND s.explicit = 1`,
    )
    .get(row.id)!.n;

  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    collaborative: !!row.collaborative,
    linked: !!row.linked,
    songCount,
    explicitHiddenCount: explicitHidden,
  };
}

// GET /api/playlists - linked playlists (and any previously-linked-now-
// unlinked ones, kept for their "Link" row in the parent UI).
playlistsRouter.get('/', (_req, res) => {
  const rows = db.prepare<[], PlaylistRow>('SELECT * FROM playlists ORDER BY created_at ASC').all();
  res.json(rows.map(serialize));
});

// GET /api/playlists/:id/songs - member songs for the track list inside a
// linked-playlist card, with the state chip README 4b describes: Blocked
// (explicit) / Removed by you (per-song override) / In jukebox (otherwise).
playlistsRouter.get('/:id/songs', (req, res) => {
  const playlist = db.prepare('SELECT id FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'playlist not found' });

  const rows = db
    .prepare<[string], SongRow>(
      `SELECT s.* FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       WHERE ps.playlist_id = ?
       ORDER BY s.title ASC`,
    )
    .all(req.params.id);

  const songs = rows.map((row) => ({
    ...serializeSong(row),
    chip: row.explicit ? 'blocked' : row.removed ? 'removed' : 'in-jukebox',
  }));
  res.json(songs);
});

// POST /api/playlists { playlistId } - link a Spotify playlist and pour its
// current tracks into the flat library. Also used to re-link one that was
// previously unlinked.
playlistsRouter.post('/', async (req, res) => {
  const playlistId = req.body?.playlistId;
  if (typeof playlistId !== 'string') return res.status(400).json({ error: 'playlistId is required' });

  try {
    const { addedCount, removedCount } = await linkAndSyncPlaylist(playlistId);
    const row = db.prepare<[string], PlaylistRow>('SELECT * FROM playlists WHERE id = ?').get(playlistId)!;
    res.status(201).json({ ...serialize(row), addedCount, removedCount });
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// POST /api/playlists/:id/sync - re-fetch a linked playlist's tracks and
// pull in anything new. Drives the "Sync - N new" / "Synced" button.
playlistsRouter.post('/:id/sync', async (req, res) => {
  const existing = db.prepare('SELECT id FROM playlists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'playlist not found' });

  try {
    const { addedCount, removedCount } = await linkAndSyncPlaylist(req.params.id);
    const row = db.prepare<[string], PlaylistRow>('SELECT * FROM playlists WHERE id = ?').get(req.params.id)!;
    res.json({ ...serialize(row), addedCount, removedCount });
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// PATCH /api/playlists/:id { linked: false } - unlink. Local-only: pulls
// the playlist's contribution out of the library, except songs also added
// directly, which stay (README "Rules the implementation must preserve").
playlistsRouter.patch('/:id', (req, res) => {
  if (typeof req.body?.linked !== 'boolean') return res.status(400).json({ error: 'linked (boolean) is required' });

  const result = db.prepare('UPDATE playlists SET linked = ? WHERE id = ?').run(req.body.linked ? 1 : 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'playlist not found' });

  const row = db.prepare<[string], PlaylistRow>('SELECT * FROM playlists WHERE id = ?').get(req.params.id)!;
  res.json(serialize(row));
});

playlistsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'playlist not found' });
  res.status(204).end();
});

// DELETE /api/playlists/:id/songs/:songId - removes the track from the
// playlist on Spotify itself, then reflects that locally. If the Spotify
// call fails, the local membership is left untouched rather than drifting
// out of sync with what Spotify actually has.
playlistsRouter.delete('/:id/songs/:songId', async (req, res) => {
  try {
    await removePlaylistTrackFromSpotify(req.params.id, req.params.songId);
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(req.params.id, req.params.songId);
    res.status(204).end();
  } catch (err) {
    handleSpotifyError(err, res);
  }
});
