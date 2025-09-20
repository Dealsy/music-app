import crypto from 'node:crypto'

// Helper to generate a base64url string from a Buffer
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

// Generate a PKCE code_verifier and corresponding S256 code_challenge
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(crypto.randomBytes(64))
  const challenge = base64UrlEncode(
    crypto.createHash('sha256').update(verifier).digest(),
  )
  return { verifier, challenge }
}

export function buildAuthorizeUrl({
  clientId,
  redirectUri,
  scope,
  state,
  codeChallenge,
}: {
  clientId: string
  redirectUri: string
  scope: string
  state: string
  codeChallenge: string
}): string {
  const authorizeUrl = new URL('https://accounts.spotify.com/authorize')
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope,
    state,
    show_dialog: 'false',
  }).toString()
  return authorizeUrl.toString()
}

export async function exchangeCodeForToken({
  clientId,
  redirectUri,
  code,
  codeVerifier,
}: {
  clientId: string
  redirectUri: string
  code: string
  codeVerifier: string
}): Promise<
  | {
      access_token: string
      token_type: string
      scope: string
      expires_in: number
      refresh_token?: string
    }
  | { error: string; error_description?: string }
> {
  const tokenUrl = 'https://accounts.spotify.com/api/token'
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  })
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = (await res.json()) as any
  return json
}

export function createCookie({
  name,
  value,
  maxAgeSeconds,
  secure = true,
  sameSite = 'Lax',
}: {
  name: string
  value: string
  maxAgeSeconds?: number
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
}): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly']
  if (secure) parts.push('Secure')
  parts.push(`SameSite=${sameSite}`)
  if (maxAgeSeconds && Number.isFinite(maxAgeSeconds)) {
    parts.push(`Max-Age=${Math.floor(maxAgeSeconds)}`)
  }
  return parts.join('; ')
}
