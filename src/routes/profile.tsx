import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'

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
  async () => {
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
    const me = await res.json()
    return { authenticated: true, me }
  },
)

export const Route = createFileRoute('/profile')({
  loader: async () => await getProfile(),
  component: Profile,
})

function Profile() {
  const data = Route.useLoaderData() as
    | { authenticated: false }
    | { authenticated: true; me: any }

  if (!('authenticated' in data) || data.authenticated === false) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p>You are not signed in.</p>
        <a className="text-blue-500 underline" href="/auth/spotify">
          Login with Spotify
        </a>
      </div>
    )
  }

  const me = data.me
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>
      <div className="space-y-2">
        <div>
          <span className="font-medium">Display Name:</span> {me.display_name}
        </div>
        <div>
          <span className="font-medium">Email:</span> {me.email}
        </div>
        <div>
          <span className="font-medium">Spotify ID:</span> {me.id}
        </div>
      </div>
    </div>
  )
}
