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

function verifyWebflowSignature(body: string, signature: string | null, secret: string | null | undefined): boolean {
  if (!secret) return true // no secret saved yet — allow through
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const digest = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

// ---- Payment attribution helper ----
// For payment events: if the lead already exists (registered before), only update payment
// fields so their original source/registration status is preserved. If they're brand new
// (paid without ever registering), create them with the payment source.
async function upsertLeadForPayment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  projectId: string,
  email: string,
  opts: { source: string; purchase_amount: number | null; full_name?: string | null }
) {
  const { data: existing } = await admin
    .from('leads')
    .select('id')
    .eq('project_id', projectId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    // Lead already registered — update payment fields only, keep their original source
    const { data: lead } = await admin
      .from('leads')
      .update({
        status: 'purchased',
        ...(opts.purchase_amount != null ? { purchase_amount: opts.purchase_amount } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    return lead
  } else {
    // New lead from payment only — create with payment source (won't count as registrant)
    const { data: lead } = await admin
      .from('leads')
      .insert({
        project_id: projectId,
        email: email.trim().toLowerCase(),
        full_name: opts.full_name || null,
        source: opts.source,
        status: 'purchased',
        purchase_amount: opts.purchase_amount,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    return lead
  }
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
  const eventType = (payload.event_type || payload.Event_type || payload.EventType) as string || 'make_event'

  // Accept any capitalisation Make might use for the field keys
  const email = (
    payload.email || payload.Email || payload.EMAIL
  ) as string

  if (!email) return

  const fullName = (
    payload.name || payload.Name || payload.NAME ||
    payload.full_name || payload.Full_Name || payload.FullName
  ) as string | undefined

  const phone = (
    payload.phone || payload.Phone || payload.PHONE ||
    payload.phone_number || payload['Phone Number']
  ) as string | undefined

  const source = (
    payload.source || payload.Source || 'webflow'
  ) as string

  // Accept dollars (purchase_amount) or cents (amount_subtotal / amount_cents from Stripe via Make)
  const dollars = Number(payload.purchase_amount || payload.Purchase_Amount || payload.amount || payload.Amount || 0)
  const cents = Number(payload.amount_subtotal || payload.amount_cents || payload.Amount_Subtotal || 0)
  const purchaseAmount = dollars || (cents > 0 ? cents / 100 : null)

  const isDeal = eventType === 'deal_closed'

  let lead: Record<string, unknown> | null = null

  if (isDeal) {
    // Payment event: preserve existing registration source if lead already exists
    lead = await upsertLeadForPayment(admin, projectId, email, {
      source,
      purchase_amount: purchaseAmount,
      full_name: fullName,
    })
  } else {
    // Registration/engagement event: normal upsert, update all fields
    const { data } = await admin
      .from('leads')
      .upsert(
        {
          project_id: projectId,
          email: email.trim().toLowerCase(),
          full_name: fullName || null,
          phone: phone || null,
          source,
          status: 'registered',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,email' }
      )
      .select()
      .single()
    lead = data
  }

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
    const amount = (obj?.amount as number || 0) / 100

    if (email) {
      const lead = await upsertLeadForPayment(admin, projectId, email, { source: 'stripe', purchase_amount: amount })

      if (lead) {
        await admin.from('lead_events').insert({
          lead_id: lead.id,
          project_id: projectId,
          type: 'deal_closed',
          payload: { amount, stripe_event: eventType } as Json,
          score_delta: SCORE_WEIGHTS.deal_closed,
        })
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

  const amount = Number(
    (payload.checkout as Record<string, unknown>)?.final_price ||
    (payload.membership as Record<string, unknown>)?.price ||
    payload.amount || payload.price || 0
  ) / 100

  const lead = await upsertLeadForPayment(admin, projectId, email, { source: 'whop', purchase_amount: amount || null })

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

// Webflow form submission webhook
// Payload shape: { formData: { name, email, phone, ... }, form: { displayName }, site: { name } }
async function handleWebflow(payload: Record<string, unknown>, projectId: string) {
  const admin = createSupabaseAdminClient()

  const formData = (payload.formData ?? payload.data ?? payload) as Record<string, string>

  // Webflow sends field values keyed by field name — try common field name patterns
  const email =
    formData.email ||
    formData.Email ||
    formData['e-mail'] ||
    formData['Email Address'] ||
    ''

  if (!email) {
    console.warn('Webflow webhook: no email field found in formData', formData)
    return
  }

  const name =
    formData.name ||
    formData.Name ||
    formData['full-name'] ||
    formData['Full Name'] ||
    formData['first-name'] ||
    formData.firstName ||
    ''

  const phone =
    formData.phone ||
    formData.Phone ||
    formData['phone-number'] ||
    formData['Phone Number'] ||
    null

  const source = 'webflow'

  const { data: lead, error } = await admin
    .from('leads')
    .upsert(
      {
        project_id: projectId,
        email: email.trim().toLowerCase(),
        full_name: name || null,
        phone: phone || null,
        source,
        status: 'registered',
        survey_data: formData as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,email' }
    )
    .select()
    .single()

  if (error || !lead) {
    console.error('Webflow webhook: failed to upsert lead', error)
    return
  }

  await admin.from('lead_events').insert({
    lead_id: lead.id,
    project_id: projectId,
    type: 'form_submission',
    payload: {
      source: 'webflow',
      form: (payload.form as Record<string, string>)?.displayName ?? 'Webflow Form',
      submitted_at: new Date().toISOString(),
    } as Json,
    score_delta: SCORE_WEIGHTS.form_submission,
  })
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
  if (provider === 'webflow') {
    const admin = createSupabaseAdminClient()
    const { data: integration } = await admin
      .from('integrations')
      .select('metadata, access_token')
      .eq('project_id', projectId)
      .eq('provider', 'webflow')
      .single()
    const secret = (integration?.metadata as Record<string, string> | null)?.webhook_secret ?? integration?.access_token
    const sig = req.headers.get('x-webflow-signature')
    if (!verifyWebflowSignature(rawBody, sig, secret)) {
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
      case 'webflow':
        await handleWebflow(payload, projectId)
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
