import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  pausePlayback,
  startResumePlayback,
  playContext,
} from '@/server/spotify-player'
import usePlayer from '@/hooks/use-player'

type TrackLike = {
  uri?: string
  name?: string
  duration_ms?: number
  artists?: { name: string }[]
  album?: any
}

export default function usePlaylistControls(args: {
  playlistId: string
  playlistUri?: string
  tracks: { track?: TrackLike }[]
}) {
  const { playlistId, playlistUri, tracks } = args
  const qc = useQueryClient()
  const player = usePlayer()
  const playerQ = player.stateQ as any

  const pauseMut = useMutation({
    mutationFn: async () => {
      const r = await pausePlayback()
      if (!r.ok) throw new Error(r.message)
    },
    onMutate: async () => {
      const prev = qc.getQueryData(['player-state']) as any
      if (prev)
        qc.setQueryData(['player-state'], { ...prev, is_playing: false })
      return { prev }
    },
    onError: (_e, _v, ctx) =>
      ctx?.prev && qc.setQueryData(['player-state'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const resumeMut = useMutation({
    mutationFn: async () => {
      const r = await startResumePlayback()
      if (!r.ok) throw new Error(r.message)
    },
    onMutate: async () => {
      const prev = qc.getQueryData(['player-state']) as any
      if (prev) qc.setQueryData(['player-state'], { ...prev, is_playing: true })
      return { prev }
    },
    onError: (_e, _v, ctx) =>
      ctx?.prev && qc.setQueryData(['player-state'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  const playIndexMut = useMutation({
    mutationFn: async (index: number) => {
      const devices = (player.devicesQ.data as any[]) ?? []
      const active = devices.find((d) => d.is_active)
      if (!active) {
        const deviceId = player.sdkDeviceId || devices[0]?.id
        if (deviceId) {
          await player.transfer(deviceId)
          await new Promise((r) => setTimeout(r, 250))
        }
      }
      const r = await playContext({
        data: {
          contextUri: playlistUri ?? `spotify:playlist:${playlistId}`,
          offset: { position: index },
        },
      })
      if (!r.ok) throw new Error(r.message)
    },
    onMutate: async (index) => {
      const prev = qc.getQueryData(['player-state']) as any
      const t = tracks[index]?.track
      const optimistic = t
        ? {
            is_playing: true,
            item: {
              uri: t.uri,
              name: t.name,
              duration_ms: t.duration_ms,
              artists: t.artists,
              album: t.album,
            },
            progress_ms: 0,
          }
        : { is_playing: true }
      qc.setQueryData(
        ['player-state'],
        prev ? { ...prev, ...optimistic } : optimistic,
      )
      return { prev }
    },
    onError: (_e, _v, ctx) =>
      ctx?.prev && qc.setQueryData(['player-state'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['player-state'] }),
  })

  function handlePlayPauseClick(trackUri?: string, index?: number) {
    const isCurrent = playerQ.data?.item?.uri === trackUri
    const isPlaying = Boolean(playerQ.data?.is_playing)
    if (isCurrent && isPlaying) pauseMut.mutate()
    else if (isCurrent && !isPlaying) resumeMut.mutate()
    else if (typeof index === 'number') playIndexMut.mutate(index)
  }

  return {
    handlePlayPauseClick,
    pause: () => pauseMut.mutate(),
    resume: () => resumeMut.mutate(),
    playAt: (i: number) => playIndexMut.mutate(i),
  }
}
