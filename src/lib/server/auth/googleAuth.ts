import type { RequestEvent } from '@sveltejs/kit';

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

type GoogleAuthTokenResult =
  | { token: string; error: null }
  | { token: null; error: string }

export async function getGoogleAccessToken(event: RequestEvent): Promise<GoogleAuthTokenResult> {
  const session = await event.locals.auth()

  if (session == null) {
    console.error('No session found')
    return { token: null, error: 'Not authenticated' }
  }

  if (session.error === 'RefreshAccessTokenError') {
    console.error('Google access token refresh failed')
    return { token: null, error: 'Failed to refresh google access token' }
  }

  if (!session.access_token) {
    console.error('No access token in session')
    return { token: null, error: 'Failed to get google access token' }
  }

  return { token: session.access_token, error: null }
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to refresh access token: ${error}`)
  }

  const data = (await res.json()) as GoogleTokenResponse
  return data
}

export async function revokeGoogleToken(refreshOrAccessToken: string) {
  const res = await fetch(
    `https://oauth2.googleapis.com/revoke?token=${refreshOrAccessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to revoke token: ${error}`)
  }
}
