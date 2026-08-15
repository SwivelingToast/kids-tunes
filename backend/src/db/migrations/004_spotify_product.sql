-- Subscription tier ("premium"/"free") from Spotify's /v1/me, captured at
-- connect and re-sync time so the parent Spotify Account tab can show it
-- without an extra live call on every page view.
ALTER TABLE settings ADD COLUMN spotify_product TEXT;
