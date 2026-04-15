import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId } = await params
  const body = await req.json()
  const admin = createSupabaseAdminClient()

  const update: {
    position_x?: number
    position_y?: number
    content?: string | null
    node_config?: import('@/types/database').Json
  } = {}

  if ('position_x' in body) update.position_x = body.position_x
  if ('position_y' in body) update.position_y = body.position_y
  if ('content' in body) update.content = body.content
  if ('node_config' in body) update.node_config = body.node_config as import('@/types/database').Json

  const { data, error } = await admin
    .from('canvas_nodes')
    .update(update)
    .eq('id', nodeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId } = await params
  const admin = createSupabaseAdminClient()
  await admin.from('canvas_nodes').delete().eq('id', nodeId)
  return NextResponse.json({ ok: true })
}
