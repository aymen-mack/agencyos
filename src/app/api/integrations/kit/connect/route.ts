import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { SignJWT } from 'jose'
import { getKitAuthUrl } from '@/lib/integrations/kit'

const SECRET = new TextEncoder().encode(
  process.env.INTEGRATION_ENCRYPTION_KEY || 'fallback-secret-change-in-production'
)

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // Sign state JWT: includes projectId + expiry
  const state = await new SignJWT({ projectId, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(SECRET)

  const url = getKitAuthUrl(state)

  const response = NextResponse.redirect(url)
  // Store state in httpOnly cookie for CSRF verification
  response.cookies.set('kit_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
