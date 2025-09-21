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
import { unstable_ViewTransition as ViewTransition } from 'react'
import usePlayer from '@/hooks/use-player'
import usePlaylistControls from '@/hooks/use-playlist-controls'
import useInfinitePlaylistTracks from '@/hooks/use-infinite-playlist-tracks'

export const Route = createFileRoute('/playlists/$id')({
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6">
      <div className="text-2xl font-semibold mb-2">Playlist</div>
      <div className="grid gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
        ))}
      </div>
    </div>
  ),
  component: PlaylistDetail,
})

function PlaylistDetail() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const playlistQ = useQuery({
    queryKey: ['spotify-playlist', id],
    queryFn: async () => {
      const r = await (getPlaylist as any)({ data: { id } })
      if (!r.ok) return null as unknown as { playlist: any; tracks: any } | null
      return { playlist: r.playlist, tracks: r.tracks }
    },
  })
  // Ensure all hooks are called unconditionally and in the same order
  const collectionsQ = useQuery({
    queryKey: ['collections-list'],
    queryFn: async () => fetch('/api/collections').then((r) => r.json()),
  })
  // Use global player state from footer hook to avoid duplicate polling
  const player = usePlayer()
  const playerQ = player.stateQ as any

  const controls = usePlaylistControls({
    playlistId: id,
    playlistUri: playlistQ.data?.playlist?.uri,
    tracks: (playlistQ.data?.tracks?.items as any[]) ?? [],
  })

  const handlePlayPauseClick = controls.handlePlayPauseClick

  const { tracksQ, tracks, sentinelRef } = useInfinitePlaylistTracks(id)

  const formatMs = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  const removeMutation = useMutation({
    mutationFn: async (uri: string) => {
      const pid = playlistQ.data?.playlist?.id
      if (!pid) throw new Error('Playlist not ready')
      const r = await removeTrackFromPlaylist({
        data: { playlistId: pid, uri },
      })
      if (!r.ok) throw new Error(r.message)
      return r
    },
    onMutate: async (uri) => {
      // optimistic UI: remove locally
      const list = (playlistQ.data?.tracks?.items as any[]) ?? []
      const idx = list.findIndex((t: any) => t.track?.uri === uri)
      if (idx >= 0) list.splice(idx, 1)
      return { prevTracks: list }
    },
    onError: (_e, _v) => {
      // could revalidate
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['spotify-playlist', id] })
    },
  })

  if (!playlistQ.data) {
    return (
      <div className="p-6">
        <div className="grid gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const p = playlistQ.data.playlist
  return (
    <div className="p-6">
      <ViewTransition name={`playlist-${p.id}`}>
        <h1 className="text-2xl font-semibold mb-2">{p.name}</h1>
      </ViewTransition>
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
        <div ref={sentinelRef} />
        {tracksQ.isFetchingNextPage && (
          <div className="grid gap-2 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`more-${i}`} className="h-12 rounded" />
            ))}
          </div>
        )}
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
