-- Refresh token is the long-lived credential; access token is cached
-- alongside its expiry so getValidAccessToken() can skip refreshing on
-- every call. Tokens live server-side only - never sent to the frontend.
ALTER TABLE settings ADD COLUMN spotify_access_token TEXT;
ALTER TABLE settings ADD COLUMN spotify_refresh_token TEXT;
ALTER TABLE settings ADD COLUMN spotify_token_expires_at INTEGER;
ALTER TABLE settings ADD COLUMN spotify_display_name TEXT;
ALTER TABLE settings ADD COLUMN spotify_email TEXT;
