'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, LabelList,
} from 'recharts'
import { ChevronLeft, ChevronRight, User, Upload, Plus } from 'lucide-react'
import { CsvImportSheet } from '@/components/crm/csv-import-sheet'
import { AddLeadSheet } from '@/components/crm/add-lead-sheet'
import { cn } from '@/lib/utils'
import { Lead } from '@/types/database'
import { getStage } from '@/lib/pipeline'
import {
  extractSurveyFields,
  getLeadQuality,
  sophisticationToLevel,
  QUALITY_LABELS,
  QUALITY_BADGE_COLORS,
  QUALITY_CHART_COLORS,
  LeadQuality,
} from '@/lib/survey-fields'

interface SurveyStats {
  total: number
  quality: Record<LeadQuality, number>
  charts: {
    income: Record<string, number>
    age: Record<string, number>
    occupation: Record<string, number>
    sophistication: Record<string, number>
    previous_investment: Record<string, number>
    speed: Record<string, number>
  }
  avatar: {
    age: { value: string; pct: number }
    income: { value: string; pct: number }
    sophistication: { value: string; pct: number }
    previous_investment: { value: string; pct: number }
    speed: { value: string; pct: number }
  }
}

const QUALITY_ORDER: LeadQuality[] = ['most_likely', 'likely', 'probable', 'least_likely']
const PAGE_SIZE = 50

// ── Small reusable chart wrappers ────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  )
}

function VerticalBar({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (!entries.length) return <EmptyChart />
  const chart = entries.map(([name, value]) => ({ name, value }))
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 4, right: 4, left: -28, bottom: 24 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-25} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="hsl(var(--foreground))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DonutChart({ data, colors }: { data: Record<string, number>; colors?: string[] }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return <EmptyChart />
  const COLORS = colors || ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
  const chart = entries.map(([name, value]) => ({ name, value }))
  return (
    <div className="h-40 flex items-center gap-4">
      <ResponsiveContainer width="50%" height="100%">
        <PieChart>
          <Pie data={chart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="50%" outerRadius="78%" paddingAngle={2}>
            {chart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {entries.slice(0, 5).map(([name], i) => (
          <div key={name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground truncate">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeedBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return <EmptyChart />
  const max = Math.max(...entries.map(([, v]) => v))
  return (
    <div className="space-y-2.5 py-1">
      {entries.slice(0, 5).map(([label, count]) => (
        <div key={label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[70%]">{label}</span>
            <span className="text-foreground font-medium">{count}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-40 flex items-center justify-center text-xs text-muted-foreground/40">
      No data yet
    </div>
  )
}

// ── Survey Overview ──────────────────────────────────────────────────────────

function SurveyOverview({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/${projectId}/survey`)
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false) })
  }, [projectId])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-52 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const total = stats.total
  const qualityColors = [QUALITY_CHART_COLORS.most_likely, QUALITY_CHART_COLORS.likely, QUALITY_CHART_COLORS.probable, QUALITY_CHART_COLORS.least_likely]

  return (
    <div className="space-y-5">
      {/* ── Header: total + 4 quality badges ── */}
      <div className="flex items-start gap-8 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Surveys</p>
          <p className="text-4xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="flex items-start gap-3 flex-wrap flex-1">
          {QUALITY_ORDER.map((q) => {
            const count = stats.quality[q] || 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={q} className="flex flex-col gap-1 min-w-[120px]">
                <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit', QUALITY_BADGE_COLORS[q])}>
                  {QUALITY_LABELS[q]}
                </span>
                <div className="flex items-baseline gap-1.5 pl-1">
                  <span className="text-2xl font-bold">{count.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3×2 chart grid ── */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Lead Quality">
          <DonutChart
            data={Object.fromEntries(QUALITY_ORDER.map((q) => [QUALITY_LABELS[q], stats.quality[q] || 0]))}
            colors={qualityColors}
          />
        </ChartCard>

        <ChartCard title="Income">
          <VerticalBar data={stats.charts.income} />
        </ChartCard>

        <ChartCard title="Age">
          <DonutChart data={stats.charts.age} />
        </ChartCard>

        <ChartCard title="Occupation">
          <VerticalBar data={stats.charts.occupation} />
        </ChartCard>

        <ChartCard title="Investment Experience">
          <VerticalBar data={stats.charts.sophistication} />
        </ChartCard>

        <ChartCard title="Speed to Action">
          <SpeedBars data={stats.charts.speed} />
        </ChartCard>
      </div>

      {/* ── Current Avatar ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold mb-4">Current Avatar</p>
        <div className="flex items-start gap-6">
          {/* Profile placeholder */}
          <div className="w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 flex-1">
            {[
              { label: 'Average Age', value: stats.avatar.age.value, pct: stats.avatar.age.pct },
              { label: 'Average Income', value: stats.avatar.income.value, pct: stats.avatar.income.pct },
              {
                label: 'Level of Sophistication',
                value: `Level ${sophisticationToLevel(stats.avatar.sophistication.value)}`,
                pct: stats.avatar.sophistication.pct,
                sub: stats.avatar.sophistication.value,
              },
              { label: 'Previous Investments', value: stats.avatar.previous_investment.value, pct: stats.avatar.previous_investment.pct },
              { label: 'Speed to Action', value: stats.avatar.speed.value, pct: stats.avatar.speed.pct },
            ].map(({ label, value, pct, sub }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold">{value || '—'}</p>
                  {pct > 0 && <span className="text-xs text-muted-foreground">{pct}% of people</span>}
                </div>
                {sub && sub !== value && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Survey Table ─────────────────────────────────────────────────────────────

function QualityBadge({ quality }: { quality: LeadQuality }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', QUALITY_BADGE_COLORS[quality])}>
      {QUALITY_LABELS[quality]}
    </span>
  )
}

const COL_LABELS = ['Name', 'Email', 'Lead Quality', 'Status', 'Age', 'Occupation', 'Income', 'Sophistication', 'Challenges', 'Prev. Investment', 'Speed to Action']
const COL_DEFAULTS = [150, 190, 170, 120, 80, 170, 170, 210, 230, 170, 170]
const COL_MIN = 60

function SurveyTable({ projectId }: { projectId: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [colWidths, setColWidths] = useState<number[]>(COL_DEFAULTS)
  const dragRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null)

  const onResizeMouseDown = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault()
    dragRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const { colIdx: ci, startX, startW } = dragRef.current
      const newW = Math.max(COL_MIN, startW + ev.clientX - startX)
      setColWidths((prev) => { const next = [...prev]; next[ci] = newW; return next })
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const fetchLeads = useCallback(async (p: number, s: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      projectId,
      page: String(p),
      limit: String(PAGE_SIZE),
      status: 'survey_filled',
      sort: 'created_at',
      dir: 'desc',
    })
    if (s) params.set('search', s)
    const res = await fetch(`/api/leads?${params}`)
    const json = await res.json()
    setLeads(json.leads || [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchLeads(page, search) }, [page, fetchLeads]) // eslint-disable-line

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setPage(1); fetchLeads(1, search) }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search]) // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const totalTableWidth = colWidths.reduce((s, w) => s + w, 0)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
        <p className="text-sm font-medium">{total.toLocaleString()} survey leads</p>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-blue-500/30 w-52 text-foreground"
          />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>
      </div>

      <CsvImportSheet
        open={importOpen}
        onClose={() => { setImportOpen(false); fetchLeads(1, search) }}
        projectId={projectId}
        onImported={() => {
          setPage(1)
          fetchLeads(1, search)
        }}
      />

      <AddLeadSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projectId={projectId}
        defaultStatus="survey_filled"
        onAdded={() => {
          setAddOpen(false)
          setPage(1)
          fetchLeads(1, search)
        }}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="text-sm table-fixed border-collapse" style={{ width: totalTableWidth }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              {COL_LABELS.map((label, i) => (
                <th
                  key={label}
                  className="relative px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap select-none overflow-hidden"
                  style={{ width: colWidths[i] }}
                >
                  <span className="truncate block">{label}</span>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => onResizeMouseDown(e, i)}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/60 transition-colors z-10"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COL_LABELS.length} className="py-12 text-center text-sm text-muted-foreground/50">
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={COL_LABELS.length} className="py-12 text-center text-sm text-muted-foreground/50">
                  No survey leads yet. Connect Typeform to start collecting data.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const survey = (lead.survey_data as Record<string, unknown>) || {}
                const fields = extractSurveyFields(survey)
                const quality = getLeadQuality(survey)
                const stage = getStage(lead.status)
                const sophLevel = sophisticationToLevel(fields.sophistication)
                const cell = 'px-4 py-3 overflow-hidden'
                return (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className={cell}><div className="truncate font-medium text-sm">{lead.full_name || '—'}</div></td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{lead.email}</div></td>
                    <td className={cell}><QualityBadge quality={quality} /></td>
                    <td className={cell}>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap', stage.color)}>
                        {stage.label}
                      </span>
                    </td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.age || '—'}</div></td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.occupation || '—'}</div></td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.monthly_income || '—'}</div></td>
                    <td className={cell}>
                      <div className="truncate text-xs text-muted-foreground">
                        {fields.sophistication ? `L${sophLevel} — ${fields.sophistication}` : '—'}
                      </div>
                    </td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.challenges || '—'}</div></td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.previous_investment || '—'}</div></td>
                    <td className={cell}><div className="truncate text-xs text-muted-foreground">{fields.speed_to_action || '—'}</div></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('w-7 h-7 rounded text-xs font-medium transition-colors',
                    page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
                  {p}
                </button>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Survey Tab ──────────────────────────────────────────────────────────

export function SurveyTab({ projectId }: { projectId: string }) {
  const [view, setView] = useState<'overview' | 'table'>('overview')

  return (
    <div className="space-y-4">
      {/* Inner tab switcher */}
      <div className="flex items-center gap-0 border-b border-border">
        {(['overview', 'table'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              view === v
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {v === 'overview' ? 'Overview' : 'Table View'}
          </button>
        ))}
      </div>

      {view === 'overview'
        ? <SurveyOverview projectId={projectId} />
        : <SurveyTable projectId={projectId} />
      }
    </div>
  )
}
