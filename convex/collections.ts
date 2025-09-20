import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('collections')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect()
  },
})

export const create = mutation({
  args: { userId: v.id('users'), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    return await ctx.db.insert('collections', { userId, name })
  },
})

export const remove = mutation({
  args: { userId: v.id('users'), collectionId: v.id('collections') },
  handler: async (ctx, { userId, collectionId }) => {
    const c = await ctx.db.get(collectionId)
    if (!c || c.userId !== userId) return null
    // delete items
    const items = await ctx.db
      .query('collectionItems')
      .withIndex('collectionId', (q) => q.eq('collectionId', collectionId))
      .collect()
    await Promise.all(items.map((i) => ctx.db.delete(i._id)))
    await ctx.db.delete(collectionId)
    return collectionId
  },
})
