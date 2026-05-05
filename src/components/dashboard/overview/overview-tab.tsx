'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import { Search, Database, CheckCircle2, Trash2, CalendarDays, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardSummary, DashboardLead } from './types'

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const TABLE_TABS = [
  { label: 'All',          filter: 'all'        },
  { label: 'Registrants',  filter: 'registered' },
  { label: 'Surveys',      filter: 'registered' },
  { label: 'Shows',        filter: 'attended'   },
  { label: 'Booked Calls', filter: 'attended'   },
  { label: 'Showed Deals', filter: 'attended'   },
  { label: 'Closed Deals', filter: 'purchased'  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="text-white font-semibold">${payload[0].value.toLocaleString()}</p>
    </div>
  )
}

interface Props { projectId: string }

type SeedState = 'idle' | 'seeding' | 'done' | 'deleting'

export function OverviewTab({ projectId }: Props) {
  const [period, setPeriod] = useState<'today' | 'custom'>('today')
  const [customOpen, setCustomOpen] = useState(false)
  const [customStart, setCustomStart] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0])
  const [customEnd, setCustomEnd]   = useState(() => new Date().toISOString().split('T')[0])
  const [summary, setSummary]   = useState<DashboardSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab]   = useState('All')
  const [leads, setLeads]       = useState<DashboardLead[]>([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [searchQuery, setSearchQuery]   = useState('')
  const [seedState, setSeedState] = useState<SeedState>('idle')

  const getRange = useCallback(() => {
    if (period === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end   = new Date(); end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    const start = new Date(customStart); start.setHours(0, 0, 0, 0)
    const end   = new Date(customEnd);   end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [period, customStart, customEnd])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    const { start, end } = getRange()
    const p = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() })
    const res = await fetch(`/api/dashboard/${projectId}/summary?${p}`)
    if (res.ok) setSummary(await res.json())
    setLoading(false)
  }, [projectId, getRange])

  const fetchLeads = useCallback(async (statusFilter: string, search: string) => {
    setLeadsLoading(true)
    const { start, end } = getRange()
    const p = new URLSearchParams({
      page: '1', limit: '25',
      status: statusFilter, search,
      sort: 'created_at', dir: 'desc',
      start: start.toISOString(), end: end.toISOString(),
    })
    const res = await fetch(`/api/dashboard/${projectId}/leads?${p}`)
    const json = await res.json()
    setLeads(json.leads || [])
    setLeadsTotal(json.total || 0)
    setLeadsLoading(false)
  }, [projectId, getRange])

  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => {
    const tab = TABLE_TABS.find((t) => t.label === activeTab) ?? TABLE_TABS[0]
    fetchLeads(tab.filter, searchQuery)
  }, [activeTab, searchQuery, fetchLeads])

  async function seedData() {
    setSeedState('seeding')
    await fetch(`/api/seed/${projectId}`, { method: 'POST' })
    setSeedState('done')
    setTimeout(() => setSeedState('idle'), 3000)
    fetchSummary()
  }
  async function deleteSeedData() {
    setSeedState('deleting')
    await fetch(`/api/seed/${projectId}`, { method: 'DELETE' })
    setSeedState('idle')
    fetchSummary()
  }

  // ── Derived metrics ────────────────────────────────────────────────────────
  const cashCollected   = summary?.kpis.total_cash.current ?? 0
  const yesterdayCash   = summary?.kpis.total_cash.previous ?? 0
  const registrants     = summary?.kpis.total_registrations.current ?? 0
  const callsBooked     = summary?.kpis.calls_booked.current ?? 0
  const breakdown       = summary?.rawData.status_breakdown ?? []
  const attendedCount   = (breakdown.find((s: Record<string, unknown>) => s.status === 'attended')?.count as number) ?? 0
  const purchasedCount  = (breakdown.find((s: Record<string, unknown>) => s.status === 'purchased')?.count as number) ?? 0
  const shows            = attendedCount + purchasedCount
  const surveysCompleted = (summary?.rawData.leads_summary ?? []).filter(
    (l: Record<string, unknown>) => l.source === 'typeform'
  ).length

  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0
  const surveysRate = pct(surveysCompleted, registrants)
  const showsRate   = pct(shows, registrants)
  const callsRate   = pct(callsBooked, shows)
  const closedRate  = pct(purchasedCount, callsBooked)

  const revenueData = (summary?.rawData.revenue_over_time ?? []).map((d) => ({
    label: d.date.slice(5),
    value: Math.round(d.cash_collected),
  }))
  const sourceData = (summary?.rawData.traffic_sources ?? []).map((d) => ({
    name: d.source, value: d.count,
  }))

  const fmtCash = (v: number) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const statCards = [
    { label: 'Registrants',       value: registrants,      rate: null         },
    { label: 'Surveys Completed', value: surveysCompleted, rate: surveysRate  },
    { label: 'Shows',             value: shows,            rate: showsRate    },
    { label: 'Booked Calls',      value: callsBooked,      rate: callsRate    },
    { label: 'Closed Deals',      value: purchasedCount,   rate: closedRate   },
  ]

  return (
    <div className="space-y-5">

      {/* ── Top row: toggle + seed buttons ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="relative flex items-center">
          <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-white/[0.07] rounded-lg p-1">
            <button
              onClick={() => { setPeriod('today'); setCustomOpen(false) }}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                period === 'today' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Today
            </button>
            <button
              onClick={() => { setPeriod('custom'); setCustomOpen((v) => !v) }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                period === 'custom' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Custom
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', customOpen && 'rotate-180')} />
            </button>
          </div>

          {/* Custom date picker dropdown */}
          {customOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCustomOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#1c1c1c] border border-white/[0.1] rounded-xl shadow-2xl p-3 w-56 space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Custom Range</p>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/40" />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/40" />
                <button onClick={() => { setCustomOpen(false); fetchSummary() }}
                  className="w-full py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                  Apply
                </button>
              </div>
            </>
          )}
        </div>

        {/* Seed helpers */}
        <div className="flex items-center gap-2">
          {seedState === 'idle' && (
            <>
              <button onClick={seedData} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-white/[0.06] rounded-lg hover:border-white/[0.12] transition-colors">
                <Database className="w-3.5 h-3.5" /> Seed data
              </button>
              <button onClick={deleteSeedData} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-red-400 border border-white/[0.06] rounded-lg hover:border-red-500/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear data
              </button>
            </>
          )}
          {seedState === 'seeding' && <span className="text-xs text-zinc-500">Seeding…</span>}
          {seedState === 'deleting' && <span className="text-xs text-zinc-500">Deleting…</span>}
          {seedState === 'done' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>}
        </div>
      </div>

      {/* ── Cash hero ───────────────────────────────────────────────────── */}
      <div className="flex items-end gap-14">
        <div>
          <p className="text-sm text-zinc-400 mb-1.5">Cash Collected</p>
          {loading
            ? <div className="h-10 w-48 rounded-lg animate-pulse bg-white/[0.06]" />
            : <p className="text-[2.6rem] font-bold tracking-tight leading-none">{fmtCash(cashCollected)}</p>
          }
        </div>
        <div className="pb-1">
          <p className="text-sm text-zinc-400 mb-1.5">Yesterday</p>
          {loading
            ? <div className="h-7 w-24 rounded-lg animate-pulse bg-white/[0.06]" />
            : <p className="text-xl font-semibold text-zinc-300">{fmtCash(yesterdayCash)}</p>
          }
        </div>
      </div>

      {/* ── 5 stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-zinc-400 mb-3">{card.label}</p>
            <div className="flex items-end gap-3">
              {loading
                ? <div className="h-9 w-16 rounded-lg animate-pulse bg-white/[0.06]" />
                : <p className="text-3xl font-bold leading-none">{card.value.toLocaleString()}</p>
              }
              {card.rate !== null && !loading && (
                <p className="text-sm text-zinc-400 pb-0.5">{card.rate}%</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Two charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Cash Collected Over Time */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
          <p className="text-sm font-medium mb-5">Cash Collected Over Time</p>
          <div className="h-44">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-600">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                    fill="url(#cashGrad)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Registrations From Source */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
          <p className="text-sm font-medium mb-5">Registrations From Source</p>
          <div className="h-44">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : sourceData.length === 0 ? (
              /* Empty state — mirrors the mockup gray ring */
              <div className="h-full flex items-center gap-8">
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: '55%' }}>
                  <div className="w-28 h-28 rounded-full border-[14px] border-zinc-700/50" />
                </div>
                <div className="flex-1 space-y-3">
                  {['YouTube', 'Instagram', 'Facebook', 'Direct'].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-zinc-700 flex-shrink-0" />
                      <span className="text-zinc-600">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center gap-6">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius="52%" outerRadius="76%" paddingAngle={2}>
                      {sourceData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {sourceData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-zinc-400 truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Data table ──────────────────────────────────────────────────── */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold">Data</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm placeholder:text-zinc-700 outline-none focus:ring-1 focus:ring-blue-500/30 w-44 text-white"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-5 border-b border-white/[0.05] overflow-x-auto">
          {TABLE_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={cn(
                'px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.label
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-700 pr-1 flex-shrink-0">{leadsTotal.toLocaleString()} total</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Name', 'Email', 'Source', 'Status', 'Reg. Date', 'Attended', 'Purchase'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {[120, 160, 80, 70, 80, 50, 70].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded animate-pulse bg-white/[0.04]" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-sm text-zinc-600">
                    No data for this period
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{lead.full_name || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.email}</td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{lead.source || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                        lead.status === 'purchased' ? 'bg-emerald-500/15 text-emerald-400' :
                        lead.status === 'attended'  ? 'bg-blue-500/15 text-blue-400'       :
                        lead.status === 'no_show'   ? 'bg-amber-500/15 text-amber-400'     :
                        lead.status === 'refunded'  ? 'bg-red-500/15 text-red-400'         :
                        'bg-zinc-500/15 text-zinc-400'
                      )}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-xs font-medium', lead.attended ? 'text-emerald-400' : 'text-zinc-700')}>
                        {lead.attended ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {lead.purchase_amount
                        ? <span className="text-emerald-400">${lead.purchase_amount.toLocaleString()}</span>
                        : <span className="text-zinc-700">—</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
