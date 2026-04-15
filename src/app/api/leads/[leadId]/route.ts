import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params
  const body = await req.json()

  // Whitelist updatable fields
  type LeadUpdate = {
    full_name?: string | null
    email?: string
    phone?: string | null
    source?: string | null
    status?: string
    tags?: string[]
    score?: number
    score_breakdown?: import('@/types/database').Json
    survey_data?: import('@/types/database').Json
    updated_at?: string
  }
  const update: LeadUpdate = { updated_at: new Date().toISOString() }
  if ('full_name' in body) update.full_name = body.full_name
  if ('email' in body) update.email = body.email
  if ('phone' in body) update.phone = body.phone
  if ('source' in body) update.source = body.source
  if ('status' in body) update.status = body.status
  if ('tags' in body) update.tags = body.tags
  if ('score' in body) update.score = body.score
  if ('score_breakdown' in body) update.score_breakdown = body.score_breakdown
  if ('survey_data' in body) update.survey_data = body.survey_data

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('leads')
    .update(update)
    .eq('id', leadId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log status change as event
  if (body.status) {
    await admin.from('lead_events').insert({
      lead_id: leadId,
      project_id: data.project_id,
      type: 'status_changed',
      payload: { new_status: body.status, changed_by: userId },
      score_delta: 0,
    })
  }

  return NextResponse.json({ lead: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params
  const admin = createSupabaseAdminClient()

  const { error } = await admin.from('leads').delete().eq('id', leadId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
