import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/automations?projectId=xxx
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const admin = createSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('automations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ automations: data || [] })
}

// POST /api/automations
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, name, description, nodes_json, edges_json, trigger_type, template_id } = body

  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const admin = createSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('automations')
    .insert({
      project_id,
      name: name || 'Untitled Automation',
      description: description ?? null,
      nodes_json: nodes_json ?? [],
      edges_json: edges_json ?? [],
      trigger_type: trigger_type ?? null,
      template_id: template_id ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ automation: data }, { status: 201 })
}
