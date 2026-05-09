import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { extractSurveyFields, getLeadQuality, getMode, LeadQuality } from '@/lib/survey-fields'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

function increment(map: Record<string, number>, key: string | null) {
  if (!key) return
  map[key] = (map[key] || 0) + 1
}

async function fetchAllSurveyLeads(admin: AnyRow, projectId: string): Promise<AnyRow[]> {
  const BATCH = 1000
  const all: AnyRow[] = []
  let offset = 0
  while (true) {
    const { data, error } = await admin
      .from('leads')
      .select('id,email,full_name,status,source,survey_data,tags,created_at')
      .eq('project_id', projectId)
      .or('source.eq.typeform,status.eq.survey_filled')
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH - 1)
    if (error || !data?.length) break
    all.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }
  return all
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const admin = createSupabaseAdminClient()
  const leads = await fetchAllSurveyLeads(admin, projectId)

  const quality: Record<LeadQuality, number> = {
    most_likely: 0, likely: 0, probable: 0, least_likely: 0,
  }
  const income: Record<string, number> = {}
  const age: Record<string, number> = {}
  const occupation: Record<string, number> = {}
  const sophistication: Record<string, number> = {}
  const previous_investment: Record<string, number> = {}
  const speed: Record<string, number> = {}

  for (const lead of leads) {
    const data = (lead.survey_data as Record<string, unknown>) || {}
    const fields = extractSurveyFields(data)
    const q = getLeadQuality(data)
    quality[q]++

    increment(income, fields.monthly_income)
    increment(age, fields.age)
    increment(occupation, fields.occupation)
    increment(sophistication, fields.sophistication)
    increment(previous_investment, fields.previous_investment)
    increment(speed, fields.speed_to_action)
  }

  const total = leads.length

  // Current avatar: modal value per field
  const avatar = {
    age: getMode(age),
    income: getMode(income),
    sophistication: getMode(sophistication),
    previous_investment: getMode(previous_investment),
    speed: getMode(speed),
  }

  return NextResponse.json({
    total,
    quality,
    charts: { income, age, occupation, sophistication, previous_investment, speed },
    avatar,
  })
}
