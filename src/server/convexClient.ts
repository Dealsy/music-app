import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

export function getConvexClient() {
  const fromEnv = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL
  let fromImportMeta: string | undefined
  try {
    fromImportMeta = (import.meta as any)?.env?.VITE_CONVEX_URL
  } catch {}
  const url = fromEnv || fromImportMeta
  if (!url) {
    throw new Error('Missing Convex URL: set CONVEX_URL or VITE_CONVEX_URL')
  }
  return new ConvexHttpClient(url)
}

export type Api = typeof api
