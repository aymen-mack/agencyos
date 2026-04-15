import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { exchangeKitCode } from '@/lib/integrations/kit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const SECRET = new TextEncoder().encode(
  process.env.INTEGRATION_ENCRYPTION_KEY || 'fallback-secret-change-in-production'
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('kit_oauth_state')?.value

  // Validate state matches stored cookie (CSRF protection)
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_state', req.url)
    )
  }

  // Verify and decode state JWT
  let projectId: string
  try {
    const { payload } = await jwtVerify(state, SECRET)
    projectId = payload.projectId as string
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=state_expired', req.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/dashboard/${projectId}/settings?error=no_code`, req.url)
    )
  }

  // Exchange code for tokens
  let tokens: { access_token: string; refresh_token: string }
  try {
    tokens = await exchangeKitCode(code)
  } catch (err) {
    console.error('Kit token exchange failed:', err)
    return NextResponse.redirect(
      new URL(`/dashboard/${projectId}/settings?error=token_exchange_failed`, req.url)
    )
  }

  // Fetch Kit account info to store as metadata
  let accountEmail = ''
  try {
    const accountRes = await fetch('https://api.kit.com/v4/account', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (accountRes.ok) {
      const { account } = await accountRes.json()
      accountEmail = account?.email || ''
    }
  } catch {
    // Non-critical
  }

  // Upsert integration record via admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('integrations').upsert(
    {
      project_id: projectId,
      provider: 'kit',
      status: 'active',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      metadata: { account: accountEmail },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,provider' }
  )

  if (error) {
    console.error('Failed to save Kit integration:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/${projectId}/settings?error=save_failed`, req.url)
    )
  }

  // Clear cookie and redirect with success
  const response = NextResponse.redirect(
    new URL(`/dashboard/${projectId}/settings?connected=Kit`, req.url)
  )
  response.cookies.delete('kit_oauth_state')
  return response
}
