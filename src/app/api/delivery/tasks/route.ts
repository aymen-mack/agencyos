import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = () => createSupabaseAdminClient() as any

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const nodeId = searchParams.get('nodeId')
  if (!nodeId) return NextResponse.json({ error: 'nodeId required' }, { status: 400 })

  const { data, error } = await admin()
    .from('delivery_node_tasks')
    .select('*')
    .eq('node_id', nodeId)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data || [] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { node_id, name, assignee_id, sort_order } = await req.json()
  if (!node_id || !name) return NextResponse.json({ error: 'node_id and name required' }, { status: 400 })

  const { data, error } = await admin()
    .from('delivery_node_tasks')
    .insert({
      node_id,
      name: name.trim(),
      status: 'todo',
      assignee_id: assignee_id || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
