import { createFileRoute, Link } from '@tanstack/react-router'
import { listPlaylists } from '../server/spotify-playlists'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/playlists/')({
  loader: async () => {
    const r = await listPlaylists()
    if (!r.ok) return { playlists: null, error: r.message }
    return { playlists: r.playlists }
  },
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const data = Route.useLoaderData() as any

  if (!data?.playlists) {
    return (
      <div className="p-6">
        {data?.error ? (
          <div className="text-red-500">{data.error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Playlists</h1>
      <div className="grid gap-3">
        {data.playlists.items?.map((p: any) => (
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
        ))}
      </div>
    </div>
  )
}
