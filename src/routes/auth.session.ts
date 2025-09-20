import { createServerFileRoute } from '@tanstack/react-start/server'
import { createCookie } from '../server/spotify'

export const ServerRoute = createServerFileRoute('/auth/session').methods({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const sid = url.searchParams.get('sid')
    if (!sid) return new Response('Missing sid', { status: 400 })

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const secure = appUrl.startsWith('https://')

    const headers = new Headers({ Location: '/' })
    headers.append(
      'Set-Cookie',
      createCookie({
        name: 'app_session',
        value: sid,
        maxAgeSeconds: 60 * 60 * 24 * 7,
        secure,
        sameSite: 'Lax',
      }),
    )
    return new Response(null, { status: 302, headers })
  },
})
