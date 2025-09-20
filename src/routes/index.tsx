import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { getNewReleases, getRecentlyPlayed } from '../server/spotify-browse'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const releasesQ = useQuery({
    queryKey: ['home-releases'],
    queryFn: async () => {
      const r = await getNewReleases()
      if (!r.ok) return null
      return r.releases as any
    },
  })
  const recentQ = useQuery({
    queryKey: ['home-recent'],
    queryFn: async () => {
      const r = await getRecentlyPlayed()
      if (!r.ok) return null
      return r.items as any[]
    },
  })
  return (
    <div className="p-6 grid gap-10">
      <section>
        <h2 className="text-2xl font-semibold mb-4">New Releases</h2>
        {!releasesQ.data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {releasesQ.data?.albums?.items?.map((al: any) => (
            <Link
              key={al.id}
              to="/search"
              search={{ q: al.name, type: 'album' }}
            >
              <div className="grid gap-2">
                <img
                  src={al.images?.[0]?.url}
                  alt=""
                  className="rounded aspect-square object-cover w-full"
                />
                <div className="text-base font-medium truncate">{al.name}</div>
                <div className="text-sm opacity-80 truncate">
                  {al.artists?.map((a: any) => a.name).join(', ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recently Played</h2>
        {!recentQ.data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {(recentQ.data || []).map((it: any, idx: number) => (
            <Link
              key={idx}
              to="/search"
              search={{ q: it.track?.name, type: 'track' }}
            >
              <div className="grid gap-2">
                <img
                  src={it.track?.album?.images?.[0]?.url}
                  alt=""
                  className="rounded-full aspect-square object-cover w-full"
                />
                <div className="text-base font-medium truncate">
                  {it.track?.name}
                </div>
                <div className="text-sm opacity-80 truncate">
                  {it.track?.artists?.map((a: any) => a.name).join(', ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
