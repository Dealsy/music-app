import { createServerFileRoute } from '@tanstack/react-start/server'
import { getConvexClient } from '../server/convexClient'
import { api } from '../../convex/_generated/api'
import { getUserIdFromSession } from '../server/session'

export const ServerRoute = createServerFileRoute(
  '/api/collections/$id/items',
).methods({
  GET: async ({ params }) => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const convex = getConvexClient()
    // Optional: verify ownership
    const items = await convex.query(api.collectionItems.list, {
      collectionId: params.id as any,
    })
    return Response.json(items)
  },
  POST: async ({ params, request }) => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const body = await request.json()
    const convex = getConvexClient()
    const id = await convex.mutation(api.collectionItems.add, {
      collectionId: params.id as any,
      trackId: body.trackId,
      trackUri: body.trackUri,
    })
    return Response.json({ _id: id })
  },
  DELETE: async ({ params, request }) => {
    const userId = await getUserIdFromSession()
    if (!userId) return new Response('Unauthorized', { status: 401 })
    const body = await request.json().catch(() => null)
    const itemId = body?.itemId
    if (!itemId) return new Response('Missing itemId', { status: 400 })
    const convex = getConvexClient()
    await convex.mutation(api.collectionItems.remove, {
      itemId: itemId as any,
    })
    return new Response(null, { status: 204 })
  },
})
