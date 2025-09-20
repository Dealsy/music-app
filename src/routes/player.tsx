import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPlaybackState,
  getDevices,
  startResumePlayback,
  pausePlayback,
  nextTrack,
  previousTrack,
  setShuffle,
  setRepeat,
  setVolume,
  transferPlayback,
  getSdkToken,
} from '../server/spotify-player'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

export const Route = createFileRoute('/player')({
  component: PlayerPage,
})

function PlayerPage() {
  const qc = useQueryClient()
  const [sdkDeviceId, setSdkDeviceId] = useState<string | null>(null)
  // Web Playback SDK init (client-side only)
  const tokenQ = useQuery({
    queryKey: ['sdk-token'],
    queryFn: async () => {
      const r = await getSdkToken()
      if (!r.ok) throw new Error(r.message)
      return r.accessToken as string
    },
  })
  // Lazy load SDK script
  if (typeof window !== 'undefined' && !(window as any).Spotify) {
    const id = 'spotify-sdk'
    if (!document.getElementById(id)) {
      const s = document.createElement('script')
      s.id = id
      s.async = true
      s.src = 'https://sdk.scdn.co/spotify-player.js'
      document.body.appendChild(s)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as any
    if (!tokenQ.data) return
    function init() {
      if (!w.Spotify) return
      if (w.__sdkPlayer) return
      const player = new w.Spotify.Player({
        name: 'Web Player (TanStack Start)',
        getOAuthToken: (cb: (t: string) => void) => cb(tokenQ.data!),
        volume: 0.5,
      })
      w.__sdkPlayer = player
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setSdkDeviceId(device_id)
      })
      player.addListener('not_ready', () => {
        setSdkDeviceId(null)
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
    }
  }, [tokenQ.data])
  const stateQ = useQuery({
    queryKey: ['player-state'],
    queryFn: async () => {
      const r = await getPlaybackState()
      if (!r.ok) throw new Error(r.message)
      return r.state as any
    },
    refetchInterval: 2000,
  })
  const devicesQ = useQuery({
    queryKey: ['player-devices'],
    queryFn: async () => {
      const r = await getDevices()
      if (!r.ok) throw new Error(r.message)
      return r.devices?.devices ?? []
    },
    staleTime: 10_000,
  })

  const playMut = useMutation({
    mutationFn: async () => {
      const s = stateQ.data
      if (s?.is_playing) {
        const r = await pausePlayback()
        if (!r.ok) throw new Error(r.message)
      } else {
        const r = await startResumePlayback()
        if (!r.ok) throw new Error(r.message)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const nextMut = useMutation({
    mutationFn: async () => {
      const r = await nextTrack()
      if (!r.ok) throw new Error(r.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })
  const prevMut = useMutation({
    mutationFn: async () => {
      const r = await previousTrack()
      if (!r.ok) throw new Error(r.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const shuffleMut = useMutation({
    mutationFn: async (state: boolean) => {
      const r = await setShuffle({ data: { state } })
      if (!r.ok) throw new Error(r.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })
  const repeatMut = useMutation({
    mutationFn: async (state: 'off' | 'track' | 'context') => {
      const r = await setRepeat({ data: { state } })
      if (!r.ok) throw new Error(r.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })
  const volumeMut = useMutation({
    mutationFn: async (v: number[]) => {
      const r = await setVolume({ data: { volumePercent: v[0] ?? 50 } })
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

  const s = stateQ.data
  const current = s?.item

  return (
    <div className="p-6 grid gap-4">
      <h1 className="text-2xl font-semibold">Player</h1>

      <div className="p-4 border rounded grid gap-2">
        <div className="font-medium">{current?.name ?? 'Nothing playing'}</div>
        <div className="text-sm opacity-80">
          {current?.artists?.map((a: any) => a.name).join(', ')}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button onClick={() => prevMut.mutate()} variant="outline" size="sm">
            Prev
          </Button>
          <Button onClick={() => playMut.mutate()} size="sm">
            {s?.is_playing ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={() => nextMut.mutate()} variant="outline" size="sm">
            Next
          </Button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm">Volume</label>
          <Slider
            defaultValue={[s?.device?.volume_percent ?? 50]}
            max={100}
            step={1}
            className="w-64"
            onValueCommit={(v) => volumeMut.mutate(v)}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            variant={s?.shuffle_state ? 'default' : 'outline'}
            onClick={() => shuffleMut.mutate(!s?.shuffle_state)}
          >
            Shuffle
          </Button>
          <Button
            size="sm"
            variant={s?.repeat_state !== 'off' ? 'default' : 'outline'}
            onClick={() =>
              repeatMut.mutate(s?.repeat_state === 'off' ? 'context' : 'off')
            }
          >
            Repeat
          </Button>
        </div>
      </div>

      <div className="p-4 border rounded grid gap-2">
        <div className="font-medium">Devices</div>
        {sdkDeviceId && (
          <div className="text-sm opacity-80">Browser player ready</div>
        )}
        <div className="flex flex-wrap gap-2">
          {sdkDeviceId && (
            <Button size="sm" onClick={() => transferMut.mutate(sdkDeviceId)}>
              Use Browser Player
            </Button>
          )}
          {devicesQ.data?.map((d: any) => (
            <Button
              key={d.id}
              size="sm"
              variant={d.is_active ? 'default' : 'outline'}
              onClick={() => d.id && transferMut.mutate(d.id)}
            >
              {d.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
