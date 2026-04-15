'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClientWithToken } from '@/lib/supabase/client'
import { WebinarMetrics } from '@/types/database'
import { useRealtime } from '@/components/providers/realtime-provider'
import { MetricsCard } from './metrics-card'
import { MetricsSkeleton } from './metric-skeleton'
import {
  Users, Eye, Ticket, ClipboardList, MessageCircle,
  PhoneCall, CheckCircle, DollarSign, TrendingUp, Zap
} from 'lucide-react'

interface WebinarTabProps {
  projectId: string
}

function fmt(n: number, currency = false): string {
  if (currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  }
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function pct(num: number, den: number): string {
  if (!den) return '0%'
  return `${((num / den) * 100).toFixed(1)}%`
}

function rpl(revenue: number, leads: number): string {
  if (!leads) return '$0'
  return fmt(revenue / leads, true)
}

export function WebinarTab({ projectId }: WebinarTabProps) {
  const { getToken } = useAuth()
  const { lastMetricUpdate } = useRealtime()
  const [metrics, setMetrics] = useState<WebinarMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken({ template: 'supabase' })
      if (!token) return
      const supabase = createSupabaseClientWithToken(token)
      const { data } = await supabase
        .from('webinar_metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(30)
      setMetrics(data || [])
      setLoading(false)
    }
    load()
  }, [projectId, getToken, lastMetricUpdate])

  if (loading) return <MetricsSkeleton count={16} />

  // Aggregate all rows
  const agg = metrics.reduce(
    (acc, m) => ({
      registrants: acc.registrants + m.registrants,
      attendees: acc.attendees + m.attendees,
      vip_tickets: acc.vip_tickets + m.vip_tickets,
      surveys_filled: acc.surveys_filled + m.surveys_filled,
      whatsapp_joins: acc.whatsapp_joins + m.whatsapp_joins,
      telegram_joins: acc.telegram_joins + m.telegram_joins,
      applicants: acc.applicants + m.applicants,
      calls_booked: acc.calls_booked + m.calls_booked,
      calls_showed: acc.calls_showed + m.calls_showed,
      deals_closed: acc.deals_closed + m.deals_closed,
      avg_contract_val: m.avg_contract_val, // take latest
      total_cash: acc.total_cash + m.total_cash,
      total_revenue: acc.total_revenue + m.total_revenue,
    }),
    {
      registrants: 0, attendees: 0, vip_tickets: 0, surveys_filled: 0,
      whatsapp_joins: 0, telegram_joins: 0, applicants: 0, calls_booked: 0,
      calls_showed: 0, deals_closed: 0, avg_contract_val: 0, total_cash: 0, total_revenue: 0,
    }
  )

  const rpl_val = rpl(agg.total_revenue, agg.registrants)
  const rps_val = rpl(agg.total_revenue, agg.attendees)
  const rpc_val = rpl(agg.total_revenue, agg.calls_booked)
  const show_rate = pct(agg.attendees, agg.registrants)
  const call_show_rate = pct(agg.calls_showed, agg.calls_booked)
  const close_rate = pct(agg.deals_closed, agg.calls_showed)

  return (
    <div className="space-y-6">
      {/* Primary metrics */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Funnel Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Registrants" value={fmt(agg.registrants)} icon={Users} />
          <MetricsCard label="Shows" value={fmt(agg.attendees)} sub={`${show_rate} show rate`} icon={Eye} />
          <MetricsCard label="VIP Tickets" value={fmt(agg.vip_tickets)} icon={Ticket} />
          <MetricsCard label="Surveys Filled" value={fmt(agg.surveys_filled)} icon={ClipboardList} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Community & Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="WhatsApp Joins" value={fmt(agg.whatsapp_joins)} icon={MessageCircle} />
          <MetricsCard label="Telegram Joins" value={fmt(agg.telegram_joins)} icon={MessageCircle} />
          <MetricsCard label="Applicants" value={fmt(agg.applicants)} icon={Users} />
          <MetricsCard label="Calls Booked" value={fmt(agg.calls_booked)} icon={PhoneCall} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Sales Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Call Shows" value={fmt(agg.calls_showed)} sub={`${call_show_rate} show rate`} icon={PhoneCall} />
          <MetricsCard label="Deals Closed" value={fmt(agg.deals_closed)} sub={`${close_rate} close rate`} icon={CheckCircle} />
          <MetricsCard label="Avg Contract" value={fmt(agg.avg_contract_val, true)} icon={DollarSign} />
          <MetricsCard label="Cash Collected" value={fmt(agg.total_cash, true)} icon={DollarSign} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Revenue Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard label="Total Revenue" value={fmt(agg.total_revenue, true)} icon={TrendingUp} highlight />
          <MetricsCard label="Revenue / Lead" value={rpl_val} icon={Zap} />
          <MetricsCard label="Revenue / Show" value={rps_val} icon={Zap} />
          <MetricsCard label="Revenue / Call" value={rpc_val} icon={Zap} />
        </div>
      </div>
    </div>
  )
}
