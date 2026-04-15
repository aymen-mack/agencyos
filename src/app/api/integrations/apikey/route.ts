import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, provider, fields } = await req.json()
  if (!projectId || !provider || !fields) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Verify user has access to this project
  const { data: dbUser } = await admin
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })

  const { data: project } = await admin
    .from('client_projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: member } = await admin
    .from('org_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('user_id', dbUser.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  // Upsert integration with the API key/token
  const { error } = await admin.from('integrations').upsert(
    {
      project_id: projectId,
      provider,
      status: 'active',
      access_token: fields[Object.keys(fields)[0]] || null,
      metadata: fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,provider' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, provider } = await req.json()
  const admin = createSupabaseAdminClient()

  await admin
    .from('integrations')
    .update({ status: 'revoked', access_token: null, refresh_token: null })
    .eq('project_id', projectId)
    .eq('provider', provider)

  return NextResponse.json({ ok: true })
}
