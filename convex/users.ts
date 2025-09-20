import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const upsertBySpotifyId = mutation({
  args: {
    spotifyUserId: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('spotifyUserId', (q) =>
        q.eq('spotifyUserId', args.spotifyUserId),
      )
      .unique()
      .catch(() => null)

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        email: args.email,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      spotifyUserId: args.spotifyUserId,
      displayName: args.displayName,
      email: args.email,
    })
  },
})

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
      .unique()
    if (!session) return null
    return await ctx.db.get(session.userId)
  },
})
