import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeLeadScore, SCORE_WEIGHTS } from '@/lib/scoring/lead-score'
import { Json } from '@/types/database'
import crypto from 'crypto'

// ---- Signature verification ----

function verifyTypeformSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.WEBHOOK_SECRET_TYPEFORM) return true // skip in dev
  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET_TYPEFORM)
  hmac.update(body)
  const digest = 'sha256=' + hmac.digest('base64')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

function verifyMakeSignature(body: string, signature: string | null): boolean {
  // Make.com doesn't sign by default — accept all from webhook URL secret
  return true
}

// ---- Handlers ----

async function handleTypeform(
  payload: Record<string, unknown>,
  projectId: string
) {
  const admin = createSupabaseAdminClient()

  // Extract form response
  const response = payload.form_response as Record<string, unknown>
  const hidden = (response?.hidden as Record<string, string>) || {}
  const answers = (response?.answers as Array<Record<string, unknown>>) || []
  const definition = response?.definition as Record<string, unknown>
  const fields = (definition?.fields as Array<Record<string, unknown>>) || []

  // Build survey_data map: field title → answer value
  const surveyData: Record<string, unknown> = {}
  for (const answer of answers) {
    const fieldId = answer.field as Record<string, string>
    const field = fields.find((f) => f.id === fieldId?.id)
    const label = (field?.title as string || fieldId?.id || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')

    if (answer.type === 'choice') {
      surveyData[label] = (answer.choice as Record<string, string>)?.label
    } else if (answer.type === 'choices') {
      surveyData[label] = (answer.choices as Record<string, string[]>)?.labels
    } else {
      surveyData[label] = answer[answer.type as string]
    }
  }

  // Extract lead info
  const email = hidden.email || (surveyData.email as string) || ''
  const name = hidden.name || (surveyData.name as string) || (surveyData.full_name as string) || ''

  if (!email) {
    console.warn('Typeform webhook missing email — skipping')
    return
  }

  // Upsert lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .upsert(
      {
        project_id: projectId,
        email,
        full_name: name || null,
        source: 'typeform',
        source_ref: response?.form_id as string || null,
        survey_data: surveyData as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,email' }
    )
    .select()
    .single()

  if (leadError || !lead) {
    console.error('Failed to upsert lead from Typeform:', leadError)
    return
  }

  // Insert form submission event
  const scoreDelta = SCORE_WEIGHTS.form_submission
  await admin.from('lead_events').insert({
    lead_id: lead.id,
    project_id: projectId,
    type: 'form_submission',
    payload: { form_id: String(response?.form_id ?? ''), submitted_at: String(response?.submitted_at ?? '') } as Json,
    score_delta: scoreDelta,
  })

  // Fetch all events to recompute score
  const { data: events } = await admin
    .from('lead_events')
    .select('type, score_delta')
    .eq('lead_id', lead.id)

  const breakdown = computeLeadScore(events || [], surveyData)

  // Update lead score
  await admin
    .from('leads')
    .update({
      score: breakdown.total,
      score_breakdown: breakdown as unknown as Json,
      tags: [breakdown.tag],
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)
}

async function handleMake(payload: Record<string, unknown>, projectId: string) {
  // Make.com sends structured data — handles arbitrary events
  const admin = createSupabaseAdminClient()
  const eventType = payload.event_type as string || 'make_event'
  const email = payload.email as string

  if (!email) return

  // Upsert lead
  const { data: lead } = await admin
    .from('leads')
    .upsert(
      {
        project_id: projectId,
        email,
        full_name: payload.name as string || null,
        source: 'make',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,email' }
    )
    .select()
    .single()

  if (!lead) return

  // Insert event
  const scoreDelta = SCORE_WEIGHTS[eventType] || 5
  await admin.from('lead_events').insert({
    lead_id: lead.id,
    project_id: projectId,
    type: eventType,
    payload: payload as unknown as Json,
    score_delta: scoreDelta,
  })

  // Recompute score
  const { data: events } = await admin
    .from('lead_events')
    .select('type, score_delta')
    .eq('lead_id', lead.id)

  const { data: currentLead } = await admin.from('leads').select('survey_data').eq('id', lead.id).single()
  const breakdown = computeLeadScore(events || [], (currentLead?.survey_data as Record<string, unknown>) || {})

  await admin
    .from('leads')
    .update({
      score: breakdown.total,
      score_breakdown: breakdown as unknown as Json,
      tags: [breakdown.tag],
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)
}

async function handleStripe(payload: Record<string, unknown>, projectId: string) {
  const admin = createSupabaseAdminClient()
  const eventType = payload.type as string

  if (eventType === 'payment_intent.succeeded' || eventType === 'charge.succeeded') {
    const data = payload.data as Record<string, unknown>
    const obj = data?.object as Record<string, unknown>
    const billingDetails = obj?.billing_details as Record<string, string> | undefined
    const email = (obj?.receipt_email || billingDetails?.email) as string
    const amount = (obj?.amount as number || 0) / 100 // Stripe amounts are in cents

    if (email) {
      // Upsert lead + insert event
      const { data: lead } = await admin
        .from('leads')
        .upsert(
          { project_id: projectId, email, source: 'stripe', updated_at: new Date().toISOString() },
          { onConflict: 'project_id,email' }
        )
        .select()
        .single()

      if (lead) {
        await admin.from('lead_events').insert({
          lead_id: lead.id,
          project_id: projectId,
          type: 'deal_closed',
          payload: { amount, stripe_event: eventType } as Json,
          score_delta: SCORE_WEIGHTS.deal_closed,
        })

        // Create sales record
        await admin.from('sales').insert({
          project_id: projectId,
          lead_id: lead.id,
          title: `Stripe payment — ${email}`,
          stage: 'closed_won',
          value: amount,
          metadata: { stripe_event: eventType, payment_id: String(obj?.id ?? '') } as Json,
        })
      }
    }
  }
}

async function handleWhop(payload: Record<string, unknown>, projectId: string) {
  const admin = createSupabaseAdminClient()
  const email = (payload.user as Record<string, string>)?.email || payload.email as string

  if (!email) return

  const { data: lead } = await admin
    .from('leads')
    .upsert(
      { project_id: projectId, email, source: 'whop', updated_at: new Date().toISOString() },
      { onConflict: 'project_id,email' }
    )
    .select()
    .single()

  if (lead) {
    await admin.from('lead_events').insert({
      lead_id: lead.id,
      project_id: projectId,
      type: 'deal_closed',
      payload: payload as unknown as Json,
      score_delta: SCORE_WEIGHTS.deal_closed,
    })
  }
}

// ---- Main route handler ----

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const projectId = req.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const rawBody = await req.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Signature verification
  if (provider === 'typeform') {
    const sig = req.headers.get('Typeform-Signature')
    if (!verifyTypeformSignature(rawBody, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // Dispatch to handler
  try {
    switch (provider) {
      case 'typeform':
        await handleTypeform(payload, projectId)
        break
      case 'make':
        await handleMake(payload, projectId)
        break
      case 'stripe':
        await handleStripe(payload, projectId)
        break
      case 'whop':
        await handleWhop(payload, projectId)
        break
      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`Webhook error [${provider}]:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
