import { db } from './db.js';

// inLibrary: not removed, and either added directly or a member of a
// currently-linked playlist. A per-song removal always beats playlist
// membership (README "Rules the implementation must preserve").
export const LIBRARY_SQL = `
  SELECT s.* FROM songs s
  WHERE s.removed = 0
    AND (
      s.added_directly = 1
      OR EXISTS (
        SELECT 1 FROM playlist_songs ps
        JOIN playlists p ON p.id = ps.playlist_id
        WHERE ps.song_id = s.id AND p.linked = 1
      )
    )
`;

export function isInLibrary(songId: string): boolean {
  const row = db.prepare(`SELECT 1 FROM (${LIBRARY_SQL}) WHERE id = ?`).get(songId);
  return !!row;
}
