-- snapshot_id is Spotify's change token for a playlist - a differing value
-- from what we last synced is the "N new" pending-sync signal (README:
-- "snapshot_id is your change token").
ALTER TABLE playlists ADD COLUMN snapshot_id TEXT;
