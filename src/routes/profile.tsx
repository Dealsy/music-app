import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type SpotifyMe = {
  display_name: string
  email?: string
  id: string
}

type ProfileData =
  | { authenticated: false }
  | { authenticated: true; me: SpotifyMe }

function getSessionIdFromCookieHeader(cookieHeader?: string): string | null {
  const header = cookieHeader || ''
  const cookies = Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k, decodeURIComponent(v.join('='))]
    }),
  ) as Record<string, string>
  return cookies['app_session'] ?? null
}

export const getProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProfileData> => {
    const cookieHeader = getRequestHeader('cookie') as string | undefined
    const sessionId = getSessionIdFromCookieHeader(cookieHeader)
    if (!sessionId) return { authenticated: false }

    const convex = getConvexClient()
    const session = await convex.query(api.sessions.getSession, {
      sessionId,
    })
    if (!session) return { authenticated: false }

    const tokens = await convex.query(api.spotifyTokens.getByUserId, {
      userId: session.userId,
    })
    if (!tokens) return { authenticated: false }

    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
    if (!res.ok) return { authenticated: false }
    const me = (await res.json()) as SpotifyMe
    return { authenticated: true, me }
  },
)

export const Route = createFileRoute('/profile')({
  loader: async (): Promise<ProfileData> => await getProfile(),
  component: Profile,
})

function Profile() {
  const data = Route.useLoaderData()

  const isLoading = useRouterState({ select: (s) => s.isLoading })

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Profile</h1>
        <div className="flex items-center gap-6 mb-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="grid gap-2 w-full max-w-md">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Separator className="my-6" />
        <div className="grid gap-4 max-w-lg">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/4" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    )
  }

  if (!data.authenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="opacity-80 mb-4">You are not signed in.</p>
        <Button asChild>
          <a href="/auth/spotify">Login with Spotify</a>
        </Button>
      </div>
    )
  }

  const me = data.me
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>
      <div className="flex items-center gap-6 mb-6">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold uppercase">
          {me.display_name?.slice(0, 2) || 'SP'}
        </div>
        <div>
          <div className="text-xl font-semibold">{me.display_name}</div>
          <div className="text-sm opacity-80">{me.email || 'No email'}</div>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="space-y-3">
        <div>
          <span className="font-medium">Display Name:</span> {me.display_name}
        </div>
        <div>
          <span className="font-medium">Email:</span> {me.email || '—'}
        </div>
        <div>
          <span className="font-medium">Spotify ID:</span> {me.id}
        </div>
      </div>
    </div>
  )
}
