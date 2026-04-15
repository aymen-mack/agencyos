import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const KIT_API_BASE = 'https://api.kit.com/v4'
const KIT_TOKEN_URL = 'https://app.kit.com/oauth/token'

export interface KitSubscriber {
  id: number
  email_address: string
  first_name: string | null
  state: string
  created_at: string
  fields: Record<string, string>
}

export function getKitAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.KIT_CLIENT_ID!,
    redirect_uri: process.env.KIT_REDIRECT_URI!,
    response_type: 'code',
    state,
  })
  return `https://app.kit.com/oauth/authorize?${params.toString()}`
}

export async function exchangeKitCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  token_type: string
}> {
  const res = await fetch(KIT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.KIT_CLIENT_ID!,
      client_secret: process.env.KIT_CLIENT_SECRET!,
      redirect_uri: process.env.KIT_REDIRECT_URI!,
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Kit token exchange failed: ${error}`)
  }

  return res.json()
}

export async function refreshKitToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
}> {
  const res = await fetch(KIT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.KIT_CLIENT_ID!,
      client_secret: process.env.KIT_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error('Kit token refresh failed')
  }

  return res.json()
}

export class KitClient {
  private accessToken: string
  private refreshToken: string
  private projectId: string

  constructor(accessToken: string, refreshToken: string, projectId: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.projectId = projectId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${KIT_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (res.status === 401) {
      // Refresh and retry once
      const newTokens = await refreshKitToken(this.refreshToken)
      this.accessToken = newTokens.access_token
      this.refreshToken = newTokens.refresh_token

      // Persist new tokens
      const admin = createSupabaseAdminClient()
      await admin
        .from('integrations')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', this.projectId)
        .eq('provider', 'kit')

      const retryRes = await fetch(`${KIT_API_BASE}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!retryRes.ok) throw new Error(`Kit API error: ${retryRes.status}`)
      return retryRes.json()
    }

    if (!res.ok) throw new Error(`Kit API error: ${res.status}`)
    return res.json()
  }

  async getSubscribers(page = 1): Promise<{ subscribers: KitSubscriber[]; total_subscribers: number }> {
    return this.request(`/subscribers?page=${page}`)
  }

  async getAccount(): Promise<{ account: { name: string; email: string } }> {
    return this.request('/account')
  }

  async getBroadcasts(): Promise<{ broadcasts: unknown[] }> {
    return this.request('/broadcasts')
  }

  async getSequences(): Promise<{ sequences: unknown[] }> {
    return this.request('/sequences')
  }
}

export async function getKitClientForProject(projectId: string): Promise<KitClient | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('integrations')
    .select('access_token, refresh_token')
    .eq('project_id', projectId)
    .eq('provider', 'kit')
    .eq('status', 'active')
    .single()

  if (!data?.access_token) return null
  return new KitClient(data.access_token, data.refresh_token || '', projectId)
}
