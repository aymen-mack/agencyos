import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

function fmt(start: Date, end: Date) {
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

// Supabase PostgREST caps at max-rows (default 1000) per request regardless of .limit().
// Paginate in 1000-row batches until all leads are collected.
async function fetchAllLeadsInRange(
  admin: AnyClient,
  projectId: string,
  from: string,
  to: string
): Promise<AnyClient[]> {
  const BATCH = 1000
  const all: AnyClient[] = []
  let offset = 0
  while (true) {
    const { data, error } = await admin
      .from('leads')
      .select('id,source,status,campaign,attended,purchase_amount,is_registrant,created_at')
      .eq('project_id', projectId)
      .gte('created_at', from)
      .lte('created_at', to)
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
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const sp = req.nextUrl.searchParams
  const start = new Date(sp.get('start') || new Date(Date.now() - 30 * 86400000).toISOString())
  const end = new Date(sp.get('end') || new Date().toISOString())

  // Previous period (same duration)
  const duration = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - duration)

  const admin = createSupabaseAdminClient() as AnyClient
  const { start: s, end: e } = fmt(start, end)
  const { start: ps, end: pe } = fmt(prevStart, prevEnd)

  // Fetch current period data
  const [
    { data: webinarCurr },
    { data: webinarPrev },
    { data: adCurr },
    { data: adPrev },
    { data: emailCurr },
    { data: emailPrev },
    leadsCurr,
    leadsPrev,
  ] = await Promise.all([
    admin.from('webinar_metrics').select('*').eq('project_id', projectId).gte('date', s).lte('date', e),
    admin.from('webinar_metrics').select('*').eq('project_id', projectId).gte('date', ps).lte('date', pe),
    admin.from('ad_metrics').select('*').eq('project_id', projectId).gte('date', s).lte('date', e),
    admin.from('ad_metrics').select('*').eq('project_id', projectId).gte('date', ps).lte('date', pe),
    admin.from('email_metrics').select('*').eq('project_id', projectId).gte('date', s).lte('date', e),
    admin.from('email_metrics').select('*').eq('project_id', projectId).gte('date', ps).lte('date', pe),
    fetchAllLeadsInRange(admin, projectId, start.toISOString(), end.toISOString()),
    fetchAllLeadsInRange(admin, projectId, prevStart.toISOString(), prevEnd.toISOString()),
  ])

  const wm = (webinarCurr || []) as Record<string, number>[]
  const wmPrev = (webinarPrev || []) as Record<string, number>[]
  const am = (adCurr || []) as Record<string, number>[]
  const amPrev = (adPrev || []) as Record<string, number>[]
  const em = (emailCurr || []) as Record<string, number>[]
  const emPrev = (emailPrev || []) as Record<string, number>[]
  const lc = leadsCurr
  const lp = leadsPrev

  function sumField(rows: Record<string, number>[], field: string) {
    return rows.reduce((a, r) => a + (Number(r[field]) || 0), 0)
  }
  function avgField(rows: Record<string, number>[], field: string) {
    if (!rows.length) return 0
    return rows.reduce((a, r) => a + (Number(r[field]) || 0), 0) / rows.length
  }

  // KPI computations — cash from real lead purchase_amount (Stripe/Whop) + webinar_metrics fallback
  const totalCash = sumField(wm, 'total_cash') + lc.reduce((s: number, l: { purchase_amount?: number }) => s + (Number(l.purchase_amount) || 0), 0)
  const totalCashPrev = sumField(wmPrev, 'total_cash') + lp.reduce((s: number, l: { purchase_amount?: number }) => s + (Number(l.purchase_amount) || 0), 0)

  const totalRevenue = sumField(wm, 'total_revenue')
  const totalRevenuePrev = sumField(wmPrev, 'total_revenue')

  const callsBooked = sumField(wm, 'calls_booked')
  const callsBookedPrev = sumField(wmPrev, 'calls_booked')

  const dealsClosed = sumField(wm, 'deals_closed')
  const dealsClosedPrev = sumField(wmPrev, 'deals_closed')

  const avgPerClose = dealsClosed > 0 ? totalRevenue / dealsClosed : 0
  const avgPerClosePrev = dealsClosedPrev > 0 ? totalRevenuePrev / dealsClosedPrev : 0

  // is_registrant is the explicit source of truth — set by registration webhooks, toggled via bulk UI
  const totalReg = lc.filter((l) => l.is_registrant === true).length
  const totalRegPrev = lp.filter((l: { is_registrant: boolean }) => l.is_registrant === true).length

  const totalAttended = lc.filter((l) => l.attended).length
  const showRate = totalReg > 0 ? (totalAttended / totalReg) * 100 : 0
  const showRatePrev = totalRegPrev > 0 ? (lp.filter((l: { attended: boolean }) => l.attended).length / totalRegPrev) * 100 : 0

  // Closed deals = anyone with a purchase_amount recorded — same source of truth as Cash Collected
  const totalPurchased = lc.filter((l) => Number(l.purchase_amount) > 0).length
  const convRate = totalReg > 0 ? (totalPurchased / totalReg) * 100 : 0
  const convRatePrev = totalRegPrev > 0 ? (lp.filter((l: { purchase_amount?: number }) => Number(l.purchase_amount) > 0).length / totalRegPrev) * 100 : 0

  const totalRefunded = lc.filter((l) => l.status === 'refunded').length
  const refundRate = totalPurchased + totalRefunded > 0 ? (totalRefunded / (totalPurchased + totalRefunded)) * 100 : 0
  const prevPurchased = lp.filter((l: { purchase_amount?: number }) => Number(l.purchase_amount) > 0).length
  const prevRefunded = lp.filter((l: { status: string }) => l.status === 'refunded').length
  const refundRatePrev = prevPurchased + prevRefunded > 0 ? (prevRefunded / (prevPurchased + prevRefunded)) * 100 : 0

  const totalAdSpend = sumField(am, 'spend')
  const totalAdSpendPrev = sumField(amPrev, 'spend')

  const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0
  const roasPrev = totalAdSpendPrev > 0 ? totalRevenuePrev / totalAdSpendPrev : 0

  const cpr = totalReg > 0 && totalAdSpend > 0 ? totalAdSpend / totalReg : 0
  const cprPrev = totalRegPrev > 0 && totalAdSpendPrev > 0 ? totalAdSpendPrev / totalRegPrev : 0

  const emailOpenRate = avgField(em, 'open_rate')
  const emailOpenRatePrev = avgField(emPrev, 'open_rate')

  // Build sparkline: 7 evenly-spaced points across the range
  function buildSparkline(rows: Record<string, number>[], field: string, dateField = 'date') {
    if (!rows.length) return Array(7).fill(0)
    const sorted = [...rows].sort((a, b) => String(a[dateField]).localeCompare(String(b[dateField])))
    const n = sorted.length
    const step = Math.max(1, Math.floor(n / 7))
    const points = []
    for (let i = 0; i < 7; i++) {
      const idx = Math.min(i * step, n - 1)
      points.push(Number(sorted[idx][field]) || 0)
    }
    return points
  }

  // Revenue over time (grouped by date) — webinar_metrics + lead purchase amounts
  const revenueByDate: Record<string, { date: string; cash_collected: number; total_revenue: number }> = {}
  for (const row of wm) {
    const d = String(row.date)
    if (!revenueByDate[d]) revenueByDate[d] = { date: d, cash_collected: 0, total_revenue: 0 }
    revenueByDate[d].cash_collected += Number(row.total_cash) || 0
    revenueByDate[d].total_revenue += Number(row.total_revenue) || 0
  }
  for (const l of lc) {
    if (!l.purchase_amount) continue
    const d = String(l.created_at).split('T')[0]
    if (!revenueByDate[d]) revenueByDate[d] = { date: d, cash_collected: 0, total_revenue: 0 }
    revenueByDate[d].cash_collected += Number(l.purchase_amount) || 0
    revenueByDate[d].total_revenue += Number(l.purchase_amount) || 0
  }

  // Traffic sources (leads count by source)
  const sourceCount: Record<string, number> = {}
  const sourceRevenue: Record<string, number> = {}
  for (const l of lc) {
    const src = l.source || 'Direct'
    sourceCount[src] = (sourceCount[src] || 0) + 1
    sourceRevenue[src] = (sourceRevenue[src] || 0) + (Number(l.purchase_amount) || 0)
  }

  // Status breakdown
  const statusCount: Record<string, number> = {}
  for (const l of lc) {
    const st = l.status || 'registered'
    statusCount[st] = (statusCount[st] || 0) + 1
  }

  // Ad spend by date
  const adByDate: Record<string, { date: string; spend: number; revenue: number }> = {}
  for (const row of am) {
    const d = String(row.date)
    if (!adByDate[d]) adByDate[d] = { date: d, spend: 0, revenue: 0 }
    adByDate[d].spend += Number(row.spend) || 0
    adByDate[d].revenue += Number(row.revenue) || 0
  }

  return NextResponse.json({
    kpis: {
      total_cash:        { current: totalCash,       previous: totalCashPrev,       sparkline: buildSparkline(wm, 'total_cash') },
      total_revenue:     { current: totalRevenue,    previous: totalRevenuePrev,    sparkline: buildSparkline(wm, 'total_revenue') },
      calls_booked:      { current: callsBooked,     previous: callsBookedPrev,     sparkline: buildSparkline(wm, 'calls_booked') },
      avg_per_close:     { current: avgPerClose,     previous: avgPerClosePrev,     sparkline: buildSparkline(wm, 'avg_contract_val') },
      total_registrations: { current: totalReg,      previous: totalRegPrev,        sparkline: Array(7).fill(0).map((_, i) => Math.floor(totalReg * (i + 1) / 7)) },
      show_rate:         { current: showRate,        previous: showRatePrev,        sparkline: buildSparkline(em, 'open_rate') },
      conversion_rate:   { current: convRate,        previous: convRatePrev,        sparkline: Array(7).fill(0) },
      refund_rate:       { current: refundRate,      previous: refundRatePrev,      sparkline: Array(7).fill(0) },
      total_ad_spend:    { current: totalAdSpend,    previous: totalAdSpendPrev,    sparkline: buildSparkline(am, 'spend') },
      roas:              { current: roas,            previous: roasPrev,            sparkline: Array(7).fill(0) },
      cost_per_reg:      { current: cpr,             previous: cprPrev,             sparkline: Array(7).fill(0) },
      email_open_rate:   { current: emailOpenRate,   previous: emailOpenRatePrev,   sparkline: buildSparkline(em, 'open_rate') },
    },
    rawData: {
      revenue_over_time: Object.values(revenueByDate).sort((a, b) => a.date.localeCompare(b.date)),
      traffic_sources: Object.entries(sourceCount).map(([source, count]) => ({ source, count, revenue: sourceRevenue[source] || 0 })).sort((a, b) => b.count - a.count),
      status_breakdown: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
      revenue_by_source: Object.entries(sourceRevenue).map(([source, revenue]) => ({ source, revenue })).sort((a, b) => b.revenue - a.revenue),
      ad_spend_over_time: Object.values(adByDate).sort((a, b) => a.date.localeCompare(b.date)),
      webinar_metrics: wm,
      leads_summary: lc,
      ad_metrics: am,
      email_metrics: em,
    },
  })
}
