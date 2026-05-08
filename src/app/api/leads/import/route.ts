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
}

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

  type LeadInsert = {
    project_id: string; email: string; full_name: string | null; phone: string | null
    source: string; campaign: string | null; tags: string[]; purchase_amount: number | null
    status: string; is_registrant: boolean; score: number
  }
  // Normalize and validate rows — skip any without a valid email
  const valid: LeadInsert[] = []
  const skippedReasons: string[] = []

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skippedReasons.push(email || '(empty)')
      continue
    }

    const tags = row.tags
      ? row.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const purchaseAmount = row.purchase_amount
      ? parseFloat(row.purchase_amount.replace(/[^0-9.]/g, ''))
      : null

    valid.push({
      project_id: projectId,
      email,
      full_name: row.full_name?.trim() || null,
      phone: row.phone?.trim() || null,
      source: row.source?.trim() || 'import',
      campaign: row.campaign?.trim() || null,
      tags,
      purchase_amount: (purchaseAmount === null || isNaN(purchaseAmount)) ? null : purchaseAmount,
      status: row.status || defaultStatus || 'registrant',
      is_registrant: row.is_registrant ?? (defaultStatus === 'registrant'),
      score: 0,
    })
  }

  if (!valid.length) {
    return NextResponse.json({ imported: 0, skipped: rows.length, errors: skippedReasons })
  }

  // Upsert in batches of 500 — on conflict (email+project_id) update all mapped fields
  const BATCH = 500
  let imported = 0
  const errors: string[] = [...skippedReasons]

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH)
    const { error } = await admin
      .from('leads')
      .upsert(batch, {
        onConflict: 'project_id,email',
        ignoreDuplicates: false,
      })

    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    } else {
      imported += batch.length
    }
  }

  return NextResponse.json({
    imported,
    skipped: rows.length - valid.length,
    errors,
  })
}
