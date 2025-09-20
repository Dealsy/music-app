import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { collectionId: v.id('collections') },
  handler: async (ctx, { collectionId }) => {
    return await ctx.db
      .query('collectionItems')
      .withIndex('collectionId', (q) => q.eq('collectionId', collectionId))
      .collect()
  },
})

export const add = mutation({
  args: {
    collectionId: v.id('collections'),
    trackId: v.string(),
    trackUri: v.string(),
  },
  handler: async (ctx, args) => await ctx.db.insert('collectionItems', args),
})

export const remove = mutation({
  args: { itemId: v.id('collectionItems') },
  handler: async (ctx, { itemId }) => {
    await ctx.db.delete(itemId)
    return itemId
  },
})
