import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { searchSpotify } from '../server/spotify-search'
import { Skeleton } from '@/components/ui/skeleton'
import usePlayer from '@/hooks/use-player'
import { listPlaylists, addTracksToPlaylist } from '../server/spotify-playlists'
import { Play } from 'lucide-react'

export const Route = createFileRoute('/search')({
  loader: async ({ location }) => {
    const q = (location.search as any)?.q as string | undefined
    const typeParam =
      ((location.search as any)?.type as string | undefined) || 'all'
    return { q: q ?? '', type: typeParam }
  },
  component: SearchPage,
})

function SearchPage() {
  const data = Route.useLoaderData() as {
    q: string
    type: 'all' | 'track' | 'artist' | 'album'
  }
  const [activeType, setActiveType] = useState<
    'all' | 'track' | 'artist' | 'album'
  >(data.type ?? 'all')
  const navigate = useNavigate()
  const routerIsPending = useRouterState({ select: (s) => s.isLoading })

  const form = useForm({
    defaultValues: { q: data.q ?? '' },
    onSubmit: ({ value }) => {
      navigate({ to: '/search', search: { q: value.q, type: activeType } })
    },
  })

  const {
    data: results,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['spotifySearch', data.q],
    enabled: (data.q ?? '').trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await searchSpotify({
        data: { q: data.q, type: 'track,artist,album' },
      })
      if (!r.ok) throw new Error('Search failed')
      return r.results as any
    },
  })

  const collectionsQ = useQuery({
    queryKey: ['collections-list'],
    queryFn: async () => fetch('/api/collections').then((r) => r.json()),
  })

  const searching = isLoading || (!results && (routerIsPending || isFetching))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Search</h1>

      <form
        className="flex gap-2 mb-2"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="q"
          validators={{
            onBlur: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return 'Query is required'
              }
              return undefined
            },
          }}
          children={(field) => (
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Search tracks, artists, albums"
              className="w-80"
            />
          )}
        />
        <Button type="submit" disabled={searching} aria-busy={searching}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <div className="flex gap-2 mb-4">
        {[
          { label: 'All', val: 'all' },
          { label: 'Tracks', val: 'track' },
          { label: 'Artists', val: 'artist' },
          { label: 'Albums', val: 'album' },
        ].map((tab) => (
          <Button
            key={tab.val}
            type="button"
            variant={activeType === (tab.val as any) ? 'default' : 'outline'}
            onClick={() => {
              setActiveType(tab.val as any)
              navigate({
                to: '/search',
                search: { q: data.q, type: tab.val as any },
              })
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && <div className="text-red-500 mb-2">{String(error)}</div>}

      {searching && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </div>
      )}

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(activeType === 'all' || activeType === 'track') && (
            <Results
              title="Tracks"
              items={results.tracks?.items}
              getKey={(t: any) => t.id}
              render={(t: any) => (
                <TrackRow track={t} collections={collectionsQ.data ?? []} />
              )}
            />
          )}
          {(activeType === 'all' || activeType === 'artist') && (
            <Results
              title="Artists"
              items={results.artists?.items}
              getKey={(a: any) => a.id}
              render={(a: any) => (
                <div className="p-3 border rounded">
                  <div className="font-medium">{a.name}</div>
                </div>
              )}
            />
          )}
          {(activeType === 'all' || activeType === 'album') && (
            <Results
              title="Albums"
              items={results.albums?.items}
              getKey={(al: any) => al.id}
              render={(al: any) => (
                <div className="p-3 border rounded">
                  <div className="font-medium">{al.name}</div>
                  <div className="text-sm opacity-80">
                    {al.artists?.map((a: any) => a.name).join(', ')}
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Results({
  title,
  items,
  getKey,
  render,
}: {
  title: string
  items: any[]
  getKey: (x: any) => string
  render: (x: any) => React.ReactNode
}) {
  if (!items?.length) return null
  return (
    <div>
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="grid gap-2">
        {items.map((x) => (
          <div key={getKey(x)}>{render(x)}</div>
        ))}
      </div>
    </div>
  )
}

function TrackRow({ track }: { track: any; collections: any[] }) {
  const [selectedId, setSelectedId] = useState<string>('')
  const player = usePlayer()
  const playlistsQ = useQuery({
    queryKey: ['spotify-playlists-min'],
    queryFn: async () => {
      const r = await listPlaylists()
      if (!r.ok) return { items: [] as any[] }
      return r.playlists as any
    },
    staleTime: 60_000,
  })
  return (
    <div className="p-3 border rounded flex items-center justify-between gap-3">
      <div>
        <div className="font-medium">{track.name}</div>
        <div className="text-sm opacity-80">
          {track.artists?.map((a: any) => a.name).join(', ')}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full w-8 h-8"
          onClick={() => player.play([track.uri])}
        >
          <Play />
        </Button>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!selectedId) return
            const r = await addTracksToPlaylist({
              data: { playlistId: selectedId, uris: [track.uri] },
            })
            if (!r.ok) alert('Failed to add to playlist')
          }}
          className="flex items-center gap-2"
        >
          <Select onValueChange={(v) => setSelectedId(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Add to Spotify playlist" />
            </SelectTrigger>
            <SelectContent>
              {(playlistsQ.data?.items ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!selectedId}
          >
            Add
          </Button>
        </form>
      </div>
    </div>
  )
}
