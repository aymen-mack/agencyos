import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, sourceNodeId, targetNodeId } = await req.json()
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('canvas_edges')
    .upsert({ project_id: projectId, source_node_id: sourceNodeId, target_node_id: targetNodeId },
      { onConflict: 'source_node_id,target_node_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ edge: data })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { edgeId } = await req.json()
  const admin = createSupabaseAdminClient()
  await admin.from('canvas_edges').delete().eq('id', edgeId)
  return NextResponse.json({ ok: true })
}
