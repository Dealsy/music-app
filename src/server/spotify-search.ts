import { createServerFn } from '@tanstack/react-start'
import { getAccessTokenFromSession } from './session'

type SearchBody = { q?: string; type?: string; limit?: number }

export const searchSpotify = createServerFn({ method: 'POST' })
  .validator((body: SearchBody) => body)
  .handler(async ({ data }) => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    const q = data?.q?.trim() || ''
    const type = data?.type || 'track,artist,album'
    const limit = data?.limit ?? 10
    if (!q) {
      return { ok: true as const, status: 200, results: null }
    }

    const url = new URL('https://api.spotify.com/v1/search')
    url.searchParams.set('q', q)
    url.searchParams.set('type', type)
    url.searchParams.set('limit', String(limit))

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status,
        message: 'Search failed',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, results: json }
  })
