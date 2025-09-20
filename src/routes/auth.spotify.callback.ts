import { createServerFileRoute } from '@tanstack/react-start/server'
import { createCookie, exchangeCodeForToken } from '../server/spotify'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'

export const ServerRoute = createServerFileRoute(
  '/auth/spotify/callback',
).methods({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(`Spotify auth error: ${error}`, { status: 400 })
    }

    if (!code || !state) {
      return new Response('Missing code/state', { status: 400 })
    }

    // Look up PKCE verifier via Convex-stored state (cross-host safe)
    const conv = getConvexClient()
    const consumed = await conv.mutation(api.oauth.consume, { state })
    const verifier = consumed?.verifier
    if (!verifier)
      return new Response('Invalid or expired auth session', { status: 400 })

    const clientId = process.env.SPOTIFY_CLIENT_ID!
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!
    if (!clientId || !redirectUri) {
      return new Response('Missing Spotify env configuration', { status: 500 })
    }

    const token = await exchangeCodeForToken({
      clientId,
      redirectUri,
      code,
      codeVerifier: verifier,
    })

    if ('error' in token) {
      return new Response(
        `Token exchange failed: ${token.error_description || token.error}`,
        {
          status: 400,
        },
      )
    }

    // Fetch Spotify profile
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (!meRes.ok) {
      return new Response('Failed to fetch Spotify profile', { status: 400 })
    }
    const me = (await meRes.json()) as {
      id: string
      display_name?: string
      email?: string
    }

    // Persist in Convex
    const convex = getConvexClient()
    const userId = await convex.mutation(api.users.upsertBySpotifyId, {
      spotifyUserId: me.id,
      displayName: me.display_name,
      email: me.email,
    })
    const sessionId = crypto.randomUUID()
    await convex.mutation(api.sessions.upsertSession, {
      userId,
      sessionId,
    })
    await convex.mutation(api.spotifyTokens.setTokens, {
      userId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scope: token.scope,
      expiresAt: Date.now() + token.expires_in * 1000,
    })

    // Clear temporary cookies and redirect to set session cookie on first-party host
    const clearCookie = (name: string, secure: boolean) =>
      `${name}=; Path=/; Max-Age=0; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax`

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const secure = appUrl.startsWith('https://')

    // Redirect to first-party host to set the app_session cookie there
    const redirectTo = new URL('/auth/session', appUrl)
    redirectTo.searchParams.set('sid', sessionId)

    const headers = new Headers({ Location: redirectTo.toString() })
    headers.append('Set-Cookie', clearCookie('sp_state', secure))
    headers.append('Set-Cookie', clearCookie('sp_verifier', secure))
    return new Response(null, { status: 302, headers })
  },
})
