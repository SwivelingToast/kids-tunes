import { Router } from 'express';
import { db } from '../db/db.js';
import { serializeSong, type SongRow } from '../db/serializeSong.js';

export const queueRouter = Router();

interface QueueRow {
  id: number;
  song_id: string;
  position: number;
}

function orderedQueue(): QueueRow[] {
  return db.prepare<[], QueueRow>('SELECT * FROM queue ORDER BY position ASC, id ASC').all();
}

function serialize(row: QueueRow) {
  const song = db.prepare<[string], SongRow>('SELECT * FROM songs WHERE id = ?').get(row.song_id);
  return { id: row.id, song: song ? serializeSong(song) : null };
}

queueRouter.get('/', (_req, res) => {
  res.json(orderedQueue().map(serialize));
});

queueRouter.post('/', (req, res) => {
  const songId = req.body?.songId;
  if (typeof songId !== 'string') return res.status(400).json({ error: 'songId is required' });

  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
  if (!song) return res.status(404).json({ error: 'song not found' });

  const maxPos = db.prepare<[], { m: number | null }>('SELECT MAX(position) AS m FROM queue').get()!.m ?? 0;
  const result = db
    .prepare('INSERT INTO queue (song_id, position, created_at) VALUES (?, ?, ?)')
    .run(songId, maxPos + 1, Date.now());
  res.status(201).json(serialize({ id: Number(result.lastInsertRowid), song_id: songId, position: maxPos + 1 }));
});

queueRouter.delete('/', (_req, res) => {
  db.prepare('DELETE FROM queue').run();
  res.status(204).end();
});

queueRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM queue WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'queue entry not found' });
  res.status(204).end();
});

queueRouter.post('/:id/move', (req, res) => {
  const direction = req.body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'direction must be "up" or "down"' });
  }

  const rows = orderedQueue();
  const index = rows.findIndex((r) => r.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'queue entry not found' });

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) return res.json(rows.map(serialize));

  const a = rows[index];
  const b = rows[swapWith];
  const move = db.transaction(() => {
    db.prepare('UPDATE queue SET position = ? WHERE id = ?').run(b.position, a.id);
    db.prepare('UPDATE queue SET position = ? WHERE id = ?').run(a.position, b.id);
  });
  move();

  res.json(orderedQueue().map(serialize));
});

queueRouter.post('/shuffle', (_req, res) => {
  const rows = orderedQueue();
  const positions = rows.map((r) => r.position);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const shuffle = db.transaction(() => {
    rows.forEach((row, i) => {
      db.prepare('UPDATE queue SET position = ? WHERE id = ?').run(positions[i], row.id);
    });
  });
  shuffle();
  res.json(orderedQueue().map(serialize));
});

// POST /api/queue/advance - pop the next entry off the front of the queue.
// Used by playback to decide what plays next (see README "Transitions":
// track end -> pop the queue if non-empty, else advance through playable()).
queueRouter.post('/advance', (_req, res) => {
  const rows = orderedQueue();
  const next = rows[0];
  if (!next) return res.json({ next: null });

  db.prepare('DELETE FROM queue WHERE id = ?').run(next.id);
  res.json({ next: serialize(next) });
});
