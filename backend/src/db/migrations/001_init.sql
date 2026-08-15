CREATE TABLE IF NOT EXISTS kids (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- id is the Spotify track id once search/import (step 5) is wired up.
-- added_directly / removed / hidden implement the README's per-song
-- overrides: inLibrary = !removed && (added_directly || in a linked playlist);
-- playable = inLibrary && !explicit && !hidden.
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration_secs INTEGER NOT NULL,
  explicit INTEGER NOT NULL DEFAULT 0,
  art_url TEXT,
  added_directly INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- id is the Spotify playlist id once linking (step 5) is wired up.
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  collaborative INTEGER NOT NULL DEFAULT 0,
  linked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Membership: a song can belong to many playlists at once.
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  PRIMARY KEY (playlist_id, song_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  kid_id TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (kid_id, song_id)
);

-- Ordered by `position`; no per-kid attribution (see project decisions -
-- queue is shared and unattributed).
CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Single-row settings: PIN hash and (placeholder for step 5) Spotify
-- connection state. PIN is never stored in plaintext.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash TEXT NOT NULL,
  spotify_connected INTEGER NOT NULL DEFAULT 0,
  spotify_device TEXT,
  updated_at INTEGER NOT NULL
);
