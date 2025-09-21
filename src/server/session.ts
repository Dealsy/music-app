import { getRequestHeader } from '@tanstack/react-start/server'
import { getConvexClient } from './convexClient'
import { api } from '../../convex/_generated/api'

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const header = cookieHeader || ''
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k, decodeURIComponent(v.join('='))]
    }),
  ) as Record<string, string>
}

export async function getAccessTokenFromSession(): Promise<{
  accessToken: string
  expiresAt: number
  userId: string
} | null> {
  const cookieHeader = getRequestHeader('cookie') as string | undefined
  const cookies = parseCookies(cookieHeader)
  const sessionId = cookies['app_session']
  if (!sessionId) return null

  const convex = getConvexClient()
  const session = await convex.query(api.sessions.getSession, { sessionId })
  if (!session) return null

  const tokens = await convex.query(api.spotifyTokens.getByUserId, {
    userId: session.userId,
  })
  if (!tokens) return null
  return {
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt,
    userId: session.userId,
  }
}

export async function getUserIdFromSession(): Promise<string | null> {
  const cookieHeader = getRequestHeader('cookie') as string | undefined
  const cookies = parseCookies(cookieHeader)
  const sessionId = cookies['app_session']
  if (!sessionId) return null

  const convex = getConvexClient()
  const session = await convex.query(api.sessions.getSession, { sessionId })
  return session ? (session.userId as unknown as string) : null
}

export async function isAuthenticated(): Promise<boolean> {
  const id = await getUserIdFromSession()
  return Boolean(id)
}
