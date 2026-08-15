import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/db.js';
import { serializeSong, type SongRow } from '../db/serializeSong.js';

export const kidsRouter = Router();

interface KidRow {
  id: string;
  name: string;
}

kidsRouter.get('/', (_req, res) => {
  const kids = db.prepare<[], KidRow>('SELECT id, name FROM kids ORDER BY created_at ASC').all();
  res.json(kids);
});

kidsRouter.post('/', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = randomUUID();
  db.prepare('INSERT INTO kids (id, name, created_at) VALUES (?, ?, ?)').run(id, name, Date.now());
  res.status(201).json({ id, name });
});

kidsRouter.patch('/:id', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare('UPDATE kids SET name = ? WHERE id = ?').run(name, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'kid not found' });
  res.json({ id: req.params.id, name });
});

kidsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM kids WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'kid not found' });
  res.status(204).end();
});

kidsRouter.get('/:id/favorites', (req, res) => {
  const kid = db.prepare('SELECT id FROM kids WHERE id = ?').get(req.params.id);
  if (!kid) return res.status(404).json({ error: 'kid not found' });

  const songs = db
    .prepare<[string], SongRow>(
      `SELECT s.* FROM favorites f
       JOIN songs s ON s.id = f.song_id
       WHERE f.kid_id = ?
       ORDER BY f.created_at DESC`,
    )
    .all(req.params.id);
  res.json(songs.map(serializeSong));
});

kidsRouter.post('/:id/favorites', (req, res) => {
  const songId = req.body?.songId;
  if (typeof songId !== 'string') return res.status(400).json({ error: 'songId is required' });

  const kid = db.prepare('SELECT id FROM kids WHERE id = ?').get(req.params.id);
  if (!kid) return res.status(404).json({ error: 'kid not found' });
  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
  if (!song) return res.status(404).json({ error: 'song not found' });

  db.prepare('INSERT OR IGNORE INTO favorites (kid_id, song_id, created_at) VALUES (?, ?, ?)').run(
    req.params.id,
    songId,
    Date.now(),
  );
  res.status(201).json({ ok: true });
});

kidsRouter.delete('/:id/favorites/:songId', (req, res) => {
  db.prepare('DELETE FROM favorites WHERE kid_id = ? AND song_id = ?').run(req.params.id, req.params.songId);
  res.status(204).end();
});
