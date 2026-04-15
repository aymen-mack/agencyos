import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  generateFakeLeads,
  generateFakeWebinarMetrics,
  generateFakeAdMetrics,
  generateFakeEmailMetrics,
} from '@/lib/fake-dashboard-data'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const admin = createSupabaseAdminClient() as AnyClient

  // Verify project exists
  const { data: project } = await admin.from('client_projects').select('id').eq('id', projectId).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const leads = generateFakeLeads(150)
  const webinarMetrics = generateFakeWebinarMetrics(90)
  const adMetrics = generateFakeAdMetrics(90)
  const emailMetrics = generateFakeEmailMetrics(90)

  // Insert leads (upsert on email to handle re-seeding)
  const leadsWithProject = leads.map((l) => ({ ...l, project_id: projectId }))
  const { error: leadsErr, count: leadsCount } = await admin
    .from('leads')
    .upsert(leadsWithProject, { onConflict: 'project_id,email', count: 'exact' })

  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 })

  // Insert webinar metrics
  const webinarWithProject = webinarMetrics.map((m) => ({ ...m, project_id: projectId }))
  const { error: webinarErr } = await admin
    .from('webinar_metrics')
    .upsert(webinarWithProject, { onConflict: 'project_id,webinar_id,date' })

  if (webinarErr) return NextResponse.json({ error: webinarErr.message }, { status: 500 })

  // Insert ad metrics
  const adWithProject = adMetrics.map((m) => ({ ...m, project_id: projectId }))
  const { error: adErr } = await admin
    .from('ad_metrics')
    .upsert(adWithProject, { onConflict: 'project_id,platform,campaign_id,ad_set_id,date' })

  if (adErr) return NextResponse.json({ error: adErr.message }, { status: 500 })

  // Insert email metrics
  const emailWithProject = emailMetrics.map((m) => ({ ...m, project_id: projectId }))
  const { error: emailErr } = await admin
    .from('email_metrics')
    .upsert(emailWithProject, { onConflict: 'project_id,provider,campaign_id,sequence_id,date' })

  if (emailErr) return NextResponse.json({ error: emailErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    inserted: {
      leads: leadsCount,
      webinar_metrics: webinarMetrics.length,
      ad_metrics: adMetrics.length,
      email_metrics: emailMetrics.length,
    },
  })
}

// DELETE: remove all seeded data (leads with survey_data._seed = true + seeded metrics)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const admin = createSupabaseAdminClient() as AnyClient

  // Delete seeded leads
  await admin
    .from('leads')
    .delete()
    .eq('project_id', projectId)
    .contains('survey_data', { _seed: true })

  // Delete seeded webinar metrics
  await admin
    .from('webinar_metrics')
    .delete()
    .eq('project_id', projectId)
    .eq('webinar_id', 'seed-webinar-001')

  // Delete seeded ad metrics
  await admin
    .from('ad_metrics')
    .delete()
    .eq('project_id', projectId)
    .eq('campaign_id', 'seed-fb-camp-001')

  await admin
    .from('ad_metrics')
    .delete()
    .eq('project_id', projectId)
    .eq('campaign_id', 'seed-goog-camp-001')

  // Delete seeded email metrics
  await admin
    .from('email_metrics')
    .delete()
    .eq('project_id', projectId)
    .eq('campaign_id', 'seed-email-camp-001')

  return NextResponse.json({ ok: true })
}
