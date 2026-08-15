# Handoff: Kids Jukebox (TouchTunes-style, Spotify-backed)

## Overview

A wall/counter tablet jukebox for kids. A locked-down kid screen lets 3–10 year olds
see what's playing and pick songs from a curated library. A hidden, PIN-gated parent
area manages what's in that library, the queue, the Spotify connection, and the PIN.

Target hardware: **8-inch Android tablet, portrait, 800 × 1280 CSS px.** The design is
built at exactly that size. Treat it as a fixed-viewport kiosk app, not a responsive
website — but see "Responsive behavior" for the one axis that must flex.

Music comes from **Spotify (parent's Premium account)**. Kids never authenticate,
never search, never see playlists.

---

## About the design files

`prototype/Kids Jukebox.dc.html` is a **design reference created in HTML** — a
prototype showing intended look and behavior. It is not production code to copy.

It is a single file using a small in-house streaming-component runtime (`support.js`,
a template + React-ish logic class). **Do not port that runtime.** Read the file for
layout, values, copy, and state logic, then **recreate the screens in the target
codebase using its own framework and patterns.**

No codebase exists yet, so pick the stack. Recommended:

- **React + TypeScript + Vite** for the tablet UI (installable PWA, Android kiosk/WebView shell later).
- A small **Node/TypeScript backend** — required, not optional: Spotify OAuth needs a
  client secret and refresh-token storage that can't live in the tablet bundle.
- **SQLite** (better-sqlite3 / Prisma) for library, kids, favorites, PIN, queue.
- Global state: Zustand or React Context — the app is small; Redux is overkill.

The Nocturne design system is included as plain CSS at
`prototype/_ds/nocturne-.../styles.css`. **Use this file as-is** — it holds every
color/type/space/radius/shadow token as CSS custom properties. Import it once and
build against `var(--*)`. `readme.md` beside it is the system's own usage guide.
`_ds_bundle.js` is a runtime shim for the prototype only — you don't need it.

## Fidelity

**High-fidelity.** Colors, type, spacing, sizes, copy, and interaction timing are
final and should be reproduced faithfully. Every value below is exact.

Two deliberate placeholders:

1. **Album art** — rendered as a soft radial-gradient tile with a music-note glyph.
   Replace with real Spotify `album.images` artwork. The gradient is the loading/
   fallback state, so keep it as the placeholder while images load or 404.
2. **Song/artist data** — invented tracks (The Sunny Socks, Bongo Bunnies, …) so the
   prototype demos without an API. All of it comes from Spotify in the real app.

---

## Design tokens

From `styles.css` — reference the CSS variables, don't hard-code hexes.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#161826` | Page ground |
| `--color-surface` | `#232532` | Now-playing bar, cards, modals, inputs |
| `--color-text` | `#e9e9ed` | Body text |
| `--color-accent` | `#9184d9` | The single accent — lines, glows, outlines |
| `--color-divider` | `color-mix(in srgb, #e9e9ed 16%, transparent)` | Hairlines |
| `--color-neutral-100…900` | `#f3f5fe` → `#292b31` | Surfaces, borders, muted text |
| `--color-accent-100…900` | `#f5f4ff` → `#2b2741` | Tints, tags, pressed states |

Accent ramp steps used in the design: `-100 #f5f4ff`, `-200 #e7e5fe`, `-300 #d2cefd`,
`-400 #b5abfc`, `-500 #968ae0`, `-600 #796cbf`, `-700 #5d5294`, `-800 #423a6a`,
`-900 #2b2741`. Neutral steps used: `-200 #e4e7f5`, `-300 #cfd3e5`, `-400 #b2b6ca`,
`-700 #595d6c`, `-800 #3f424d`, `-900 #292b31`.

Outside the frame the desk background is `#0e0f18` (`html, body`).

Album-art placeholder gradients (6, assigned round-robin by track index):
`radial-gradient(120% 120% at 28% 18%, <a>, <b> 72%)` where the pairs are
`#4c5397/#262a60`, `#5d5294/#2b2741`, `#595d6c/#292b31`, `#796cbf/#2b2741`,
`#353b80/#232532`, `#75798c/#3f424d`.

### Type

Inter (400/500/600/700), loaded by `styles.css` from Google Fonts.
`--font-heading` and `--font-body` are both Inter; headings are **weight 500 — never
bolder**. Heading scale: h1 42, h2 32, h3 25, h4 20, h5 16, h6 13px uppercase.
Body 15px/1.55. Headings: line-height 1.12, letter-spacing −0.015em.

### Spacing / radius / shadow

`--space-1` 2.8 · `-2` 5.6 · `-3` 8.4 · `-4` 11.2 · `-6` 16.8 · `-8` 22.4px
(density 0.70× — dense on purpose, but see the kid-screen exception below).

`--radius-sm` 4 · `--radius-md` 8 · `--radius-lg` 14px.

`--shadow-sm` `0 0 0 1px #3f424d` · `--shadow-md` `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)` ·
`--shadow-lg` `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65)`.

### Two system rules that matter visually

1. **Freestanding rules fade at both ends.** Horizontal dividers are
   `linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)`,
   not flat 1px borders. Used under the now-playing bar and the parent header.
2. **Primary buttons are outlined, never filled** — 1px accent border on transparent,
   accent text. Nothing large is flooded with the accent.

### Kid-screen scale exception

The design system is compact; the kid screen is not. Kid-side type and hit targets
are deliberately oversized for small fingers and mixed reading ability. Use the
literal px values in the screen specs below for the kid screen, and the token
spacing scale for the parent screens.

---

## Screens / views

Four top-level views in one 800 × 1280 frame:
`kid` (default) → `pin` (overlay) → `parent`; plus the `favorite` modal over `kid`.

### 1. Kid screen — now-playing bar

Fixed at top. `padding: 26px 28px 22px`, `background: var(--color-surface)`,
`box-shadow: 0 12px 34px rgba(0,0,0,.5)`, fading 1px divider along its bottom edge.

Optional ambient glow (design tweak, default on): a blurred circle
`420 × 340px` at `left:-60px; top:-120px`, `radial-gradient(circle,#5d5294,transparent 68%)`,
`filter: blur(30px)`, breathing `opacity .55 → .85` over 6s, `pointer-events:none`.

Row 1 — art + text, `display:flex; gap:22px; align-items:center`:

- **Album art** 158 × 158px, `border-radius: var(--radius-lg)`, `--shadow-md`,
  `overflow:hidden`. Placeholder = gradient + 58px music-note glyph
  (`#e9e9ed` at 38% opacity, stroke-width 14 on a 256 viewBox).
- **Kicker** 11px, `letter-spacing .14em`, uppercase, `--color-accent`.
  Text: `Now playing` / `Paused`.
- **Equalizer** (only while playing) 3 bars × 3px wide, `--color-accent-400`,
  `border-radius 2px`, heights animating 8↔22, 20↔9, 13↔24px over 0.9s
  `ease-in-out infinite`.
- **Song title** 40px/1.06, weight 500, `letter-spacing -.02em`, single line, ellipsis.
- **Artist** 22px, `color-mix(in srgb, var(--color-text) 60%, transparent)`, ellipsis.

Row 2 — progress, `margin-top:22px`, `display:flex; align-items:center; gap:14px`:

- Elapsed / total labels 15px, `tabular-nums`, 55% text, fixed 52px wide (right-aligned on the right).
- Track: `flex:1; height:10px; border-radius:6px`, `background: color-mix(in srgb, var(--color-text) 12%, transparent)`.
- Fill: `--color-accent`, `width: <pct>%`, `transition: width .9s linear`.
- **Non-interactive** — no drag, no seek, no pointer cursor. Kids must not scrub.

Row 3 — controls, `margin-top:20px`, `display:flex; align-items:center; gap:18px`:

- **Play/pause** 96 × 96px circle. `background: color-mix(in srgb, var(--color-accent) 14%, transparent)`,
  `border: 2px solid var(--color-accent)`, icon `--color-accent`.
  Active: accent at 28%. Icons: 38px pause bars (rx 1.6) / 40px play triangle.
- **Skip** 88 × 88px circle, transparent, `1px solid var(--color-divider)`,
  30px skip glyph + a 10px uppercase `Hold` caption beneath it (55% text,
  `letter-spacing .12em`). `touch-action:none; user-select:none`.
  **Hold-to-skip — see Interactions.**
- Spacer `flex:1`.
- **Favorite (star)** pill, height 88px, `padding: 0 26px`, `border-radius: 44px`,
  accent 10% background, 1px accent border, accent text; active accent 24%.
  36px star icon — `fill:#b5abfc` when the current track is any kid's favorite,
  else `fill:none` with `stroke: currentColor`, `stroke-width 1.6`.
  Label 24px weight 500: the favoriting kids' names joined by ", " (e.g. `Mia, Sam`),
  or `Favorite` when nobody has starred it.

### 2. Kid screen — browse area

**Tab row**: `padding: 20px 28px 14px`, `display:flex; gap:12px`. Four equal tabs
(`flex:1`), each 70px tall, `border-radius: var(--radius-lg)`, 20px weight 500.

- Selected: `background: color-mix(in srgb, var(--color-accent) 16%, transparent)`, `1px solid var(--color-accent)`, text `--color-accent-200`.
- Unselected: `background: var(--color-surface)`, `1px solid var(--color-divider)`, text 72% of `--color-text`.
- Tabs: **Recent** (default) · **Songs** · **Artists** · **Favorites**.
- There is deliberately **no Playlists tab. Kids must never see playlists.**

**Scroll region**: `flex:1; padding: 8px 28px 34px`, vertical scroll with hidden
scrollbars (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`),
`-webkit-overflow-scrolling: touch`.

**Heading row**: title 22px weight 500 + count 15px at 45% text
(e.g. `Played lately` · `9 songs`).

**Grid**: `display:grid; gap:20px; grid-template-columns: repeat(3, 1fr)`
(3 is the default; 2–4 is a design tweak — 3 columns = 224px tiles at this width).

Each **tile** is a button, transparent, `text-align:left`,
`display:flex; flex-direction:column; gap:10px`:

- Art: `width:100%; aspect-ratio:1; border-radius: var(--radius-lg); overflow:hidden; --shadow-sm`,
  gradient placeholder + 46px note glyph at 30% opacity.
- Favorited badge (if any kid starred it): 34px circle at `top:8px; right:8px`,
  `background: color-mix(in srgb, var(--color-bg) 72%, transparent)`, 20px star filled `#b5abfc`.
- Title 21px/1.15 weight 500, `text-wrap: pretty`.
- Subtitle 16px at 52% text — artist name (or `N songs` on artist tiles).
- Press feedback: `transform: scale(.96)`, `transition: transform .12s ease`.

**Tab contents**

- **Recent** — last 9 played, most recent first. Heading `Played lately`.
- **Songs** — full playable library, A→Z by title. Heading `All songs`.
- **Artists** — artist tiles (art placeholder + a bottom caption strip:
  `padding 8px 10px`, 13px uppercase `letter-spacing .1em`, `--color-accent-200`,
  over `linear-gradient(transparent, rgba(0,0,0,.55))`, reading `N songs`).
  Tapping an artist swaps the grid to that artist's songs and shows a back button:
  `All artists`, 19px, `padding 12px 20px`, `radius-md`, 1px divider border, chevron icon.
- **Favorites** — a kid-name chip row above the grid (4 chips, `flex:1`, 60px tall,
  `radius-lg`, 20px; selected = accent 18% + accent border + `--color-accent-200`;
  unselected = transparent + divider border). Grid shows that kid's favorites.
  Empty state: dashed-border panel, `padding 52px 20px`, 19px at 55% text,
  `No favorites yet. Tap the star while a song plays.`

**Toast** (bottom center, `bottom:34px`): `padding 16px 28px`, `border-radius 44px`,
`--color-surface`, `--shadow-lg`, 21px heading font, enters with
`translateY(18px) → 0` + fade over .22s ease-out, auto-dismisses after 2.2s.

**Hidden parent trigger**: a transparent 96 × 96px div pinned to the frame's
top-right corner, `z-index:5`. `pointerdown` starts a 1500ms timer → PIN view;
`pointerup`/`pointerleave` cancels. After press starts, a small 20px
`--color-accent-700` dot appears at `top:14px; right:14px` as the only feedback.
No label, no icon, nothing discoverable by a child.

### 3. PIN view

Full-frame overlay, `--color-bg`, centered column, `gap: var(--space-6)`, `padding:60px`.
Decorative blurred ellipse behind: 520 × 420px at `top:-140px`,
`radial-gradient(circle,#2b2741,transparent 70%)`, `blur(28px)`.

- Kicker 11px uppercase `letter-spacing .16em` accent: `Grown-ups only`.
- h2 `Enter your PIN`. Sub-line 15px at 55%: `Hint for the demo: 1234` — **delete this in production.**
- Four dots, 26px circles, `gap:16px`. Filled = accent bg + accent border;
  empty = transparent + `2px solid var(--color-neutral-700)`.
- Keypad `grid-template-columns: repeat(3,110px); gap:16px`, keys 88px tall,
  `radius-lg`, `--color-surface`, 1px divider border, 30px weight 500.
  Layout `1-9`, then `⌫` (backspace), `0`, `✕` (cancel → kid view).
  Active state: accent 20% wash.
- Error line 16px `--color-accent-300`, min-height 26px:
  `That PIN did not match. Try again.` (entry clears on failure).
- Footer button `.btn .btn-secondary`, 52px: `Back to music`.

A correct 4th digit enters the parent view immediately — no submit button.

### 4. Parent view

Full-frame, `--color-bg`, `z-index:25`.

**Header** `padding: 20px 24px`, fading divider beneath:
kicker 10px uppercase accent `Parent controls`; title 26px weight 500
`Jukebox settings`; right-aligned `.btn .btn-primary` 48px:
`Done — back to kids`.

**Tab row** `padding: 16px 24px 12px`, `gap:8px`, wrapping. Each tab
`padding: 11px 18px`, `radius-md`, 16px weight 500, same selected/unselected
treatment as the kid tabs. Order: **Songs** (default) · **Playlists** · **Queue** ·
**Spotify Account** · **Change PIN**.

**Body** scrolls, `padding: 8px 24px 32px`. Parent-side toast is the same component
at 16px / `bottom:26px`.

#### 4a. Songs — search all of Spotify, then curate

Two zones. **This is where individual tracks are added.**

*Search card* — `padding: var(--space-4)`, `radius-lg`, `--color-surface`, `--shadow-sm`:

- Kicker: `Search all of Spotify`.
- `.input` (42px) + `.btn .btn-secondary` `Clear`.
  Placeholder: `Any song or artist on Spotify — try "bunny", "robot", "beach"`.
- Results appear once the query is non-empty: rows with a 36px art thumb,
  title 15px (+ `.tag .tag-neutral` `Explicit` where applicable), artist · duration
  12px at 50%, and a right-aligned **Add** button (13px, `radius-md`, transparent,
  1px accent border, accent text).
  Explicit results render `Blocked — explicit` on a `--color-neutral-800` chip with
  `cursor: not-allowed` and do nothing when tapped.
- Already-in-library tracks are filtered out of results. If a query matches only
  those: dashed panel, `No matches left to add — everything found is already in the jukebox.`
- **Search must hit the real Spotify catalog** (`GET /v1/search?type=track`), not the
  account's saved library. The prototype's local array stands in for it.

*Library table* — `h4 In the jukebox` + count at 13px/50%, then explanatory copy
(14px at 60%, `max-width:560px`), then `.table`:

Columns: **Song** (34px art thumb + title + optional Explicit tag) · **Artist** ·
**Source** (12px muted: `Added directly` or the linked playlist's name) ·
**Kids can play** (right-aligned).

The action cell holds two controls: a state toggle and a remove `✕`
(`.btn .btn-icon .btn-secondary`).

Toggle states (13px, `padding 6px 14px`, `radius-md`):

| Label | Meaning | Style |
| --- | --- | --- |
| `Allowed` | visible to kids | accent 14% bg, accent border, `--color-accent-200` |
| `Hidden` | in library, not shown to kids | transparent, divider border, 55% text |
| `Blocked` | explicit — not togglable | `--color-neutral-800`, `--color-neutral-300`, `cursor:not-allowed` |

`.table` styling comes from the design system: 11px uppercase headers at 60% text,
row rules drawn as row-level fading gradients, 4% hover wash.

#### 4b. Playlists — a bulk import source, NOT an in-app playlist builder

There is **no create-playlist UI**. Playlists exist only to pour tracks into the one
flat song library. Intro copy (14px at 60%, `max-width:560px`):

> Linking a Spotify playlist pours its tracks into the jukebox as individual songs —
> the kids never see the playlist itself. Edit a collaborative playlist in Spotify
> (or here) and the jukebox follows on the next sync.

*Linked playlists* (kicker) — one card each, `padding: var(--space-4)`, `radius-lg`,
`--color-surface`, `--shadow-sm`:

- h4 name + `.tag .tag-accent` `Collaborative` when applicable.
- 13px at 55%: owner/sharing line · `N songs in the jukebox`.
- 12px `--color-neutral-400` line when explicit tracks were skipped:
  `N explicit track hidden`.
- Actions: `.btn .btn-primary` reading `Sync — N new` when upstream changes are
  pending, else `Synced`; `.btn .btn-secondary` `Unlink`.
- Fading divider, then the track list: 30px art thumb, title 14px, artist 12px at 45%,
  a state chip (11px, `padding 3px 9px`, `radius 6px`) reading `In jukebox`
  (accent-800 bg / accent-100 text), `Removed by you`, or `Blocked`
  (neutral-800 / neutral-300), and a `✕` icon button that **removes the track from
  the playlist itself** (i.e. writes to Spotify — see API notes).
- Empty state: `No playlists linked yet. Link one below to add its songs in bulk.`

*Your Spotify playlists* (kicker) — unlinked playlists as rows: name (+ `.tag .tag-neutral`
`Collaborative`), owner · track count at 12px, and a `.btn .btn-primary` **Link**.
Linking flashes `<name> linked — N songs added`. Empty state:
`Every playlist on this account is already linked.`

Rules the implementation must preserve:

- Playlist tracks enter the same flat library as searched tracks and are
  indistinguishable in the kid chooser.
- Explicit playlist tracks are never imported for kids (counted as hidden).
- A song removed in the parent Songs table stays out even if its playlist still
  lists it (per-song override beats playlist membership).
- Unlinking removes that playlist's contribution; tracks that were also added
  individually stay.

#### 4c. Queue

- Summary line 14px at 60%: `N up next · M:SS total`, plus `.btn .btn-secondary`
  **Shuffle** and **Clear all**.
- Now-playing strip: `radius-lg`, `--color-surface`, `--shadow-sm`, 44px art,
  title 17px, `Now playing · <artist>` 13px at 55%, `.btn .btn-secondary` **Skip**
  (parent skip is **immediate** — no hold).
- Queue rows: 4% wash, `radius-md`, `padding 10px 14px`: index (24px, tabular),
  36px art, title 15px, `<artist> · added by <who>` 12px at 50%, then three
  `.btn .btn-icon .btn-secondary` — move up, move down, remove.
- Empty state: dashed panel, `Nothing queued. Songs the kids tap while music is playing land here.`

#### 4d. Spotify Account

Card (`radius-lg`, surface, `--shadow-sm`, `max-width:560px`):

- 48px avatar circle `--color-accent-800` / `--color-accent-200` with the initial,
  display name 18px, email 13px at 55%, `.tag .tag-accent` `Connected` / `Disconnected`.
- Flat divider, then label/value rows (14px, `space-between`, labels `.text-muted`):
  Plan (`Spotify Premium · Family`), Playback device, Explicit filter
  (`On — enforced for kids`), Last synced.
- `.btn .btn-primary` **Re-sync library** · `.btn .btn-secondary`
  **Disconnect account** / **Connect Spotify**.
- Below: `Play on` kicker + device chips (`padding 11px 16px`, `radius-md`, 15px;
  selected = accent 18% + accent border).

#### 4e. Change PIN

`max-width:380px`. Explanatory copy, then three `.field` + `.input type=password`
`inputMode=numeric` `maxLength=4`: **Current PIN**, **New PIN**, **Confirm new PIN**.
Message line 14px (`--color-accent-300` on success, `--color-neutral-400` on error),
then `.btn .btn-primary .btn-block` (46px) **Save new PIN**.

Validation, in order, each replacing the message line:

1. `Current PIN is incorrect.`
2. `New PIN must be exactly four digits.` (`/^\d{4}$/`)
3. `The two new PINs do not match.`
4. Success: `PIN updated.` and all three fields clear.

---

## Interactions & behavior

### Hold-to-skip (kid side) — 1 second

A tap must do nothing; the song only skips after a **1000ms** continuous hold.

- `pointerdown` records the start time and starts a ~40ms ticker.
- Progress `p = min(1, elapsed / 1000)` drives a ring around the button:
  an 88px SVG overlay, `transform: rotate(-90deg)` so it fills from 12 o'clock;
  `<circle cx=44 cy=44 r=42 fill=none stroke-width=4 stroke-linecap=round>`,
  `stroke-dasharray: 263.9` (2πr), `stroke-dashoffset: 263.9 × (1 − p)`,
  stroke `--color-accent` while holding and `transparent` at rest.
- At `p ≥ 1`: stop the ticker, reset the ring, advance the track.
- `pointerup` / `pointerleave` / `pointercancel` before 1s: reset to 0 (ring vanishes).
- `touch-action: none` on the button so the scroll container doesn't steal the gesture.
- Do the same for any future destructive kid-side action; don't reuse it for play/pause.

### Tap a song (kid side)

- Nothing playing → play it immediately, toast `Playing <title>`.
- Something playing → append to queue, toast `<title> added to the queue`.
- Never interrupts the current song. Queue entries record who added them (`added by`).

### Favoriting (kid side)

- Star opens a modal: backdrop `color-mix(in srgb,#0e0f18 72%,transparent)`,
  card `max-width:600px`, `padding:30px`, `radius-lg`, surface, `--shadow-lg`,
  entering `scale(.94) → 1` + fade over .18s.
- Header: accent kicker `Add to favorites`, current song title 30px,
  sub-line 18px at 55% `Whose favorite is this?`
- One row per kid (4 rows, `padding 16px 20px`, `radius-lg`): 52px avatar circle with
  the initial, name 25px weight 500, hint 16px at 55% (`Tap to add` / `Tap to remove`),
  30px star. Rows where this song is already that kid's favorite: accent 16% bg,
  accent border, avatar `--color-accent-700`/`-100`, star filled `#b5abfc`.
  Rows where it isn't: `#e9e9ed` at 5%, divider border, avatar neutral-800/-200,
  star outline at 40%.
- Tapping a row **toggles** that kid's favorite, closes the modal, and toasts
  `Saved to <name>'s favorites` / `Removed from <name>'s favorites`.
- `.btn .btn-secondary` **Close** (58px) dismisses without changes.

### Playback progress

Prototype ticks a 1s timer and auto-advances at track end. Real app: drive from the
Spotify player's `position_ms`/`duration_ms` (Web Playback SDK `player_state_changed`,
or poll `GET /v1/me/player` ~1/s) and advance on track end.

### Transitions summary

| Thing | Spec |
| --- | --- |
| Tile press | `transform: scale(.96)`, `.12s ease` |
| Progress fill | `width`, `.9s linear` |
| Toast in | `translateY(18px)→0` + fade, `.22s ease-out`, 2200ms life |
| Favorites modal in | `scale(.94)→1` + fade, `.18s ease-out` |
| Now-playing glow | opacity `.55↔.85`, `6s ease-in-out infinite` |
| Equalizer bars | height, `.9s ease-in-out infinite`, staggered shapes |
| Skip ring | `stroke-dashoffset`, driven per-frame over 1000ms (no CSS transition) |

### Focus, hover, disabled

Do not leave browser defaults. `styles.css` already provides
`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`,
accent-tinted `::selection`, hover/active tints on `.btn`/`.input`, and
`opacity .45` on `:disabled`. Custom-styled buttons in the design use accent
`color-mix` washes for `:active` — carry those over.

### Responsive behavior

Fixed 800 × 1280 kiosk. The only flexible axis: browse-grid columns (2–4) and the
scroll region's height. Don't build breakpoints; do let the grid and scroll area
absorb Android's system-bar/keyboard insets (`100dvh`, `env(safe-area-inset-*)`).
Lock orientation to portrait.

### Accessibility notes

Every icon-only control in the design carries an aria-label
(`Play or pause`, `Hold to skip to the next song`, `Add to favorites`,
`Move up`, `Move down`, `Remove`, `Remove from jukebox`, `Remove from this playlist`).
Kid-side hit targets are ≥ 60px; keep nothing below 44px anywhere.

---

## State management

### Kid-side UI state

| State | Type | Notes |
| --- | --- | --- |
| `view` | `'kid' \| 'pin' \| 'parent'` | `kid` on boot |
| `tab` | `'recent' \| 'songs' \| 'artists' \| 'favorites'` | default `recent` |
| `artist` | `string \| null` | artist drill-down |
| `favKid` | kid id | whose favorites the Favorites tab shows |
| `showFav` | boolean | favorites modal |
| `skipHold` | 0…1 | hold-to-skip progress |
| `pressing` | boolean | secret-corner press feedback |
| `toast` | string | transient message |

### Playback / library state (server-owned in production)

| State | Type | Notes |
| --- | --- | --- |
| `playingId`, `playing`, `pos` | id, boolean, seconds | mirror the Spotify player, don't own it |
| `queue` | `{ id, by }[]` | `by` = who added it |
| `library` | tracks | union of directly-added + linked-playlist tracks |
| `added` / `removed` | `Record<id, boolean>` | per-song include/exclude overrides |
| `hidden` | `Record<id, boolean>` | in library, not shown to kids |
| `playlists` | `{ id, name, owner, collab, songs[], upstream[] }[]` | mirror of the parent's Spotify playlists |
| `linked` | playlist id[] | which ones feed the jukebox |
| `favorites` | `Record<kidId, songId[]>` | per-kid |
| `kids` | `{ id, name }[]` | 4 in the design: Mia, Leo, Ava, Sam |
| `pin` | string | **hash it server-side; never ship plaintext** |
| `connected`, `device` | boolean, string | Spotify connection + target device |

### Derived selectors (worth porting verbatim)

- `inLibrary(song)` — `false` if `removed[id]`; `true` if `added[id]`;
  else `true` if any **linked** playlist contains it.
- `library()` — all songs where `inLibrary`.
- `playable()` — `library()` minus explicit minus `hidden` → **the only list kids ever see.**
- `fromPlaylists(id)` — names of linked playlists containing the song (the Source column).

### Transitions

- Secret corner held 1500ms → `view: 'pin'`.
- 4th correct digit → `view: 'parent'`, `parentTab: 'songs'`; wrong → clear + error.
- `Done — back to kids` → `view: 'kid'`. Also auto-exit on inactivity (recommended,
  not in the prototype: ~60s idle → back to kid view).
- Track end or completed hold-skip → pop the queue if non-empty, else advance
  alphabetically through `playable()`.

---

## Data & API notes (Spotify)

Everything below is stubbed in the prototype and must be built.

- **Auth**: Authorization Code + PKCE for the parent, but keep the client secret and
  refresh token **server-side**. Scopes: `user-read-playback-state`,
  `user-modify-playback-state`, `streaming`, `playlist-read-private`,
  `playlist-read-collaborative`, `playlist-modify-public`, `playlist-modify-private`,
  `user-read-email`, `user-read-private`. Premium is required for playback control.
- **Search** (`4a`): `GET /v1/search?type=track&q=…&market=…`. Read `explicit` per
  track and block accordingly.
- **Playlists** (`4b`): `GET /v1/me/playlists` for the pick list;
  `GET /v1/playlists/{id}/tracks` for contents; `snapshot_id` is your change token —
  a differing `snapshot_id` is the "N new" pending-sync signal.
  Track removal writes `DELETE /v1/playlists/{id}/tracks`.
  Collaborative playlists are readable via `playlist-read-collaborative` and are
  exactly the "Grandma adds a song" case.
- **Playback**: Web Playback SDK for audio on the tablet, or
  `PUT /v1/me/player/play` + `/queue` against a chosen device (`GET /v1/me/player/devices`
  feeds the `Play on` chips).
- **Explicit filter**: enforce it yourself on the `explicit` flag. Don't rely on the
  account setting.
- **Artwork**: `album.images` — pick the ~300px variant for tiles, the largest for
  the now-playing bar. Cache locally; the gradient placeholder covers misses.
- **Kiosk**: install as a PWA in Android kiosk/lock-task mode (or wrap in a WebView)
  so kids can't leave the page or reach system UI.

Security musts: PIN hashed (bcrypt/argon2) server-side with attempt throttling;
no Spotify tokens in `localStorage`; the kid UI must have no code path to search,
add, or authenticate.

---

## Assets

- **Fonts** — Inter 400/500/600/700, imported by `styles.css` from Google Fonts.
  Self-host for offline kiosk use.
- **Icons** — the design system specifies **Phosphor** (https://phosphoricons.com).
  The prototype inlines hand-written SVG equivalents (play, pause, skip, star,
  music note, chevron, chevron up/down, ✕, check). Replace with real Phosphor icons
  (`@phosphor-icons/react`) at the same pixel sizes.
- **Album art** — none bundled. Gradient placeholders only; see Fidelity.
- **No logo/wordmark** exists yet.

## Files

```
screenshots/            12 views, full-screen and detail crops — see screenshots/README.md
prototype/
  Kids Jukebox.dc.html    the design reference — all four views, all states
  support.js              prototype runtime (do NOT port)
  _ds/nocturne-…/
    styles.css            USE THIS — all design tokens + component classes
    readme.md             design-system usage guide (rules, do/don't)
    _ds_bundle.js         prototype-only shim
```

To view the prototype: serve the `prototype/` folder over HTTP
(`npx serve prototype`) and open `Kids Jukebox.dc.html` — a plain `file://` open
won't load the sibling files. Demo PIN **1234**; reach the parent area by
press-and-holding the top-right corner of the frame for 1.5s.

## Suggested build order

1. Scaffold Vite + React + TS; import `styles.css`; lock an 800 × 1280 portrait shell.
2. Static kid screen with mock data — now-playing bar, tabs, grid, favorites modal.
3. Hold-to-skip and the secret-corner + PIN flow (still mock).
4. Backend: SQLite schema (kids, songs, favorites, queue, playlists, settings) + REST.
5. Spotify OAuth server-side; parent Songs search → add; playlist link/sync.
6. Real playback via Web Playback SDK; wire progress/queue to player events.
7. PWA + Android kiosk packaging; offline font/artwork caching.
