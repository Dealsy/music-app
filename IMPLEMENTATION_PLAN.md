## Implementation Plan — Music App Enhancements

### Feature 1 — Auto-advance via Context Playback

- [x] Add `playContext` server function in `src/server/spotify-player.ts` to start context playback with offset
- [x] Update `src/routes/playlists.$id.tsx` to start playlist context with `offset.position` on play
- [x] Remove local near-end auto-advance effect from `playlists.$id.tsx`
- [ ] Footer: optionally listen for SDK end-of-track and call `nextTrack()` as fallback

### Feature 2 — Global Footer Player Controls

- [ ] Create `src/hooks/use-player.ts` encapsulating queries/mutations and optional SDK init
- [ ] Create `src/components/FooterPlayer.tsx` with play/pause, prev/next, progress, volume, device picker
- [ ] Mount `FooterPlayer` in `src/routes/__root.tsx` as a sticky footer
- [ ] Remove “Player” link from sidebar, de-emphasize `/player` route

### Feature 3 — Route Loading States

- [ ] Add skeletons to `src/routes/collections.index.tsx` while list loads
- [ ] Add skeletons to `src/routes/collections.$id.tsx` while items load
- [ ] Add pending/loading state to `src/routes/profile.tsx` similar to Home/Search

### Notes

- Spotify context playback handles next-track automatically; SDK fallback is for robustness.
- Keep components functional, TypeScript-first, and remove unused imports after refactors.
