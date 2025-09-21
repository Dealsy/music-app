import { createFileRoute, Link } from '@tanstack/react-router'
import { listPlaylists } from '../server/spotify-playlists'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { unstable_ViewTransition as ViewTransition } from 'react'

export const Route = createFileRoute('/playlists/')({
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Playlists</h1>
      <div className="grid gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded" />
        ))}
      </div>
    </div>
  ),
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const playlistsQ = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const r = await listPlaylists()
      if (!r.ok) return null as unknown as { items: any[] } | null
      return r.playlists as {
        items: { id: string; name: string; tracks: { total: number } }[]
      }
    },
  })

  if (!playlistsQ.data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Your Playlists</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Playlists</h1>
      <div className="grid gap-3">
        {playlistsQ.data.items?.map((p) => (
          <ViewTransition name={`playlist-${p.id}`}>
            <Link
              key={p.id}
              to="/playlists/$id"
              params={{ id: p.id }}
              className="p-3 border rounded hover:bg-black/5"
            >
              <div className="font-medium">{p.name}</div>

              <div className="text-sm opacity-80">
                {p.tracks?.total ?? 0} tracks
              </div>
            </Link>
          </ViewTransition>
        ))}
      </div>
    </div>
  )
}
