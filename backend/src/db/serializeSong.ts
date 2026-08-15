import { db } from './db.js';

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  explicit: number;
  art_url: string | null;
  added_directly: number;
  removed: number;
  hidden: number;
}

export function fromPlaylists(songId: string): string[] {
  const rows = db
    .prepare<[string], { name: string }>(
      `SELECT p.name FROM playlists p
       JOIN playlist_songs ps ON ps.playlist_id = p.id
       WHERE ps.song_id = ? AND p.linked = 1`,
    )
    .all(songId);
  return rows.map((r) => r.name);
}

export function serializeSong(row: SongRow) {
  const sources = fromPlaylists(row.id);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    durationSecs: row.duration_secs,
    explicit: !!row.explicit,
    artUrl: row.art_url,
    hidden: !!row.hidden,
    source: sources.length ? sources.join(', ') : 'Added directly',
    state: row.explicit ? 'blocked' : row.hidden ? 'hidden' : 'allowed',
  };
}
