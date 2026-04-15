import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('custom_fields')
    .select('*')
    .eq('project_id', projectId)
    .order('position')

  return NextResponse.json({ fields: data || [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, name, field_type, options } = await req.json()
  if (!projectId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: existing } = await admin
    .from('custom_fields')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await admin
    .from('custom_fields')
    .insert({
      project_id: projectId,
      name: name.trim(),
      field_type: field_type || 'text',
      options: options || [],
      position: (existing?.position ?? -1) + 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ field: data })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fieldId } = await req.json()
  const admin = createSupabaseAdminClient()
  await admin.from('custom_fields').delete().eq('id', fieldId)
  return NextResponse.json({ ok: true })
}
