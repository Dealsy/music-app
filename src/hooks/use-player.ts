import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPlaybackState,
  getDevices,
  startResumePlayback,
  pausePlayback,
  nextTrack,
  previousTrack,
  setVolume,
  transferPlayback,
  getSdkToken,
  playUris,
} from '@/server/spotify-player'

type PlaybackState = {
  is_playing?: boolean
  item?: {
    uri?: string
    name?: string
    duration_ms?: number
    artists?: { name: string }[]
    album?: { images?: { url: string }[] }
  }
  progress_ms?: number
  device?: { volume_percent?: number }
}

export default function usePlayer() {
  const qc = useQueryClient()
  const [sdkDeviceId, setSdkDeviceId] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const lastEndedRef = useRef<string | null>(null)
  const getSdkPlayer = () => {
    if (typeof window === 'undefined') return null
    return (window as any).__sdkPlayer ?? null
  }

  // Token for SDK
  const tokenQ = useQuery({
    queryKey: ['sdk-token'],
    queryFn: async () => {
      const r = await getSdkToken()
      if (!r.ok) throw new Error(r.message)
      return r.accessToken as string
    },
  })

  // Lazy load SDK
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = 'spotify-sdk'
    if (!(window as any).Spotify && !document.getElementById(id)) {
      const s = document.createElement('script')
      s.id = id
      s.async = true
      s.src = 'https://sdk.scdn.co/spotify-player.js'
      document.body.appendChild(s)
    }
  }, [])

  // Init SDK
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as any
    if (!tokenQ.data) return
    function init() {
      if (!w.Spotify) return
      if (w.__sdkPlayer) return
      const player = new w.Spotify.Player({
        name: 'Web Player (App)',
        getOAuthToken: (cb: (t: string) => void) => cb(tokenQ.data!),
        volume: 0.5,
      })
      w.__sdkPlayer = player
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setSdkDeviceId(device_id)
        setSdkReady(true)
      })
      player.addListener('not_ready', () => {
        setSdkDeviceId(null)
        setSdkReady(false)
      })
      // Keep query cache fresh; avoid auto-advance logic that can fight Spotify
      player.addListener('player_state_changed', (state: any) => {
        try {
          if (!state) return
          const currentId: string | undefined =
            state.track_window?.current_track?.id
          if (currentId && lastEndedRef.current !== currentId) {
            lastEndedRef.current = null
          }
          qc.invalidateQueries({ queryKey: ['player-state'] })
        } catch {}
      })
      player.connect()
    }
    if (w.Spotify) init()
    else w.onSpotifyWebPlaybackSDKReady = init
    return () => {
      if (w.__sdkPlayer) {
        try {
          w.__sdkPlayer.disconnect()
        } catch {}
        w.__sdkPlayer = null
      }
      setSdkReady(false)
    }
  }, [tokenQ.data, qc])

  const devicesQ = useQuery<any[]>({
    queryKey: ['player-devices'],
    queryFn: async () => {
      const r = await getDevices()
      if (!r.ok) return []
      return r.devices?.devices ?? []
    },
    staleTime: 10_000,
  })

  const stateQ = useQuery<PlaybackState | null>({
    queryKey: ['player-state'],
    queryFn: async () => {
      const r = await getPlaybackState()
      if (!r.ok) return null
      return r.state as PlaybackState
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  // Manual polling only when playing on a non-SDK device
  const shouldPoll = useMemo(() => {
    const isPlaying = Boolean(stateQ.data?.is_playing)
    if (!isPlaying) return false
    const activeIdFromDevices = (devicesQ.data ?? []).find(
      (d: any) => d.is_active,
    )?.id as string | undefined
    const activeIdFromState = (stateQ.data as any)?.device?.id as
      | string
      | undefined
    const isSdkActive = Boolean(
      sdkDeviceId &&
        (activeIdFromDevices === sdkDeviceId ||
          activeIdFromState === sdkDeviceId),
    )
    return !isSdkActive
  }, [stateQ.data?.is_playing, stateQ.data?.device, devicesQ.data, sdkDeviceId])

  useEffect(() => {
    if (!shouldPoll) return
    const id = setInterval(() => {
      stateQ.refetch()
    }, 1000)
    return () => clearInterval(id)
  }, [shouldPoll, stateQ])

  const sdkActive = useMemo(() => {
    const devices = devicesQ.data ?? []
    const active = devices.find((d: any) => d.is_active)
    return Boolean(sdkDeviceId && active?.id === sdkDeviceId)
  }, [devicesQ.data, sdkDeviceId])

  // Ensure there is an active device before attempting playback
  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms))
  }

  async function waitForActiveDevice(maxWaitMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
      const r = await getDevices()
      const devices = (r.ok ? r.devices?.devices : []) ?? []
      if (devices.some((d: any) => d.is_active)) return
      await sleep(250)
    }
  }

  async function ensureActiveDevice(opts?: {
    autoplay?: boolean
  }): Promise<void> {
    const devices = devicesQ.data ?? []
    const active = devices.find((d: any) => d.is_active)
    if (active) return
    if (sdkDeviceId) {
      await transferPlayback({
        data: { deviceId: sdkDeviceId, play: !!opts?.autoplay },
      })
      await waitForActiveDevice()
      return
    }
    const first = devices.find((d: any) => d.id)
    if (first?.id) {
      await transferPlayback({
        data: { deviceId: first.id, play: !!opts?.autoplay },
      })
      await waitForActiveDevice()
    }
  }

  // Auto-transfer to SDK device when it becomes ready and no active device
  useEffect(() => {
    if (!sdkDeviceId) return
    const devices = devicesQ.data ?? []
    const active = devices.find((d: any) => d.is_active)
    if (!active) {
      transferPlayback({ data: { deviceId: sdkDeviceId, play: false } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkDeviceId])

  const playPauseMut = useMutation({
    mutationFn: async () => {
      const s = stateQ.data
      // Fast path: control via SDK if it's the active device
      if (sdkActive) {
        const p = getSdkPlayer()
        if (p) {
          if (s?.is_playing) await p.pause()
          else await p.resume()
          qc.setQueryData(['player-state'], (prev: any) =>
            prev ? { ...prev, is_playing: !prev.is_playing } : prev,
          )
          return
        }
      }
      if (s?.is_playing) {
        const r = await pausePlayback()
        if (!r.ok) throw new Error(r.message)
        return
      }
      await ensureActiveDevice({ autoplay: true })
      let start = await startResumePlayback()
      if (!start.ok) {
        await ensureActiveDevice()
        start = await startResumePlayback()
        if (!start.ok) throw new Error(start.message)
      }
    },
    onMutate: async () => {
      const prev = qc.getQueryData(['player-state']) as any
      if (prev) {
        qc.setQueryData(['player-state'], {
          ...prev,
          is_playing: !prev.is_playing,
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['player-state'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const nextMut = useMutation({
    mutationFn: async () => {
      if (sdkActive) {
        const p = getSdkPlayer()
        if (p) {
          await p.nextTrack()
          qc.setQueryData(['player-state'], (prev: any) =>
            prev ? { ...prev, progress_ms: 0, is_playing: true } : prev,
          )
          return
        }
      }
      await ensureActiveDevice({ autoplay: true })
      const r = await nextTrack()
      if (!r.ok) throw new Error(r.message)
      await startResumePlayback()
    },
    onMutate: async () => {
      const prev = qc.getQueryData(['player-state']) as any
      if (prev) {
        qc.setQueryData(['player-state'], {
          ...prev,
          is_playing: true,
          progress_ms: 0,
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['player-state'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })
  const prevMut = useMutation({
    mutationFn: async () => {
      if (sdkActive) {
        const p = getSdkPlayer()
        if (p) {
          await p.previousTrack()
          qc.setQueryData(['player-state'], (prev: any) =>
            prev ? { ...prev, progress_ms: 0, is_playing: true } : prev,
          )
          return
        }
      }
      await ensureActiveDevice({ autoplay: true })
      const r = await previousTrack()
      if (!r.ok) throw new Error(r.message)
      await startResumePlayback()
    },
    onMutate: async () => {
      const prev = qc.getQueryData(['player-state']) as any
      if (prev) {
        qc.setQueryData(['player-state'], {
          ...prev,
          is_playing: true,
          progress_ms: 0,
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['player-state'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })
  const volumeMut = useMutation({
    mutationFn: async (v: number) => {
      const r = await setVolume({ data: { volumePercent: v } })
      if (!r.ok) throw new Error(r.message)
    },
  })
  const transferMut = useMutation({
    mutationFn: async (deviceId: string) => {
      const r = await transferPlayback({ data: { deviceId, play: true } })
      if (!r.ok) throw new Error(r.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const current = stateQ.data?.item
  const artistNames = useMemo(
    () => (current?.artists ?? []).map((a) => a.name).join(', '),
    [current?.artists],
  )

  return {
    stateQ,
    devicesQ,
    sdkReady,
    sdkDeviceId,
    playPause: () => playPauseMut.mutate(),
    next: () => nextMut.mutate(),
    prev: () => prevMut.mutate(),
    setVolume: (v: number) => volumeMut.mutate(v),
    transfer: (id: string) => transferMut.mutate(id),
    current,
    artistNames,
    play: async (uris: string[], positionMs?: number) => {
      await ensureActiveDevice({ autoplay: true })
      await playUris({ data: { uris, positionMs } })
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  }
}
