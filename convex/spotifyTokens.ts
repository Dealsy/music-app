import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const setTokens = mutation({
  args: {
    userId: v.id('users'),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('spotifyTokens')
      .withIndex('userId', (q) => q.eq('userId', args.userId))
      .unique()
      .catch(() => null)

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        scope: args.scope,
        expiresAt: args.expiresAt,
      })
      return existing._id
    }

    return await ctx.db.insert('spotifyTokens', args)
  },
})

export const getByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('spotifyTokens')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .unique()
  },
})
