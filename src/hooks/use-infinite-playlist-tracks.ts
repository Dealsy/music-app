import { useEffect, useMemo, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

export default function useInfinitePlaylistTracks(playlistId: string) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const tracksQ = useInfiniteQuery({
    queryKey: ['spotify-playlist-tracks', playlistId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const mod = await import('@/server/spotify-playlists')
      const r = await mod.getPlaylistTracksPage({
        data: { id: playlistId, offset: pageParam as number, limit: 100 },
      })
      return r
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.ok) return undefined as unknown as number | undefined
      const nextOffset = (lastPage.offset ?? 0) + (lastPage.limit ?? 100)
      const total = lastPage.total ?? Number.POSITIVE_INFINITY
      return nextOffset < total ? nextOffset : undefined
    },
  }) as any

  const tracks = useMemo(
    () =>
      (tracksQ.data?.pages ?? [])
        .flatMap((p: any) => (p?.ok ? p.items : []))
        .filter(Boolean),
    [tracksQ.data?.pages],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (
          first.isIntersecting &&
          tracksQ.hasNextPage &&
          !tracksQ.isFetchingNextPage
        ) {
          tracksQ.fetchNextPage()
        }
      },
      { rootMargin: '200px 0px 200px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tracksQ.hasNextPage, tracksQ.isFetchingNextPage, tracksQ.fetchNextPage])

  return { tracksQ, tracks, sentinelRef }
}
