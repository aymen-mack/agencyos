'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { AdMetrics } from '@/types/database'
import { useRealtime } from '@/components/providers/realtime-provider'
import { MetricsCard } from './metrics-card'
import { MetricsSkeleton } from './metric-skeleton'
import { DollarSign, MousePointer, Eye, TrendingUp, Target, Users } from 'lucide-react'

interface AdSpendTabProps {
  projectId: string
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}
function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function AdSpendTab({ projectId }: AdSpendTabProps) {
  const { getToken } = useAuth()
  const { lastMetricUpdate } = useRealtime()
  const [metrics, setMetrics] = useState<AdMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken({ template: 'supabase' })
      if (!token) return
      const supabase = createSupabaseClientWithToken(token)
      const { data } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(90)
      setMetrics(data || [])
      setLoading(false)
    }
    load()
  }, [projectId, getToken, lastMetricUpdate])

  if (loading) return <MetricsSkeleton count={8} />

  // Aggregate
  const agg = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      landing_page_views: acc.landing_page_views + m.landing_page_views,
      signups: acc.signups + m.signups,
      leads: acc.leads + m.leads,
      conversions: acc.conversions + m.conversions,
      revenue: acc.revenue + m.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, landing_page_views: 0, signups: 0, leads: 0, conversions: 0, revenue: 0 }
  )

  const cpm = agg.impressions ? (agg.spend / agg.impressions) * 1000 : 0
  const cpc = agg.clicks ? agg.spend / agg.clicks : 0
  const cpr = agg.signups ? agg.spend / agg.signups : 0
  const roas = agg.spend ? agg.revenue / agg.spend : 0

  // Group by platform for breakdown
  const byPlatform: Record<string, typeof agg> = {}
  for (const m of metrics) {
    if (!byPlatform[m.platform]) {
      byPlatform[m.platform] = { spend: 0, impressions: 0, clicks: 0, landing_page_views: 0, signups: 0, leads: 0, conversions: 0, revenue: 0 }
    }
    byPlatform[m.platform].spend += m.spend
    byPlatform[m.platform].clicks += m.clicks
    byPlatform[m.platform].leads += m.leads
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Ad Spend Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Total Spend" value={fmtCurrency(agg.spend)} icon={DollarSign} highlight />
          <MetricsCard label="Impressions" value={fmtK(agg.impressions)} icon={Eye} />
          <MetricsCard label="CPM" value={fmtCurrency(cpm)} sub="cost per 1k impressions" icon={Eye} />
          <MetricsCard label="Clicks" value={fmtK(agg.clicks)} icon={MousePointer} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Conversion Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="CPC" value={fmtCurrency(cpc)} sub="cost per click" icon={MousePointer} />
          <MetricsCard label="Landing Page Views" value={fmtK(agg.landing_page_views)} icon={Eye} />
          <MetricsCard label="CPR" value={fmtCurrency(cpr)} sub="cost per registration" icon={Target} />
          <MetricsCard label="Signups from Ads" value={fmtK(agg.signups)} icon={Users} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Returns</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Ad Revenue" value={fmtCurrency(agg.revenue)} icon={TrendingUp} />
          <MetricsCard label="ROAS" value={`${roas.toFixed(2)}x`} sub="return on ad spend" icon={TrendingUp} />
          <MetricsCard label="Leads" value={fmtK(agg.leads)} icon={Users} />
          <MetricsCard label="Conversions" value={fmtK(agg.conversions)} icon={Target} />
        </div>
      </div>

      {Object.keys(byPlatform).length > 1 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">By Platform</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Platform</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Spend</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Leads</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byPlatform).map(([platform, data]) => (
                  <tr key={platform} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 capitalize">{platform}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(data.spend)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtK(data.clicks)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtK(data.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
