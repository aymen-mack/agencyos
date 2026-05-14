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

  const { data, error } = await admin()
    .from('delivery_nodes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ nodes: data || [] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, name, node_type, status, assignee_id, position_x, position_y } = body
  if (!project_id || !name) return NextResponse.json({ error: 'project_id and name required' }, { status: 400 })

  const { data, error } = await admin()
    .from('delivery_nodes')
    .insert({
      project_id,
      name: name.trim(),
      node_type: node_type || 'custom',
      status: status || 'ready',
      assignee_id: assignee_id || null,
      position_x: position_x ?? 100,
      position_y: position_y ?? 100,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data }, { status: 201 })
}
