## Pro Music Player — TanStack Start + Convex + Spotify

A demo-ready app to showcase TanStack Start fundamentals with Convex and the Spotify Web API. Optimized for a live presentation with clear, commented code and strong UX.

Quick links

- TanStack Start: Learn the Basics — https://tanstack.com/start/latest/docs/framework/react/learn-the-basics
- TanStack Start: Build from Scratch — https://tanstack.com/start/latest/docs/framework/react/build-from-scratch
- TanStack Query: Quick Start — https://tanstack.com/start/latest/docs/framework/react/quick-start
- Spotify Web API docs — https://developer.spotify.com/documentation/web-api

Dev info

- Dev server: http://localhost:3000
- Redirect URI (local via tunnel): https://<your-tunnel-domain>/auth/spotify/callback

---

## Goals

- Learn core TanStack Start concepts hands-on (routing, loaders/SSR, server functions, API routes, query caching, streaming, forms, error boundaries).
- Build a polished, performant Spotify-powered music app with Convex-backed features.
- Comment important decisions (the “why”), keep server actions centralized, and use descriptive names.

## Architecture Overview

- Auth: Authorization Code with PKCE. Store access/refresh tokens in Convex keyed by session. Server-only token refresh.
- Data flow: Client → Start server function/API route → Spotify → typed JSON → TanStack Query caching + dehydration.
- Convex: Users, sessions, spotifyTokens, collections, collectionItems, rooms (optional), activities.
- UI: shadcn/ui for components, Query Devtools in dev, “Presentation Mode” for demos.

## Risks & Mitigations

- Playback requires Premium and an active Spotify device; Web Playback SDK supports in-browser playback for Premium users. Fallback to read-only if unavailable.
- Token refresh: implement robust refresh flow; never expose refresh tokens to the client.
- Rate limits: leverage query caching, debounce search, dedupe in-flight requests.

---

## Milestone Checklist

### Phase 0 — Setup

- [x] Create Spotify app in Dashboard; enable Web API + Web Playback SDK
- [x] Add Redirect URI(s) including local: https://localhost:3000/auth/spotify/callback
- [x] Copy `.env.example` → `.env` and fill values
- [x] Verify dev server runs on port 3000

### Phase 1 — Auth (PKCE)

- [x] Server endpoint to start OAuth (generates code challenge, sets verifier cookie)
- [x] Callback endpoint to exchange code for tokens (stores in Convex)
- [x] Session cookie (httpOnly) linking browser session → Convex session
- [ ] Token refresh on demand + background refresh helper
- [ ] Logout: revoke local session and clear tokens

### Phase 2 — Profile & Capabilities

- [ ] `GET /me` profile loader (SSR) and display
- [ ] Detect available devices, Premium status, and playback capabilities

### Phase 3 — Search

- [x] Search route with tabs: Tracks / Artists / Albums
- [ ] Server loader w/ debounce + caching; infinite scroll or paging
- [ ] Keyboard navigation and quick add-to-playlist affordances

### Phase 4 — Playlists

- [x] Playlists index (read)
- [x] Playlist detail (read)
- [ ] Add/remove tracks (mutations) with optimistic UI + invalidation
- [ ] Create playlist, rename, and privacy toggles

### Phase 5 — Player

- [x] Now Playing panel (read-only state for all users)
- [x] Playback controls (start/resume, pause, next/prev, shuffle/repeat, volume)
- [x] Device picker; prompt to open Spotify app or connect Web Playback SDK
- [x] Web Playback SDK integration and fallback handling

### Phase 6 — Collections (Convex)

- [ ] Schema: `collections`, `collectionItems`
- [x] CRUD UI with forms (optimistic updates)
- [ ] Share/export collection to Spotify playlist

### Phase 7 — Rooms (Optional Stretch)

- [ ] Real-time collaborative queue using Convex
- [ ] Vote-to-skip and activity log

### Phase 8 — UX Polish & Presentation

- [ ] shadcn/ui components where needed (buttons, inputs, sliders, dialogs, toasts)
- [ ] TanStack Query Devtools in dev-only
- [ ] Presentation Mode (bigger fonts, hiding debug chrome)
- [ ] Remove demo routes once app is complete

### Navigation

- [x] Integrate shadcn sidebar and link to Home, Profile, Search

---

## TanStack Start Concepts to Demonstrate

- File-based routing and layouts; dynamic params; error boundaries
- Loaders with server-side data fetching and dehydration
- Server functions and `api.*` routes for secure Spotify calls
- TanStack Query caching, mutations, and invalidation
- Streaming SSR for fast TTFB
- Forms with optimistic updates (Convex)
- Devtools during the talk

---

## Env & Scopes

Required env (see `.env.example`):

- `SPOTIFY_CLIENT_ID`
- `APP_URL` (e.g., http://localhost:3000)
- `SPOTIFY_REDIRECT_URI` (e.g., https://<your-tunnel-domain>/auth/spotify/callback)
- `SPOTIFY_SCOPES` (space-delimited list)

Optional:

- `SPOTIFY_CLIENT_SECRET` (not required for PKCE; useful for server-to-server)
- `SESSION_SECRET` for signing/verifying session cookies

Recommended scopes:
`user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-modify-private playlist-modify-public user-read-recently-played`

---

## Presentation Notes (outline)

1. Router + loaders overview via Profile route
2. Query caching demo with Search (show devtools)
3. Mutations + optimistic UI with Playlists
4. Player: capability detection, controls, and SDK fallback
5. Convex-backed Collections + real-time updates (if Rooms included)
