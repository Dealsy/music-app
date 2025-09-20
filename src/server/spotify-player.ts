import { createServerFn } from '@tanstack/react-start'
import { getAccessTokenFromSession } from './session'

async function authFetch(path: string, init?: RequestInit) {
  const session = await getAccessTokenFromSession()
  if (!session) {
    return { ok: false as const, status: 401, message: 'Not authenticated' }
  }
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  return { res }
}

export const getPlaybackState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { res } = await authFetch('/me/player')
    if (!res || !res.ok) {
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Failed to get playback state',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, state: json }
  },
)

export const getDevices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { res } = await authFetch('/me/player/devices')
    if (!res || !res.ok) {
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Failed to get devices',
      }
    }
    const json = await res.json()
    return { ok: true as const, status: 200, devices: json }
  },
)

export const transferPlayback = createServerFn({ method: 'POST' })
  .validator((body: { deviceId: string; play?: boolean }) => body)
  .handler(async ({ data }) => {
    const { res } = await authFetch('/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [data.deviceId],
        play: data.play ?? true,
      }),
    })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Transfer failed',
      }
    return { ok: true as const, status: 204 }
  })

export const startResumePlayback = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { res } = await authFetch('/me/player/play', { method: 'PUT' })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Play failed',
      }
    return { ok: true as const, status: 204 }
  },
)

export const pausePlayback = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { res } = await authFetch('/me/player/pause', { method: 'PUT' })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Pause failed',
      }
    return { ok: true as const, status: 204 }
  },
)

export const nextTrack = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { res } = await authFetch('/me/player/next', { method: 'POST' })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Next failed',
      }
    return { ok: true as const, status: 204 }
  },
)

export const previousTrack = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { res } = await authFetch('/me/player/previous', { method: 'POST' })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Prev failed',
      }
    return { ok: true as const, status: 204 }
  },
)

export const setShuffle = createServerFn({ method: 'POST' })
  .validator((body: { state: boolean }) => body)
  .handler(async ({ data }) => {
    const { res } = await authFetch(
      `/me/player/shuffle?state=${data.state ? 'true' : 'false'}`,
      {
        method: 'PUT',
      },
    )
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Shuffle failed',
      }
    return { ok: true as const, status: 204 }
  })

export const setRepeat = createServerFn({ method: 'POST' })
  .validator((body: { state: 'off' | 'track' | 'context' }) => body)
  .handler(async ({ data }) => {
    const { res } = await authFetch(`/me/player/repeat?state=${data.state}`, {
      method: 'PUT',
    })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Repeat failed',
      }
    return { ok: true as const, status: 204 }
  })

export const setVolume = createServerFn({ method: 'POST' })
  .validator((body: { volumePercent: number }) => body)
  .handler(async ({ data }) => {
    const vol = Math.max(0, Math.min(100, Math.round(data.volumePercent)))
    const { res } = await authFetch(`/me/player/volume?volume_percent=${vol}`, {
      method: 'PUT',
    })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Volume failed',
      }
    return { ok: true as const, status: 204 }
  })

export const playUris = createServerFn({ method: 'POST' })
  .validator((body: { uris: string[]; positionMs?: number }) => body)
  .handler(async ({ data }) => {
    const { res } = await authFetch('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ uris: data.uris, position_ms: data.positionMs }),
    })
    if (!res || !res.ok)
      return {
        ok: false as const,
        status: res?.status ?? 500,
        message: 'Play request failed',
      }
    return { ok: true as const, status: 204 }
  })

export const getSdkToken = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAccessTokenFromSession()
    if (!session) {
      return { ok: false as const, status: 401, message: 'Not authenticated' }
    }
    return { ok: true as const, status: 200, accessToken: session.accessToken }
  },
)
