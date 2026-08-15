import { db } from '../db/db.js';
import { spotifyFetch, spotifyJson, spotifyPaginate } from './client.js';
import { mapSpotifyTrack, type SpotifyTrack } from './mappers.js';

interface SpotifyPlaylistDetail {
  id: string;
  name: string;
  owner: { display_name: string | null; id: string };
  collaborative: boolean;
  snapshot_id: string;
}

// The /items endpoint nests content under `item`, not `track` as the old
// deprecated /tracks endpoint did - `type`/`track`/`episode` disambiguate
// since a playlist item can now be an episode instead of a track. Verified
// against a real playlist; don't assume this matches the old /tracks shape.
interface SpotifyPlaylistItem {
  is_local: boolean;
  item: (SpotifyTrack & { type: string }) | null;
}

// NOTE: this must stay on the /items family, never /tracks - Spotify
// deprecated GET/DELETE .../tracks in favor of .../items (playlists can
// hold episodes too). See project memory for the incident that prompted
// this note.
async function fetchPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const items = await spotifyPaginate<SpotifyPlaylistItem>(`/playlists/${playlistId}/items?limit=100`);
  return items
    .filter(
      (entry): entry is SpotifyPlaylistItem & { item: SpotifyTrack & { type: string } } =>
        !!entry.item?.id && entry.item.type === 'track' && !entry.is_local,
    )
    .map((entry) => entry.item);
}

// Upserts the playlist row and reconciles playlist_songs membership to
// exactly match Spotify's current track list - both directions. Adding
// only (no removal side) would miss the README's explicit "Grandma removes
// a song from the collaborative playlist" case: a track pulled out of the
// playlist directly in Spotify must also disappear from our membership on
// the next sync, not just accumulate forever. added_directly/removed on
// the song row itself are left untouched either way (a song also added
// directly, or explicitly removed locally, keeps that status regardless of
// playlist membership changes).
export async function linkAndSyncPlaylist(playlistId: string): Promise<{ addedCount: number; removedCount: number }> {
  const detail = await spotifyJson<SpotifyPlaylistDetail>(`/playlists/${playlistId}`);
  const tracks = await fetchPlaylistTracks(playlistId);
  const currentTrackIds = new Set(tracks.map((t) => t.id));

  const owner = detail.owner.display_name ?? detail.owner.id;
  let addedCount = 0;
  let removedCount = 0;

  const apply = db.transaction(() => {
    db.prepare(
      `INSERT INTO playlists (id, name, owner, collaborative, linked, snapshot_id, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, owner = excluded.owner, collaborative = excluded.collaborative,
         linked = 1, snapshot_id = excluded.snapshot_id`,
    ).run(detail.id, detail.name, owner, detail.collaborative ? 1 : 0, detail.snapshot_id, Date.now());

    for (const track of tracks) {
      const mapped = mapSpotifyTrack(track);
      db.prepare(
        `INSERT INTO songs (id, title, artist, duration_secs, explicit, art_url, added_directly, removed, hidden, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title, artist = excluded.artist, duration_secs = excluded.duration_secs,
           explicit = excluded.explicit, art_url = excluded.art_url`,
      ).run(mapped.id, mapped.title, mapped.artist, mapped.durationSecs, mapped.explicit ? 1 : 0, mapped.artUrl, Date.now());

      const already = db
        .prepare('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
        .get(playlistId, mapped.id);
      if (!already) addedCount += 1;
      db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)').run(
        playlistId,
        mapped.id,
      );
    }

    const existingMembers = db
      .prepare<[string], { song_id: string }>('SELECT song_id FROM playlist_songs WHERE playlist_id = ?')
      .all(playlistId);
    const stale = existingMembers.filter((m) => !currentTrackIds.has(m.song_id));
    for (const { song_id } of stale) {
      db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(playlistId, song_id);
    }
    removedCount = stale.length;
  });
  apply();

  return { addedCount, removedCount };
}

// Removes a track from the playlist on Spotify itself (README 4b: the ✕
// button "writes to Spotify"). Same /items family as the read side - the
// old .../tracks DELETE endpoint is deprecated. The body key renamed too:
// it's `items: [{ uri }]` now, not the old `tracks: [{ uri }]` - verified
// against the real API ("No uris provided" / "Invalid base62 id" for the
// other shapes that looked plausible before landing on this one).
export async function removePlaylistTrackFromSpotify(playlistId: string, trackId: string): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/items`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ uri: `spotify:track:${trackId}` }] }),
  });
}
