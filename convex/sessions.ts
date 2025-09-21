import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const upsertSession = mutation({
  args: {
    userId: v.id('users'),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sessions')
      .withIndex('sessionId', (q) => q.eq('sessionId', args.sessionId))
      .unique()
      .catch(() => null)

    if (existing) return existing._id
    return await ctx.db.insert('sessions', args)
  },
})

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
      .unique()
  },
})

export const deleteBySessionId = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const row = await ctx.db
      .query('sessions')
      .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
      .unique()
      .catch(() => null)
    if (row) {
      await ctx.db.delete(row._id)
      return true
    }
    return false
  },
})
