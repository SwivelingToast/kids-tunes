# Kids Jukebox — working agreement

Read `README.md` in this folder first. It is the design spec: exact colors, sizes,
copy, states, and behavior. Treat it as the source of truth for anything visual.

## What this project is

An 800 × 1280 portrait kiosk app for an 8-inch Android tablet. A kid-facing jukebox
screen plus a hidden, PIN-gated parent area. Music comes from the parent's Spotify
Premium account.

## Non-negotiable product rules

1. **Kids never see playlists.** Song chooser tabs are Recent, Songs, Artists,
   Favorites — nothing else. Playlists exist only as a parent-side bulk import source.
2. **One flat song library.** A track added by search and a track pulled from a linked
   playlist are indistinguishable to kids.
3. **Kids cannot add songs, search, or authenticate.** There must be no code path.
4. **Explicit tracks never reach kids** — filter on the `explicit` flag yourself.
5. **Skip requires a 1000ms hold** with a filling ring; a tap does nothing.
6. **The progress bar is display-only.** No seeking on the kid screen.
7. **Parent access** = press and hold the invisible top-right corner for 1500ms, then
   a 4-digit PIN. No visible affordance.

## Visual rules

- Use `_ds/nocturne-…/styles.css` tokens (`var(--color-*)`, `var(--space-*)`,
  `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex the tokens carry.
- Primary buttons are **outlined**, not filled. Never flood an area with the accent.
- Headings stay at weight 500 — hierarchy is size and space.
- Freestanding horizontal rules fade to transparent over 48px at each end.
- Kid screen uses the oversized literal px values from the README, not the compact
  token spacing. Parent screens use the token scale.
- Album art is a gradient placeholder until real Spotify artwork loads; keep the
  placeholder as the fallback state.

## Security rules

- Spotify client secret and refresh tokens live on the server only.
- PIN is hashed (bcrypt/argon2) server-side with attempt throttling. The prototype's
  plaintext `1234` and its on-screen hint must not survive into production.

## Prototype caveats (do not copy these)

- `support.js` is a bespoke prototype runtime — do not port it.
- Song/artist data is invented; the local "search" array stands in for the Spotify
  catalog search endpoint.
- Progress is a 1s timer, not real playback position.
- Nothing persists across reload.
