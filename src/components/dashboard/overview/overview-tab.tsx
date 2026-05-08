'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import { Database, CheckCircle2, Trash2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { DashboardSummary } from './types'
import { Lead } from '@/types/database'
import { LeadsTableView } from '@/components/crm/leads-table-view'
import { LeadDetailSheet } from '@/components/crm/lead-detail-sheet'

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const TABLE_TABS = [
  { label: 'All',          filter: ''            },
  { label: 'Registrants',  filter: 'registrant'  },
  { label: 'Surveys',      filter: 'survey_filled' },
  { label: 'Shows',        filter: 'webinar_show'  },
  { label: 'Booked Calls', filter: 'call_booked'   },
  { label: 'Showed Deals', filter: 'call_showed'   },
  { label: 'Closed Deals', filter: 'closed_deal'   },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-semibold">${payload[0].value.toLocaleString()}</p>
    </div>
  )
}

interface Props { projectId: string }

type SeedState = 'idle' | 'seeding' | 'done' | 'deleting'

export function OverviewTab({ projectId }: Props) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'mtd' | 'ytd' | 'custom'>('today')
  const [customOpen, setCustomOpen] = useState(false)
  const [customStart, setCustomStart] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0])
  const [customEnd, setCustomEnd]   = useState(() => new Date().toISOString().split('T')[0])
  const [summary, setSummary]   = useState<DashboardSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab]   = useState('All')
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [tablePage, setTablePage] = useState(1)
  const pendingUpdates = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const [seedState, setSeedState] = useState<SeedState>('idle')

  const getRange = useCallback(() => {
    const now = new Date()
    const end = new Date(); end.setHours(23, 59, 59, 999)
    if (period === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    if (period === '7d') {
      const start = new Date(Date.now() - 6 * 86400000); start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    if (period === '30d') {
      const start = new Date(Date.now() - 29 * 86400000); start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    if (period === 'mtd') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end }
    }
    if (period === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end }
    }
    const start = new Date(customStart); start.setHours(0, 0, 0, 0)
    const customEndDate = new Date(customEnd); customEndDate.setHours(23, 59, 59, 999)
    return { start, end: customEndDate }
  }, [period, customStart, customEnd])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    const { start, end } = getRange()
    const p = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() })
    const res = await fetch(`/api/dashboard/${projectId}/summary?${p}`)
    if (res.ok) setSummary(await res.json())
    setLoading(false)
  }, [projectId, getRange])

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true)
    const res = await fetch(`/api/leads?projectId=${projectId}`)
    const json = await res.json()
    setAllLeads(json.leads || [])
    setLeadsLoading(false)
  }, [projectId])

  const updateLead = useCallback((id: string, changes: Partial<Lead>) => {
    setAllLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l))
    setDetailLead((prev) => prev?.id === id ? { ...prev, ...changes } : prev)
    const existing = pendingUpdates.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      pendingUpdates.current.delete(id)
      fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
    }, 500)
    pendingUpdates.current.set(id, timer)
  }, [])

  const deleteLead = useCallback((id: string) => {
    setAllLeads((prev) => prev.filter((l) => l.id !== id))
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    fetch(`/api/leads/${id}`, { method: 'DELETE' })
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { setTablePage(1) }, [activeTab, searchQuery, period, customStart, customEnd])

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
  const showsCount      = (breakdown.find((s: Record<string, unknown>) => s.status === 'webinar_show')?.count as number) ?? 0
  const purchasedCount  = breakdown
    .filter((s: Record<string, unknown>) => s.status === 'closed_deal' || s.status === 'purchased')
    .reduce((sum: number, s: Record<string, unknown>) => sum + ((s.count as number) ?? 0), 0)
  const shows            = showsCount
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

  // Compute leads filtered by selected date range + active stage tab + search
  const { start: rangeStart, end: rangeEnd } = getRange()
  const activeStageFilter = (TABLE_TABS.find((t) => t.label === activeTab) ?? TABLE_TABS[0]).filter
  const filteredLeads = allLeads.filter((l) => {
    const created = new Date(l.created_at)
    const inRange = created >= rangeStart && created <= rangeEnd
    const matchStage = !activeStageFilter || l.status === activeStageFilter
    const matchSearch = !searchQuery ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    return inRange && matchStage && matchSearch
  })
  const allTags = Array.from(new Set(allLeads.flatMap((l) => l.tags || [])))
  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))
  const pagedLeads = filteredLeads.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)

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

      {/* ── Top row: period tabs + seed buttons ────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="relative flex items-center gap-1">
          {(['today', '7d', '30d', 'mtd', 'ytd', 'custom'] as const).map((p) => {
            const labels: Record<string, string> = { today: 'Today', '7d': '7 Days', '30d': '30 Days', mtd: 'MTD', ytd: 'YTD', custom: 'Custom' }
            const isActive = period === p
            return (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p)
                  if (p === 'custom') setCustomOpen((v) => !v)
                  else setCustomOpen(false)
                }}
                className={cn(
                  'relative px-2.5 py-1.5 text-sm font-medium transition-all',
                  isActive ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                )}
              >
                {labels[p]}
                {p === 'custom' && <ChevronDown className={cn('inline ml-1 w-3 h-3 transition-transform', customOpen && 'rotate-180')} />}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />}
              </button>
            )
          })}

          {/* Custom date picker dropdown */}
          {customOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCustomOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-2xl p-3 w-56 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Custom Range</p>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-500/40" />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-500/40" />
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
              <button onClick={seedData} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
                <Database className="w-3.5 h-3.5" /> Seed data
              </button>
              <button onClick={deleteSeedData} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-red-400 border border-border rounded-lg hover:border-red-500/30 transition-colors">
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
          <p className="text-sm text-muted-foreground mb-1.5">Cash Collected</p>
          {loading
            ? <div className="h-10 w-48 rounded-lg animate-pulse bg-muted/40" />
            : <p className="text-[2.6rem] font-bold tracking-tight leading-none">{fmtCash(cashCollected)}</p>
          }
        </div>
        <div className="pb-1">
          <p className="text-sm text-muted-foreground mb-1.5">Yesterday</p>
          {loading
            ? <div className="h-7 w-24 rounded-lg animate-pulse bg-muted/40" />
            : <p className="text-xl font-semibold text-foreground/70">{fmtCash(yesterdayCash)}</p>
          }
        </div>
      </div>

      {/* ── 5 stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-3">{card.label}</p>
            <div className="flex items-end gap-3">
              {loading
                ? <div className="h-9 w-16 rounded-lg animate-pulse bg-muted/40" />
                : <p className="text-3xl font-bold leading-none">{card.value.toLocaleString()}</p>
              }
              {card.rate !== null && !loading && (
                <p className="text-sm text-muted-foreground pb-0.5">{card.rate}%</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Two charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Cash Collected Over Time */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium mb-5">Cash Collected Over Time</p>
          <div className="h-44">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">No data for this period</div>
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
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium mb-5">Registrations From Source</p>
          <div className="h-44">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : sourceData.length === 0 ? (
              <div className="h-full flex items-center gap-8">
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: '55%' }}>
                  <div className="w-28 h-28 rounded-full border-[14px] border-border/60" />
                </div>
                <div className="flex-1 space-y-3">
                  {['YouTube', 'Instagram', 'Facebook', 'Direct'].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      <span className="text-muted-foreground/50">{s}</span>
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
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {sourceData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Data table (same as Leads CRM) ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Stage filter tabs + search */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border gap-4 flex-wrap">
          <div className="flex items-center overflow-x-auto">
            {TABLE_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={cn(
                  'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.label
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground/50">{filteredLeads.length.toLocaleString()} leads</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-blue-500/30 w-44 text-foreground"
            />
          </div>
        </div>

        {leadsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground/50">Loading leads…</div>
        ) : (
          <LeadsTableView
            leads={pagedLeads}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onUpdateLead={updateLead}
            onDeleteLead={deleteLead}
            onOpenDetail={setDetailLead}
            allTags={allTags}
          />
        )}

        {/* Pagination footer */}
        {!leadsLoading && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <button
                disabled={tablePage <= 1}
                onClick={() => setTablePage((p) => p - 1)}
                className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setTablePage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      tablePage === p
                        ? 'bg-blue-500 text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={tablePage >= totalPages}
                onClick={() => setTablePage((p) => p + 1)}
                className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground/50 ml-1">
                {(tablePage - 1) * PAGE_SIZE + 1}–{Math.min(tablePage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
              </span>
            </div>
            <Link
              href={`/dashboard/${projectId}/leads`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all leads
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
        onUpdateLead={updateLead}
        onDeleteLead={deleteLead}
        allTags={allTags}
        projectId={projectId}
      />

    </div>
  )
}
