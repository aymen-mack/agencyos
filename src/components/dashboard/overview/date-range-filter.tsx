'use client'

import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DateRange, DatePreset } from './types'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: { label: string; value: DatePreset; getDates: () => { start: Date; end: Date } }[] = [
  { label: 'Today',       value: 'today', getDates: () => { const d = new Date(); return { start: d, end: d } } },
  { label: 'Last 7 days', value: '7d',    getDates: () => ({ start: new Date(Date.now() - 6 * 86400000), end: new Date() }) },
  { label: 'Last 30 days',value: '30d',   getDates: () => ({ start: new Date(Date.now() - 29 * 86400000), end: new Date() }) },
  { label: 'Last 90 days',value: '90d',   getDates: () => ({ start: new Date(Date.now() - 89 * 86400000), end: new Date() }) },
  { label: 'This year',   value: 'year',  getDates: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) },
]

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(value.start.toISOString().split('T')[0])
  const [customEnd, setCustomEnd] = useState(value.end.toISOString().split('T')[0])

  const activeLabel = PRESETS.find((p) => p.value === value.preset)?.label
    ?? `${fmtDate(value.start)} – ${fmtDate(value.end)}`

  function selectPreset(preset: typeof PRESETS[0]) {
    const { start, end } = preset.getDates()
    onChange({ start, end, preset: preset.value })
    setOpen(false)
  }

  function applyCustom() {
    if (!customStart || !customEnd) return
    onChange({ start: new Date(customStart), end: new Date(customEnd), preset: 'custom' })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-border/80 text-sm transition-colors"
      >
        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">{activeLabel}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl w-56 p-1 overflow-hidden">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => selectPreset(preset)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  value.preset === preset.value
                    ? 'bg-amber-500/15 text-amber-400 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                {preset.label}
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-2 px-2 pb-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Custom Range</p>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <button
                onClick={applyCustom}
                className="w-full py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
