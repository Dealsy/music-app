import { createServerFn } from '@tanstack/react-start'
import { getAccessTokenFromSession } from './session'

export const listPlaylists = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    const url = new URL('https://api.spotify.com/v1/me/playlists')
    url.searchParams.set('limit', '50')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status,
        message: 'Failed to load playlists',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, playlists: json }
  },
)

export const getPlaylist = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data?: { id: string } }) => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    const id = data?.id
    if (!id) return { ok: false as const, status: 400, message: 'Missing id' }

    const base = `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}`
    const [playlistRes, tracksRes] = await Promise.all([
      fetch(base, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }),
      fetch(`${base}/tracks?limit=100`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }),
    ])
    if (!playlistRes.ok) {
      return {
        ok: false as const,
        status: playlistRes.status,
        message: 'Failed to load playlist',
      }
    }
    const playlist = await playlistRes.json()
    const tracks = tracksRes.ok ? await tracksRes.json() : null
    return { ok: true as const, status: 200, playlist, tracks }
  },
)

export const addTracksToPlaylist = createServerFn({ method: 'POST' })
  .validator((body: { playlistId: string; uris: string[] }) => body)
  .handler(async ({ data }) => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    const { playlistId, uris } = data
    if (!playlistId || !uris?.length) {
      return { ok: false as const, status: 400, message: 'Missing data' }
    }
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris }),
      },
    )
    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status,
        message: 'Failed to add tracks',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, snapshotId: json.snapshot_id }
  })

export const removeTrackFromPlaylist = createServerFn({ method: 'POST' })
  .validator((body: { playlistId: string; uri: string }) => body)
  .handler(async ({ data }) => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    const { playlistId, uri } = data
    if (!playlistId || !uri) {
      return { ok: false as const, status: 400, message: 'Missing data' }
    }
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tracks: [{ uri }] }),
      },
    )
    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status,
        message: 'Failed to remove track',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, snapshotId: json.snapshot_id }
  })
