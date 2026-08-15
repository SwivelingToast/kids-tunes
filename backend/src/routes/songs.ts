import { Router } from 'express';
import { db } from '../db/db.js';
import { serializeSong, type SongRow } from '../db/serializeSong.js';
import { LIBRARY_SQL } from '../db/library.js';
import { handleSpotifyError, spotifyJson } from '../spotify/client.js';
import { mapSpotifyTrack, type SpotifyTrack } from '../spotify/mappers.js';

export const songsRouter = Router();

// GET /api/songs - the full curated library (parent Songs table).
songsRouter.get('/', (_req, res) => {
  const rows = db.prepare<[], SongRow>(LIBRARY_SQL).all();
  res.json(rows.map(serializeSong));
});

// GET /api/songs/playable - the only list kids ever see: library minus
// explicit minus hidden. Never trust an upstream account-level filter.
songsRouter.get('/playable', (_req, res) => {
  const rows = db.prepare<[], SongRow>(`${LIBRARY_SQL} AND s.explicit = 0 AND s.hidden = 0`).all();
  res.json(rows.map(serializeSong));
});

// POST /api/songs { trackId } - "Search all of Spotify -> Add". Re-fetches
// the track from Spotify by id rather than trusting client-supplied
// title/artist/explicit fields, since `explicit` in particular is a
// kid-safety-critical flag that the backend, not the frontend, must be the
// authority on.
songsRouter.post('/', async (req, res) => {
  const trackId = req.body?.trackId;
  if (typeof trackId !== 'string') return res.status(400).json({ error: 'trackId is required' });

  try {
    const track = await spotifyJson<SpotifyTrack>(`/tracks/${trackId}`);
    const mapped = mapSpotifyTrack(track);

    db.prepare(
      `INSERT INTO songs (id, title, artist, duration_secs, explicit, art_url, added_directly, removed, hidden, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?)
       ON CONFLICT(id) DO UPDATE SET
         added_directly = 1, removed = 0,
         title = excluded.title, artist = excluded.artist,
         duration_secs = excluded.duration_secs, explicit = excluded.explicit, art_url = excluded.art_url`,
    ).run(mapped.id, mapped.title, mapped.artist, mapped.durationSecs, mapped.explicit ? 1 : 0, mapped.artUrl, Date.now());

    const row = db.prepare<[string], SongRow>('SELECT * FROM songs WHERE id = ?').get(mapped.id)!;
    res.status(201).json(serializeSong(row));
  } catch (err) {
    handleSpotifyError(err, res);
  }
});

// PATCH /api/songs/:id - toggle Allowed/Hidden. Explicit tracks are never
// togglable - they stay blocked regardless of this flag.
songsRouter.patch('/:id', (req, res) => {
  const row = db.prepare<[string], SongRow>('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'song not found' });
  if (row.explicit) return res.status(400).json({ error: 'explicit tracks cannot be toggled' });

  const hidden = typeof req.body?.hidden === 'boolean' ? (req.body.hidden ? 1 : 0) : row.hidden;
  db.prepare('UPDATE songs SET hidden = ? WHERE id = ?').run(hidden, req.params.id);
  const updated = db.prepare<[string], SongRow>('SELECT * FROM songs WHERE id = ?').get(req.params.id)!;
  res.json(serializeSong(updated));
});

// DELETE /api/songs/:id - "Remove from jukebox". Marks removed=1 rather
// than deleting the row, so a per-song override beats playlist membership
// even if the song is still listed in a linked playlist upstream.
songsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE songs SET removed = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'song not found' });
  db.prepare(
    `DELETE FROM queue WHERE song_id = ?`,
  ).run(req.params.id);
  res.status(204).end();
});
