import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = () => createSupabaseAdminClient() as any

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Get the project's org, then all members of that org with user details
  const { data: project } = await admin()
    .from('client_projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ members: [] })

  const { data, error } = await admin()
    .from('org_members')
    .select('users(clerk_user_id, full_name, email, avatar_url)')
    .eq('organization_id', project.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = (data || [])
    .map((row: { users: { clerk_user_id: string; full_name: string | null; email: string; avatar_url: string | null } | null }) => row.users)
    .filter(Boolean)

  return NextResponse.json({ members })
}
