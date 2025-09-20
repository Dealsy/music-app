import { createServerFileRoute } from '@tanstack/react-start/server'
import { buildAuthorizeUrl, generatePkcePair } from '../server/spotify'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'

export const ServerRoute = createServerFileRoute('/auth/spotify').methods({
  GET: async () => {
    const clientId = process.env.SPOTIFY_CLIENT_ID!
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!
    const scope =
      process.env.SPOTIFY_SCOPES ||
      'user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-modify-private playlist-modify-public user-read-recently-played'

    if (!clientId || !redirectUri) {
      return new Response('Missing Spotify env configuration', { status: 500 })
    }

    const { verifier, challenge } = generatePkcePair()
    const state = crypto.randomUUID()

    const authorizeUrl = buildAuthorizeUrl({
      clientId,
      redirectUri,
      scope,
      state,
      codeChallenge: challenge,
    })

    // Store verifier/state in Convex instead of cookies
    const convex = getConvexClient()
    await convex.mutation(api.oauth.put, {
      state,
      verifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })

    return new Response(null, {
      status: 302,
      headers: new Headers({ Location: authorizeUrl }),
    })
  },
})
