import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  users: defineTable({
    spotifyUserId: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index('spotifyUserId', ['spotifyUserId']),
  sessions: defineTable({
    userId: v.id('users'),
    sessionId: v.string(),
  }).index('sessionId', ['sessionId']),
  spotifyTokens: defineTable({
    userId: v.id('users'),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiresAt: v.number(),
  }).index('userId', ['userId']),
  oauthStates: defineTable({
    state: v.string(),
    verifier: v.string(),
    expiresAt: v.number(),
  }).index('state', ['state']),
  collections: defineTable({
    userId: v.id('users'),
    name: v.string(),
  }).index('userId', ['userId']),
  collectionItems: defineTable({
    collectionId: v.id('collections'),
    trackId: v.string(),
    trackUri: v.string(),
  }).index('collectionId', ['collectionId']),
})
