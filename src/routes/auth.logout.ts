import { createServerFileRoute } from '@tanstack/react-start/server'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'

export const ServerRoute = createServerFileRoute('/auth/logout').methods({
  GET: async () => {
    const cookieHeader = getRequestHeader('cookie') as string | undefined
    const cookies = Object.fromEntries(
      (cookieHeader || '')
        .split(';')
        .filter(Boolean)
        .map((c) => {
          const [k, ...v] = c.trim().split('=')
          return [k, decodeURIComponent(v.join('='))]
        }),
    ) as Record<string, string>

    const sessionId = cookies['app_session']

    if (sessionId) {
      const convex = getConvexClient()
      await convex.mutation(api.sessions.deleteBySessionId, { sessionId })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const secure = appUrl.startsWith('https://')

    const clearCookie = (name: string, secureFlag: boolean) =>
      `${name}=; Path=/; Max-Age=0; HttpOnly; ${secureFlag ? 'Secure; ' : ''}SameSite=Lax`

    const headers = new Headers({ Location: '/profile' })
    headers.append('Set-Cookie', clearCookie('app_session', secure))
    return new Response(null, { status: 302, headers })
  },
})
