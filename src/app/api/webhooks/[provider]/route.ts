import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeLeadScore, SCORE_WEIGHTS } from '@/lib/scoring/lead-score'
import { Json } from '@/types/database'
import crypto from 'crypto'

// ---- Status normalisation ----
// Make.com sends human-readable values like "Survey Filled". Map them to DB ids.
function normalizeStatus(raw: string | undefined): string {
  if (!raw) return 'registrant'
  const s = raw.toLowerCase().trim()
  if (s === 'survey filled' || s === 'survey_filled')    return 'survey_filled'
  if (s === 'webinar show'  || s === 'webinar_show' || s === 'attended') return 'webinar_show'
  if (s === 'call booked'   || s === 'call_booked')      return 'call_booked'
  if (s === 'call showed'   || s === 'call_showed')      return 'call_showed'
  if (s === 'closed deal'   || s === 'closed_deal' || s === 'deal closed') return 'closed_deal'
  if (s === 'registered'    || s === 'registrant')       return 'registrant'
  return 'registrant'
}

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
        status: 'closed_deal',
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
        status: 'closed_deal',
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

  // Find existing lead then INSERT or UPDATE (avoids upsert unique-constraint dependency)
  const { data: existing } = await admin
    .from('leads')
    .select('id, survey_data')
    .eq('project_id', projectId)
    .eq('email', email)
    .maybeSingle()

  let lead: { id: string; [key: string]: unknown } | null = null

  if (existing) {
    const { data, error: updateError } = await admin
      .from('leads')
      .update({
        status: 'survey_filled',
        full_name: name || undefined,
        source: 'typeform',
        source_ref: response?.form_id as string || null,
        survey_data: { ...((existing.survey_data as Record<string, unknown>) || {}), ...surveyData } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (updateError) { console.error('Failed to update lead from Typeform:', updateError); return }
    lead = data
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: insertError } = await (admin.from('leads') as any)
      .insert({
        project_id: projectId,
        email,
        full_name: name || null,
        source: 'typeform',
        source_ref: response?.form_id as string || null,
        survey_data: surveyData as Json,
        status: 'survey_filled',
        score: 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insertError) { console.error('Failed to insert lead from Typeform:', insertError); return }
    lead = data
  }

  if (!lead) {
    console.error('No lead returned from Typeform handler')
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
  const admin = createSupabaseAdminClient()

  const email = (
    (payload.email || payload.Email || payload.EMAIL) as string
  )?.trim().toLowerCase()
  if (!email) return

  const rawStatus = (payload.status || payload.Status || payload.STATUS) as string | undefined
  const status = normalizeStatus(rawStatus)

  const fullName = (
    payload.name || payload.Name || payload.NAME ||
    payload.full_name || payload.Full_Name || payload.FullName
  ) as string | undefined

  const phone = (
    payload.phone || payload.Phone || payload.PHONE ||
    payload.phone_number || payload['Phone Number']
  ) as string | undefined

  const source = (payload.source || payload.Source || 'make') as string

  // ── Survey fields ─────────────────────────────────────────────────────────
  const pick = (...keys: string[]) => {
    for (const k of keys) if (payload[k]) return String(payload[k])
    return undefined
  }
  const surveyData: Record<string, string> = {}
  const age              = pick('age', 'Age', 'AGE')
  const occupation       = pick('occupation', 'Occupation', 'OCCUPATION')
  const income           = pick('income', 'Income', 'Income Level', 'income_level')
  const sophistication   = pick('sophistication', 'Sophistication', 'SOPHISTICATION')
  const challenges       = pick('challenges', 'Challenges', 'challenge', 'Challenge')
  const prevInvestment   = pick('previous_investment', 'Previous Investment', 'Previous_Investment')
  const speedToAction    = pick('speed_to_action', 'Speed to Action', 'Speed_To_Action', 'speed', 'Speed')
  if (age)            surveyData.age                 = age
  if (occupation)     surveyData.occupation          = occupation
  if (income)         surveyData.income              = income
  if (sophistication) surveyData.sophistication      = sophistication
  if (challenges)     surveyData.challenges          = challenges
  if (prevInvestment) surveyData.previous_investment = prevInvestment
  if (speedToAction)  surveyData.speed_to_action     = speedToAction
  const hasSurvey = Object.keys(surveyData).length > 0

  // ── Payment shortcut ──────────────────────────────────────────────────────
  if (status === 'closed_deal') {
    const dollars = Number(payload.purchase_amount || payload.Purchase_Amount || payload.amount || 0)
    const cents   = Number(payload.amount_subtotal || payload.amount_cents || 0)
    const purchaseAmount = dollars || (cents > 0 ? cents / 100 : null)
    const lead = await upsertLeadForPayment(admin, projectId, email, { source, purchase_amount: purchaseAmount, full_name: fullName })
    if (lead) {
      await admin.from('lead_events').insert({ lead_id: lead.id, project_id: projectId, type: 'deal_closed', payload: payload as unknown as Json, score_delta: SCORE_WEIGHTS.deal_closed })
    }
    return
  }

  // ── Find existing lead then INSERT or UPDATE (avoids upsert constraint) ───
  const { data: existing } = await admin
    .from('leads')
    .select('id, survey_data')
    .eq('project_id', projectId)
    .eq('email', email)
    .maybeSingle()

  let lead: { id: string; [key: string]: unknown } | null = null

  if (existing) {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (fullName) updateData.full_name = fullName
    if (hasSurvey) {
      updateData.survey_data = {
        ...((existing.survey_data as Record<string, unknown>) || {}),
        ...surveyData,
      }
    }
    const { data } = await admin
      .from('leads')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()
    lead = data
  } else {
    const insertData: Record<string, unknown> = {
      project_id: projectId,
      email,
      full_name: fullName || null,
      phone: phone || null,
      source,
      status,
      score: 0,
      is_registrant: status === 'registrant',
      updated_at: new Date().toISOString(),
    }
    if (hasSurvey) insertData.survey_data = surveyData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from('leads') as any).insert(insertData).select().single()
    lead = data
  }

  if (!lead) return

  // ── Event + score ─────────────────────────────────────────────────────────
  const eventType = status === 'survey_filled' ? 'form_submission' : status
  await admin.from('lead_events').insert({
    lead_id: lead.id,
    project_id: projectId,
    type: eventType,
    payload: payload as unknown as Json,
    score_delta: SCORE_WEIGHTS[eventType] || 5,
  })

  const { data: events } = await admin
    .from('lead_events').select('type, score_delta').eq('lead_id', lead.id)
  const { data: refreshed } = await admin.from('leads').select('survey_data').eq('id', lead.id).single()
  const breakdown = computeLeadScore(events || [], (refreshed?.survey_data as Record<string, unknown>) || {})

  await admin.from('leads').update({
    score: breakdown.total,
    score_breakdown: breakdown as unknown as Json,
    tags: [breakdown.tag],
    updated_at: new Date().toISOString(),
  }).eq('id', lead.id)
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
        is_registrant: true,
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
