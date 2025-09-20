import { createServerFileRoute } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'
import { getUserIdFromSession } from '../server/session'

export const ServerRoute = createServerFileRoute(
  '/api/collections/$id',
).methods({
  DELETE: async ({ params }) => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const convex = getConvexClient()
    await convex.mutation(api.collections.remove, {
      userId: userId as any,
      collectionId: params.id as any,
    })
    return new Response(null, { status: 204 })
  },
})
