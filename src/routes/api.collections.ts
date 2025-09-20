import { createServerFileRoute } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'
import { getUserIdFromSession } from '../server/session'

export const ServerRoute = createServerFileRoute('/api/collections').methods({
  GET: async () => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const convex = getConvexClient()
    const list = await convex.query(api.collections.listByUser, {
      userId: userId as any,
    })
    return Response.json(list)
  },
  POST: async ({ request }) => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const { name } = await request.json()
    const convex = getConvexClient()
    const id = await convex.mutation(api.collections.create, {
      userId: userId as any,
      name,
    })
    return Response.json({ _id: id, name })
  },
})
