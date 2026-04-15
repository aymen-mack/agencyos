'use client'

import { useState, useEffect, useCallback } from 'react'
import { SlidersHorizontal, Database, Trash2, CheckCircle2 } from 'lucide-react'
import { DateRangeFilter } from './date-range-filter'
import { CustomizePanel } from './customize-panel'
import { KPISection } from './kpi-section'
import { ChartSection } from './chart-section'
import { LeadsTableSection } from './leads-table-section'
import type { DashboardConfig, DashboardSummary, KPIMetricId, ChartWidgetConfig } from './types'
import { getDefaultConfig } from './types'

interface Props {
  projectId: string
}

type SeedState = 'idle' | 'seeding' | 'done' | 'deleting'

export function OverviewTab({ projectId }: Props) {
  const [config, setConfig] = useState<DashboardConfig>(() => getDefaultConfig())
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [seedState, setSeedState] = useState<SeedState>('idle')

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    const { start, end } = config.dateRange
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    })
    const res = await fetch(`/api/dashboard/${projectId}/summary?${params}`)
    if (res.ok) {
      const data = await res.json()
      setSummary(data)
    }
    setLoading(false)
  }, [projectId, config.dateRange])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  function patchConfig(patch: Partial<DashboardConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  function hideKPI(id: KPIMetricId) {
    patchConfig({
      kpiCards: config.kpiCards.map((c) => c.id === id ? { ...c, visible: false } : c),
    })
  }

  function updateWidgets(widgets: ChartWidgetConfig[]) {
    patchConfig({ chartWidgets: widgets })
  }

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

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : summary ? 'Live data from your project' : 'No data yet'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seed buttons — dev helpers */}
          {seedState === 'idle' && (
            <button
              onClick={seedData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.1] hover:border-amber-500/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              Seed test data
            </button>
          )}
          {seedState === 'seeding' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 border border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
              Seeding…
            </span>
          )}
          {seedState === 'done' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Seeded! Refresh to see data.
            </span>
          )}
          {seedState === 'idle' && (
            <button
              onClick={deleteSeedData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.08] hover:border-red-500/30 text-xs text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete test data
            </button>
          )}

          <DateRangeFilter
            value={config.dateRange}
            onChange={(dateRange) => patchConfig({ dateRange })}
          />

          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary text-sm font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Customize
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPISection
        cards={config.kpiCards}
        kpis={summary?.kpis ?? null}
        onHide={hideKPI}
      />

      {/* Chart Widgets */}
      <ChartSection
        widgets={config.chartWidgets}
        rawData={summary?.rawData ?? null}
        onUpdate={updateWidgets}
      />

      {/* Leads Table */}
      <LeadsTableSection
        projectId={projectId}
        filters={config.tableFilters}
        dateRange={config.dateRange}
        onFiltersChange={(f) => patchConfig({ tableFilters: { ...config.tableFilters, ...f } })}
      />

      {/* Customize panel */}
      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        config={config}
        onUpdate={patchConfig}
      />
    </div>
  )
}
