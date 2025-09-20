import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const put = mutation({
  args: {
    state: v.string(),
    verifier: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('oauthStates')
      .withIndex('state', (q) => q.eq('state', args.state))
      .unique()
      .catch(() => null)
    if (existing) {
      await ctx.db.patch(existing._id, {
        verifier: args.verifier,
        expiresAt: args.expiresAt,
      })
      return existing._id
    }
    return await ctx.db.insert('oauthStates', args)
  },
})

export const consume = mutation({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const row = await ctx.db
      .query('oauthStates')
      .withIndex('state', (q) => q.eq('state', state))
      .unique()
      .catch(() => null)
    if (!row) return null
    await ctx.db.delete(row._id)
    return row
  },
})
