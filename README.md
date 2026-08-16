# MA HTML Player

A self-hosted, single-file HTML dashboard for [Music Assistant](https://www.music-assistant.io/) (MA). It runs directly in the browser — including old iPads on iOS 9 / Safari 9 — and talks to the MA WebSocket API directly, with no server, build step, or external dependencies required.

## Features

- **Direct MA control** over WebSocket (`/ws`) with long-lived token authentication.
- **Player selection** as a station-style bar at the top (all players, or a configurable whitelist). Tapping the already-active station opens a grouping menu: current group members can be removed, and other groupable players can be added.
- **Now-playing view** with cover art, title, artist, album, progress bar, transport controls, shuffle/repeat, and volume. For group/sync players, an expandable panel lets you control the volume of each group member individually.
- **Search** across tracks, albums, artists, playlists, radio, podcasts, and audiobooks.
- **Navigation** within search results: artist → albums + top tracks, album → tracks, playlist → tracks, podcast → episodes. Opening a detail view from the Library or the Now-Playing area keeps the tab you came from (Library/Queue) visually active, and "Back" returns you there once you leave the detail view.
- **Lazy-loaded detail tabs** on the artist view: "Top Tracks" (genuine top/featured tracks), "Tracks" (full track list), and "Albums" — each loaded only when its tab is opened. For artists reached via the Library, the dashboard automatically resolves the real streaming provider from `provider_mappings` instead of the `library` pseudo-provider, so the full catalog is shown rather than just the items already linked in your library.
- **Library tab** on the home screen: quick access to saved playlists, artists, albums, tracks, radio, podcasts, and audiobooks, with favorite-heart indicators. A "Favorites only" toggle chip filters the list, and "Name"/"Year" chips sort it client-side.
- **Sorting**: the Library, Search, and the "Tracks"/"Albums" tabs of the artist view all offer sort chips ("Name"/"Year", plus "Relevance" as the default in Search). The "Top Tracks" tab is intentionally not sortable, since its order *is* the popularity ranking.
- **Action sheet** per item: play now, play next, add to end of queue, add to playlist, add/remove favorite, open artist/album.
- **Add to playlist** from both the action sheet and the now-playing cover. Favorite playlists are listed first, followed by the rest sorted alphabetically.
- **Automix / smart crossfade** toggle; if playback is active, it's briefly paused and resumed around the toggle.
- **Queue view**: jump to a track, remove individual items, clear the queue. Only the last 3 already-played tracks are shown before the current one, to keep the view from growing indefinitely over a listening session — the actual server-side queue is untouched.
- **Favorite heart** in both the now-playing area and every detail view.
- **Dark/light mode**: follows the system setting by default, with a manual toggle in the header; your choice is remembered and overrides the system from then on.
- **Accent color**: pick from a small preset palette via the color swatch in the header (default stays the amber/yellow); your choice is remembered.

## Setup

1. Copy `ma-env.example.js` to `ma-env.js` and fill in your values:

   ```javascript
   var CFG = {
     MA: 'http://192.168.1.5:8095',   // MA base URL, no trailing slash. Leave empty to use the current host (e.g. when MA serves this file itself).
     TOKEN: '<long-lived-token>',     // MA: Settings > User > Token (role "user" or higher; "guest" can't set favorites)
     PLAYERS: [],                     // optional whitelist/order of player_ids; empty = all available players, alphabetical
     DEFAULT_PLAYER: '',              // player_id active on start; empty = whichever player/group is currently playing, else the first one
     SEARCH_LIMIT: 12,                // results per category
     LIST_LIMIT: 200,                 // tracks/albums per detail view
     IMG_COVER: 512,                  // cover image size via imageproxy
     IMG_THUMB: 160                   // thumbnail image size via imageproxy
   };
   ```

   `ma-env.js` is excluded via `.gitignore` since it holds credentials — never commit it.

2. Serve `ma-dashboard.html`, `ma-env.js`, and `AppIcon.png` from any static web server (or let Music Assistant itself serve them), or open `ma-dashboard.html` directly via `file://` on the device. `AppIcon.png` is used as both the browser favicon and the iOS "Add to Home Screen" icon — keep it next to `ma-dashboard.html`.

   If you run Home Assistant, its built-in `www/` folder is an easy way to do this without a separate web server: drop all three files into `<config>/www/` (e.g. via the File editor or Studio Code Server add-on), and they become reachable at `http://<ha-ip>:8123/local/ma-dashboard.html`, `.../ma-env.js`, and `.../AppIcon.png` — Home Assistant serves anything under `www/` at the `/local/` path automatically, no extra configuration needed.

3. Open the page. It connects to `CFG.MA`'s WebSocket endpoint, authenticates with `CFG.TOKEN`, and loads your players and queues.

No build step, no package manager, no external libraries — it's a single self-contained HTML file.

## Why WebSocket instead of HTTP JSON-RPC?

MA exposes both a WebSocket endpoint (`/ws`) and a POST route (`/api`) for JSON-RPC. The POST route doesn't send CORS headers, so XHR/fetch requests from a different origin (e.g. `file://` on an iPad, or any local web server) fail the preflight check. WebSocket handshakes aren't subject to the same-origin policy, so this file works from anywhere.

## Browser compatibility

Built to run on iOS 9.3+ / Safari 9, so the code intentionally avoids:

- CSS Grid, `@supports`
- Arrow functions, `fetch`, `const`/`let`, `Promise`, `class`, `Object.assign`

CSS custom properties (variables) are the one deliberate exception, used for dark/light mode — Safari has supported them since 9.1 (iOS Safari 9.3), which is this project's floor anyway.

`XMLHttpRequest` is only used for the initial `/info` request (to read the `Date` header for clock correction). Fonts are limited to what iOS ships natively (`Avenir Next`, `Futura`, `Helvetica Neue`).

## Troubleshooting

- **"Anmeldung abgelehnt" (login rejected)** — check `CFG.TOKEN`; it must be a long-lived token with at least the `user` role.
- **"Dieser Browser kann kein WebSocket" (browser can't do WebSocket)** — the iPad/Safari version is too old; iOS 9.3+ is required.
- **Connection indicator stays red** — check `CFG.MA`, make sure the MA server is reachable, and check firewall/WebSocket proxy settings.
- **Progress bar doesn't move smoothly** — expected server behavior on current MA beta versions (they only send position anchors, not continuous ticks); the dashboard interpolates locally between anchors. Not a bug in this client.
- **Images don't load** — verify `CFG.MA` is correct; if you're behind a reverse proxy, make sure `/imageproxy` is reachable.

## License / project notes

This project replaces an earlier version that mediated through Home Assistant REST services and only offered very limited functionality. This version talks to Music Assistant directly.

For implementation details, architecture notes, and MA WebSocket command references intended for contributors/AI coding agents, see [`CLAUDE.md`](CLAUDE.md) (in German).
