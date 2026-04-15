'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { EmailMetrics } from '@/types/database'
import { useRealtime } from '@/components/providers/realtime-provider'
import { MetricsCard } from './metrics-card'
import { MetricsSkeleton } from './metric-skeleton'
import { Mail, MousePointer, TrendingUp, Users } from 'lucide-react'

interface EmailTabProps {
  projectId: string
}

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function EmailTab({ projectId }: EmailTabProps) {
  const { getToken } = useAuth()
  const { lastMetricUpdate } = useRealtime()
  const [metrics, setMetrics] = useState<EmailMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken({ template: 'supabase' })
      if (!token) return
      const supabase = createSupabaseClientWithToken(token)
      const { data } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(90)
      setMetrics(data || [])
      setLoading(false)
    }
    load()
  }, [projectId, getToken, lastMetricUpdate])

  if (loading) return <MetricsSkeleton count={6} />

  const agg = metrics.reduce(
    (acc, m) => ({
      sent: acc.sent + m.sent,
      delivered: acc.delivered + m.delivered,
      opens: acc.opens + m.opens,
      clicks: acc.clicks + m.clicks,
      unsubscribes: acc.unsubscribes + m.unsubscribes,
      signups: acc.signups + m.signups,
    }),
    { sent: 0, delivered: 0, opens: 0, clicks: 0, unsubscribes: 0, signups: 0 }
  )

  const openRate = agg.delivered ? ((agg.opens / agg.delivered) * 100).toFixed(1) + '%' : '0%'
  const ctr = agg.delivered ? ((agg.clicks / agg.delivered) * 100).toFixed(2) + '%' : '0%'
  const unsubRate = agg.delivered ? ((agg.unsubscribes / agg.delivered) * 100).toFixed(2) + '%' : '0%'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Email Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricsCard label="Emails Sent" value={fmtK(agg.sent)} icon={Mail} />
          <MetricsCard label="Delivered" value={fmtK(agg.delivered)} sub="of sent" icon={Mail} />
          <MetricsCard label="Opens" value={fmtK(agg.opens)} sub={`${openRate} open rate`} icon={Mail} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Engagement</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Open Rate" value={openRate} icon={TrendingUp} highlight />
          <MetricsCard label="CTR" value={ctr} sub="click-through rate" icon={MousePointer} />
          <MetricsCard label="Clicks" value={fmtK(agg.clicks)} icon={MousePointer} />
          <MetricsCard label="Signups from Email" value={fmtK(agg.signups)} icon={Users} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricsCard label="Unsubscribes" value={fmtK(agg.unsubscribes)} sub={`${unsubRate} rate`} />
          <MetricsCard label="Total Sequences" value={new Set(metrics.map((m) => m.sequence_id).filter(Boolean)).size} />
          <MetricsCard label="Campaigns" value={new Set(metrics.map((m) => m.campaign_id).filter(Boolean)).size} />
        </div>
      </div>
    </div>
  )
}
