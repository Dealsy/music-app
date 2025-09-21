import { createFileRoute } from '@tanstack/react-router'
import {
  getPlaylist,
  removeTrackFromPlaylist,
} from '../server/spotify-playlists'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import {
  playContext,
  pausePlayback,
  startResumePlayback,
} from '../server/spotify-player'
import usePlayer from '@/hooks/use-player'
import { transferPlayback } from '../server/spotify-player'

export const Route = createFileRoute('/playlists/$id')({
  loader: async ({ params }) => {
    const r = await (getPlaylist as any)({ data: { id: params.id as string } })
    if (!r.ok) return { playlist: null, tracks: null, error: r.message }
    return { playlist: r.playlist, tracks: r.tracks }
  },
  component: PlaylistDetail,
})

function PlaylistDetail() {
  const data = Route.useLoaderData() as any
  const qc = useQueryClient()

  if (!data?.playlist) {
    return (
      <div className="p-6">
        {data?.error ? (
          <div className="text-red-500">{data.error}</div>
        ) : (
          <div className="grid gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </div>
        )}
      </div>
    )
  }

  const p = data.playlist
  const tracks = data.tracks?.items ?? []
  const collectionsQ = useQuery({
    queryKey: ['collections-list'],
    queryFn: async () => fetch('/api/collections').then((r) => r.json()),
  })
  // Use global player state from footer hook to avoid duplicate polling
  const player = usePlayer()
  const playerQ = player.stateQ as any
  const handlePlayPauseClick = (trackUri?: string, index?: number) => {
    const isCurrent = playerQ.data?.item?.uri === trackUri
    const isPlaying = Boolean(playerQ.data?.is_playing)
    if (isCurrent && isPlaying) {
      pauseMut.mutate()
    } else if (isCurrent && !isPlaying) {
      resumeMut.mutate()
    } else if (typeof index === 'number') {
      playMut.mutate(index)
    }
  }
  const pauseMut = useMutation({
    mutationFn: async () => {
      const r = await pausePlayback()
      if (!r.ok) throw new Error(r.message)
      return r
    },
    onSettled: () => playerQ.refetch(),
  })
  const resumeMut = useMutation({
    mutationFn: async () => {
      const r = await startResumePlayback()
      if (!r.ok) throw new Error(r.message)
      return r
    },
    onSettled: () => playerQ.refetch(),
  })
  const playMut = useMutation({
    mutationFn: async (index: number) => {
      // Ensure there is an active device before starting context playback
      const devices = (player.devicesQ.data as any[]) ?? []
      const active = devices.find((d) => d.is_active)
      if (!active) {
        const deviceId = player.sdkDeviceId || devices[0]?.id
        if (deviceId) {
          await transferPlayback({ data: { deviceId, play: false } })
        }
      }
      const r = await playContext({
        data: {
          contextUri:
            data.playlist?.uri ?? `spotify:playlist:${data.playlist.id}`,
          offset: { position: index },
        },
      })
      if (!r.ok) throw new Error(r.message)
      return r
    },
    onSettled: () => playerQ.refetch(),
  })

  const formatMs = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  const removeMutation = useMutation({
    mutationFn: async (uri: string) => {
      const r = await removeTrackFromPlaylist({
        data: { playlistId: data.playlist.id, uri },
      })
      if (!r.ok) throw new Error(r.message)
      return r
    },
    onMutate: async (uri) => {
      // optimistic UI: remove locally
      const prev = { ...data }
      const idx = tracks.findIndex((t: any) => t.track?.uri === uri)
      if (idx >= 0) tracks.splice(idx, 1)
      return { prev }
    },
    onError: (_e, _v) => {
      // could revalidate
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['spotify-playlist', data.playlist.id] })
    },
  })
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">{p.name}</h1>
      <div className="text-sm opacity-80 mb-4">{p.description}</div>
      <div className="grid gap-2">
        {tracks.map((t: any, idx: number) => {
          const trackUri = t.track?.uri as string | undefined
          const isCurrent = playerQ.data?.item?.uri === trackUri
          const isPlaying = Boolean(playerQ.data?.is_playing)
          const coverUrl = t.track?.album?.images?.[2]?.url as
            | string
            | undefined
          const artistNames = (t.track?.artists ?? [])
            .map((a: any) => a.name)
            .join(', ')
          const trackName = t.track?.name as string | undefined
          return (
            <div
              key={t.track?.id ?? idx}
              className="p-3 border rounded flex items-center gap-3"
            >
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant={isCurrent && isPlaying ? 'default' : 'outline'}
                  className="rounded-full w-8 h-8"
                  onClick={() => handlePlayPauseClick(trackUri, idx)}
                  title="Play/Pause"
                >
                  {isCurrent && isPlaying ? '❚❚' : '▶'}
                </Button>
                {coverUrl && (
                  <img src={coverUrl} alt="" className="w-10 h-10 rounded" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{trackName}</div>
                  <div className="text-sm opacity-80 truncate">
                    {artistNames}
                  </div>
                  {isCurrent && (
                    <div className="mt-1 flex items-center gap-3">
                      <div className="w-48 h-1 rounded bg-muted/40">
                        <div
                          className="h-1 rounded bg-primary transition-[width] duration-500"
                          style={{
                            width: t.track?.duration_ms
                              ? `${Math.min(
                                  100,
                                  Math.round(
                                    (Math.max(
                                      0,
                                      playerQ.data?.progress_ms ?? 0,
                                    ) /
                                      t.track.duration_ms) *
                                      100,
                                  ),
                                )}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <div className="text-xs tabular-nums opacity-80">
                        {formatMs(Math.max(0, playerQ.data?.progress_ms ?? 0))}{' '}
                        / {formatMs(t.track?.duration_ms ?? 0)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <AddToCollection
                  trackId={t.track?.id}
                  trackUri={trackUri as string}
                  collections={collectionsQ.data ?? []}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => trackUri && removeMutation.mutate(trackUri)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddToCollection({
  trackId,
  trackUri,
  collections,
}: {
  trackId: string
  trackUri: string
  collections: any[]
}) {
  const [selectedId, setSelectedId] = useState('')
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!selectedId || !trackId || !trackUri) return
        await fetch(`/api/collections/${selectedId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId, trackUri }),
        })
      }}
    >
      <Select onValueChange={(v) => setSelectedId(v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Add to collection" />
        </SelectTrigger>
        <SelectContent>
          {(collections || []).map((c: any) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" type="submit" disabled={!selectedId}>
        Add
      </Button>
    </form>
  )
}
