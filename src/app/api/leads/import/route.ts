import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface ImportRow {
  email: string
  full_name?: string
  phone?: string
  source?: string
  campaign?: string
  tags?: string
  purchase_amount?: string
  status: string
  is_registrant?: boolean
  survey_data?: Record<string, string>
}

type LeadRecord = Record<string, unknown>

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { projectId, rows, defaultStatus } = body as {
    projectId: string
    rows: ImportRow[]
    defaultStatus: string
  }

  if (!projectId || !Array.isArray(rows) || !rows.length) {
    return NextResponse.json({ error: 'projectId and rows are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // ── Validate & normalise ───────────────────────────────────────────────────
  const valid: LeadRecord[] = []
  const skippedEmails: string[] = []

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skippedEmails.push(email || '(empty)')
      continue
    }

    const tags = row.tags
      ? row.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const purchaseAmountRaw = row.purchase_amount
      ? parseFloat(row.purchase_amount.replace(/[^0-9.]/g, ''))
      : null

    const record: LeadRecord = {
      project_id: projectId,
      email,
      full_name: row.full_name?.trim() || null,
      phone: row.phone?.trim() || null,
      source: row.source?.trim() || 'import',
      tags,
      status: row.status || defaultStatus || 'registrant',
      score: 0,
    }

    if (row.campaign?.trim()) record.campaign = row.campaign.trim()
    if (purchaseAmountRaw !== null && !isNaN(purchaseAmountRaw)) record.purchase_amount = purchaseAmountRaw
    if (row.is_registrant != null) record.is_registrant = row.is_registrant
    else if (defaultStatus === 'registrant') record.is_registrant = true
    if (row.survey_data && Object.keys(row.survey_data).length > 0) record.survey_data = row.survey_data

    valid.push(record)
  }

  if (!valid.length) {
    return NextResponse.json({ imported: 0, skipped: skippedEmails.length, errors: skippedEmails })
  }

  // ── Process in batches of 200 ──────────────────────────────────────────────
  // SELECT in sub-chunks of 50 to stay under PostgREST's URL-length limit.
  // INSERT new leads in bulk; UPDATE existing ones in parallel chunks of 10.
  const BATCH        = 200
  const SELECT_CHUNK = 50
  const UPDATE_CHUNK = 10

  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch      = valid.slice(i, i + BATCH)
    const emails     = batch.map((r) => r.email as string)

    // ── 1. Find which emails already exist ──────────────────────────────────
    const existingMap = new Map<string, string>() // email → lead id
    for (let j = 0; j < emails.length; j += SELECT_CHUNK) {
      const chunk = emails.slice(j, j + SELECT_CHUNK)
      const { data, error } = await admin
        .from('leads')
        .select('id, email')
        .eq('project_id', projectId)
        .in('email', chunk)
      if (error) {
        console.error('Import lookup error:', error)
        errors.push(`Lookup error: ${error.message}`)
      } else {
        for (const r of data ?? []) existingMap.set(r.email, r.id)
      }
    }

    const toInsert = batch.filter((r) => !existingMap.has(r.email as string))
    const toUpdate = batch.filter((r) =>  existingMap.has(r.email as string))

    // ── 2. Bulk INSERT new leads ─────────────────────────────────────────────
    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from('leads') as any).insert(toInsert)
      if (error) {
        console.error('Import insert error:', error)
        errors.push(`Insert error: ${error.message}`)
      } else {
        imported += toInsert.length
      }
    }

    // ── 3. UPDATE existing leads (status + survey_data + name) ──────────────
    for (let j = 0; j < toUpdate.length; j += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(j, j + UPDATE_CHUNK)
      const results = await Promise.all(
        chunk.map((row) => {
          const updateData: LeadRecord = { status: row.status }
          if (row.survey_data) updateData.survey_data = row.survey_data
          if (row.full_name)   updateData.full_name   = row.full_name
          if (row.tags && (row.tags as string[]).length > 0) updateData.tags = row.tags
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (admin.from('leads') as any)
            .update(updateData)
            .eq('project_id', projectId)
            .eq('email', row.email as string)
        })
      )
      for (const { error } of results) {
        if (error) {
          console.error('Import update error:', error)
          errors.push(`Update error: ${error.message}`)
        } else {
          imported++
        }
      }
    }
  }

  return NextResponse.json({ imported, skipped: skippedEmails.length, errors })
}
