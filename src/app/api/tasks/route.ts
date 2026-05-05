import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const admin = createSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('section')
    .order('position')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data || [] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, title, section, parent_id, position } = body
  if (!project_id || !title) return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })

  const admin = createSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('tasks')
    .insert({
      project_id,
      title: title.trim(),
      section: section || 'General',
      parent_id: parent_id || null,
      position: position ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
