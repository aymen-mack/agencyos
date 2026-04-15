'use client'

import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Settings, X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChartWidgetConfig, DashboardRawData, XAxisField, YAxisField } from './types'
import { ChartConfigModal } from './chart-config-modal'

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16']
const STATUS_COLORS: Record<string, string> = {
  purchased: '#10b981',
  attended:  '#3b82f6',
  registered:'#6b7280',
  no_show:   '#f59e0b',
  refunded:  '#ef4444',
}

function processData(rawData: DashboardRawData, config: ChartWidgetConfig) {
  const { xAxis, yAxis } = config

  // Date-based charts — use webinar metrics or ad metrics
  if (xAxis === 'date') {
    if (yAxis === 'total_cash' || yAxis === 'total_revenue') {
      return rawData.revenue_over_time.map((d) => ({
        label: d.date.slice(5), // MM-DD
        'Cash Collected': Math.round(d.cash_collected),
        'Total Revenue': Math.round(d.total_revenue),
        value: Math.round(yAxis === 'total_cash' ? d.cash_collected : d.total_revenue),
      }))
    }
    if (yAxis === 'ad_spend') {
      return rawData.ad_spend_over_time.map((d) => ({
        label: d.date.slice(5),
        'Ad Spend': Math.round(d.spend),
        Revenue: Math.round(d.revenue),
        value: Math.round(d.spend),
      }))
    }
    if (yAxis === 'calls_booked') {
      return rawData.webinar_metrics.map((m: Record<string, unknown>) => ({
        label: String(m.date).slice(5),
        value: Number(m.calls_booked) || 0,
        'Calls Booked': Number(m.calls_booked) || 0,
      })).sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
    }
    if (yAxis === 'registrations') {
      // group leads by date
      const byDate: Record<string, number> = {}
      for (const l of rawData.leads_summary) {
        const d = String(l.created_at).slice(0, 10).slice(5)
        byDate[d] = (byDate[d] || 0) + 1
      }
      return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value, Registrations: value }))
    }
    if (yAxis === 'open_rate' || yAxis === 'click_rate') {
      const field = yAxis === 'open_rate' ? 'open_rate' : 'click_rate'
      return rawData.email_metrics.map((m: Record<string, unknown>) => ({
        label: String(m.date).slice(5),
        value: Number(m[field]) || 0,
        [yAxis === 'open_rate' ? 'Open Rate' : 'Click Rate']: Number(m[field]) || 0,
      })).sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
    }
  }

  // Source-based charts
  if (xAxis === 'source') {
    if (yAxis === 'registrations' || yAxis === 'attendance_count') {
      return rawData.traffic_sources.map((d) => ({
        label: d.source,
        value: yAxis === 'attendance_count' ? rawData.leads_summary.filter((l: { source: string; attended: boolean }) => l.source === d.source && l.attended).length : d.count,
        name: d.source,
        count: d.count,
      }))
    }
    if (yAxis === 'revenue' || yAxis === 'total_revenue') {
      return rawData.revenue_by_source.map((d) => ({
        label: d.source,
        value: Math.round(d.revenue),
        Revenue: Math.round(d.revenue),
      }))
    }
    if (yAxis === 'ad_spend') {
      const byPlatform: Record<string, number> = {}
      for (const m of rawData.ad_metrics) {
        byPlatform[m.platform] = (byPlatform[m.platform] || 0) + (Number(m.spend) || 0)
      }
      return Object.entries(byPlatform).map(([label, value]) => ({ label, value: Math.round(value) }))
    }
  }

  // Status-based charts
  if (xAxis === 'status') {
    return rawData.status_breakdown.map((d) => ({
      label: d.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      rawStatus: d.status,
      value: d.count,
      Count: d.count,
    }))
  }

  // Campaign-based charts
  if (xAxis === 'campaign') {
    const byCampaign: Record<string, { count: number; revenue: number; attended: number }> = {}
    for (const l of rawData.leads_summary) {
      const c = l.campaign || 'Unknown'
      if (!byCampaign[c]) byCampaign[c] = { count: 0, revenue: 0, attended: 0 }
      byCampaign[c].count++
      byCampaign[c].revenue += Number(l.purchase_amount) || 0
      if (l.attended) byCampaign[c].attended++
    }
    return Object.entries(byCampaign).map(([label, d]) => ({
      label,
      value: yAxis === 'revenue' ? Math.round(d.revenue) : yAxis === 'attendance_count' ? d.attended : d.count,
      Registrations: d.count,
      Revenue: Math.round(d.revenue),
      Attended: d.attended,
    }))
  }

  // Platform
  if (xAxis === 'platform') {
    const byPlatform: Record<string, { spend: number; revenue: number }> = {}
    for (const m of rawData.ad_metrics) {
      const p = m.platform || 'unknown'
      if (!byPlatform[p]) byPlatform[p] = { spend: 0, revenue: 0 }
      byPlatform[p].spend += Number(m.spend) || 0
      byPlatform[p].revenue += Number(m.revenue) || 0
    }
    return Object.entries(byPlatform).map(([label, d]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: yAxis === 'ad_spend' ? Math.round(d.spend) : Math.round(d.revenue),
      'Ad Spend': Math.round(d.spend),
      Revenue: Math.round(d.revenue),
    }))
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-white/[0.1] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{typeof p.value === 'number' && p.value > 999 ? `$${(p.value / 1000).toFixed(1)}k` : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function ChartRenderer({ config, data }: { config: ChartWidgetConfig; data: ReturnType<typeof processData> }) {
  const { chartType } = config

  const axisStyle = { fontSize: 11, fill: '#71717a' }
  const gridProps = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' }

  if (chartType === 'donut') {
    const total = data.reduce((a, d) => a + d.value, 0)
    return (
      <div className="flex items-center gap-4 h-full">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {data.slice(0, 6).map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-muted-foreground truncate flex-1">{d.label}</span>
              <span className="text-foreground font-medium flex-shrink-0">
                {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (chartType === 'horizontal_bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
          <CartesianGrid {...gridProps} horizontal={false} />
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ ...axisStyle, textAnchor: 'end' }} axisLine={false} tickLine={false} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawStatus = (d as any).rawStatus as string | undefined
              return <Cell key={i} fill={rawStatus ? (STATUS_COLORS[rawStatus] || CHART_COLORS[0]) : CHART_COLORS[0]} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'bar' || chartType === 'stacked_bar') {
    const keys = Object.keys(data[0] || {}).filter((k) => k !== 'label' && k !== 'value' && k !== 'rawStatus' && k !== 'name' && k !== 'count')
    const dataKeys = keys.length ? keys : ['value']
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {dataKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} stackId={chartType === 'stacked_bar' ? 'a' : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line') {
    const keys = Object.keys(data[0] || {}).filter((k) => k !== 'label' && k !== 'value' && k !== 'rawStatus' && k !== 'name' && k !== 'count')
    const dataKeys = keys.length ? keys : ['value']
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {dataKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2} dot={false}
              strokeDasharray={i > 0 ? '4 4' : undefined} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // area (default)
  const keys = Object.keys(data[0] || {}).filter((k) => k !== 'label' && k !== 'value' && k !== 'rawStatus' && k !== 'name' && k !== 'count')
  const dataKeys = keys.length ? keys : ['value']
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <defs>
          {dataKeys.map((k, i) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} />
        {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {dataKeys.map((k, i) => (
          <Area key={k} type="monotone" dataKey={k}
            stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
            fill={`url(#fill-${k})`} dot={false}
            strokeDasharray={i > 0 ? '4 4' : undefined} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface ChartWidgetProps {
  config: ChartWidgetConfig
  rawData: DashboardRawData | null
  onUpdate: (updated: ChartWidgetConfig) => void
  onRemove: () => void
}

export function ChartWidget({ config, rawData, onUpdate, onRemove }: ChartWidgetProps) {
  const [configOpen, setConfigOpen] = useState(false)

  const data = rawData ? processData(rawData, config) : []

  return (
    <div className={cn('bg-card border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden', config.width === 'full' ? 'col-span-2' : '')}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.05] flex-shrink-0">
        <h3 className="text-sm font-semibold flex-1">{config.title}</h3>
        <button
          onClick={() => setConfigOpen(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title="Configure"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onUpdate({ ...config, width: config.width === 'half' ? 'full' : 'half' })}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title={config.width === 'half' ? 'Expand' : 'Shrink'}
        >
          {config.width === 'half' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove widget"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4 min-h-[220px]">
        {!rawData ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
        ) : (
          <ChartRenderer config={config} data={data} />
        )}
      </div>

      <ChartConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        initial={config}
        onSave={(updated) => {
          onUpdate({ ...config, ...updated })
          setConfigOpen(false)
        }}
      />
    </div>
  )
}
