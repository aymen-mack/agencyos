import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const { name, client_name, status } = await req.json()

  const admin = createSupabaseAdminClient()
  const update: { name?: string; client_name?: string | null; status?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (name !== undefined) update.name = name
  if (client_name !== undefined) update.client_name = client_name
  if (status !== undefined) update.status = status

  const { data, error } = await admin
    .from('client_projects')
    .update(update)
    .eq('id', projectId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const admin = createSupabaseAdminClient()

  // Verify user has access to this project
  const { data: project } = await admin
    .from('client_projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { error } = await admin
    .from('client_projects')
    .delete()
    .eq('id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
