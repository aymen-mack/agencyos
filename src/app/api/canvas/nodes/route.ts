import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: nodes } = await admin
    .from('canvas_nodes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')

  const { data: edges } = await admin
    .from('canvas_edges')
    .select('*')
    .eq('project_id', projectId)

  // Also load latest outputs for AI nodes
  const nodeIds = (nodes || []).map((n) => n.id)
  let outputs: { node_id: string; output_content: string; generated_at: string }[] = []
  if (nodeIds.length > 0) {
    const { data } = await admin
      .from('canvas_outputs')
      .select('node_id, output_content, generated_at')
      .in('node_id', nodeIds)
      .order('generated_at', { ascending: false })

    // Keep only the latest output per node
    const seen = new Set<string>()
    for (const o of data || []) {
      if (!seen.has(o.node_id)) { outputs.push(o); seen.add(o.node_id) }
    }
  }

  return NextResponse.json({ nodes: nodes || [], edges: edges || [], outputs })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, type, position_x, position_y, content, node_config } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('canvas_nodes')
    .insert({ project_id: projectId, type: type || 'text_note', position_x: position_x ?? 100, position_y: position_y ?? 100, content: content || null, node_config: node_config || {} })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data })
}
