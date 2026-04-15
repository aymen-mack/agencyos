import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: leads, error } = await admin
    .from('leads')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: leads || [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { projectId, email, full_name, phone, source, status, tags, score } = body

  if (!projectId || !email) {
    return NextResponse.json({ error: 'projectId and email are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      project_id: projectId,
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      phone: phone?.trim() || null,
      source: source || 'manual',
      status: status || 'registrant',
      tags: tags || [],
      score: score || 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A lead with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log event
  await admin.from('lead_events').insert({
    lead_id: lead.id,
    project_id: projectId,
    type: 'lead_created',
    payload: { source: source || 'manual', created_by: userId },
    score_delta: 0,
  })

  return NextResponse.json({ lead })
}
