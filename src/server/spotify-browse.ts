import { createServerFn } from '@tanstack/react-start'
import { getAccessTokenFromSession } from './session'

export const getNewReleases = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAccessTokenFromSession()
    if (!session)
      return { ok: false as const, status: 401, message: 'Unauthorized' }
    const res = await fetch(
      'https://api.spotify.com/v1/browse/new-releases?limit=12',
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      },
    )
    if (!res.ok)
      return { ok: false as const, status: res.status, message: 'Failed' }
    return { ok: true as const, releases: await res.json() }
  },
)

export const getRecentlyPlayed = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAccessTokenFromSession()
    if (!session)
      return { ok: false as const, status: 401, message: 'Unauthorized' }
    const res = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=12',
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      },
    )
    if (!res.ok)
      return { ok: false as const, status: res.status, message: 'Failed' }
    const json = await res.json()
    // normalize to items array of { track }
    return { ok: true as const, items: json?.items ?? [] }
  },
)
