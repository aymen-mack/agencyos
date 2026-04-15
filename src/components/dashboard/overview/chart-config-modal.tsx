'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChartWidgetConfig, ChartType, XAxisField, YAxisField, GroupByField, WidgetWidth } from './types'

interface Props {
  open: boolean
  onClose: () => void
  initial?: ChartWidgetConfig | null
  onSave: (config: Omit<ChartWidgetConfig, 'visible' | 'order'> & { id: string }) => void
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line',           label: 'Line' },
  { value: 'area',           label: 'Area' },
  { value: 'bar',            label: 'Bar' },
  { value: 'horizontal_bar', label: 'Horiz. Bar' },
  { value: 'donut',          label: 'Donut' },
  { value: 'stacked_bar',    label: 'Stacked Bar' },
]

const X_AXIS_OPTIONS: { value: XAxisField; label: string }[] = [
  { value: 'date',     label: 'Date' },
  { value: 'source',   label: 'Source' },
  { value: 'status',   label: 'Status' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'platform', label: 'Platform' },
]

const Y_AXIS_OPTIONS: { value: YAxisField; label: string }[] = [
  { value: 'total_cash',       label: 'Cash Collected' },
  { value: 'total_revenue',    label: 'Revenue' },
  { value: 'registrations',    label: 'Registrations' },
  { value: 'attendance_count', label: 'Attendance Count' },
  { value: 'conversion_rate',  label: 'Conversion Rate' },
  { value: 'ad_spend',         label: 'Ad Spend' },
  { value: 'calls_booked',     label: 'Calls Booked' },
  { value: 'refunds',          label: 'Refunds' },
  { value: 'revenue',          label: 'Revenue (from leads)' },
  { value: 'open_rate',        label: 'Email Open Rate' },
  { value: 'click_rate',       label: 'Email Click Rate' },
]

const GROUP_BY_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'none',     label: 'None' },
  { value: 'source',   label: 'Source' },
  { value: 'status',   label: 'Status' },
  { value: 'campaign', label: 'Campaign' },
]

function OptionButton<T extends string>({ value, label, current, onSelect }: { value: T; label: string; current: T; onSelect: (v: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
        current === value
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          : 'bg-secondary/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
      )}
    >
      {label}
    </button>
  )
}

export function ChartConfigModal({ open, onClose, initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [chartType, setChartType] = useState<ChartType>(initial?.chartType ?? 'bar')
  const [xAxis, setXAxis] = useState<XAxisField>(initial?.xAxis ?? 'date')
  const [yAxis, setYAxis] = useState<YAxisField>(initial?.yAxis ?? 'registrations')
  const [groupBy, setGroupBy] = useState<GroupByField>(initial?.groupBy ?? 'none')
  const [width, setWidth] = useState<WidgetWidth>(initial?.width ?? 'half')

  // Reset when opening with new initial
  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      id: initial?.id ?? `widget-${Date.now()}`,
      title: title.trim(),
      chartType,
      xAxis,
      yAxis,
      groupBy,
      width,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {initial ? 'Configure Widget' : 'Add Chart Widget'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revenue Over Time"
              className="bg-secondary/40 border-border text-sm"
            />
          </div>

          {/* Chart Type */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Chart Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CHART_TYPES.map((t) => (
                <OptionButton key={t.value} value={t.value} label={t.label} current={chartType} onSelect={setChartType} />
              ))}
            </div>
          </div>

          {/* X Axis */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">X Axis</label>
            <div className="flex flex-wrap gap-1.5">
              {X_AXIS_OPTIONS.map((t) => (
                <OptionButton key={t.value} value={t.value} label={t.label} current={xAxis} onSelect={setXAxis} />
              ))}
            </div>
          </div>

          {/* Y Axis */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Y Axis / Metric</label>
            <div className="flex flex-wrap gap-1.5">
              {Y_AXIS_OPTIONS.map((t) => (
                <OptionButton key={t.value} value={t.value} label={t.label} current={yAxis} onSelect={setYAxis} />
              ))}
            </div>
          </div>

          {/* Group By */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Group By</label>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_BY_OPTIONS.map((t) => (
                <OptionButton key={t.value} value={t.value} label={t.label} current={groupBy} onSelect={setGroupBy} />
              ))}
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Width</label>
            <div className="flex gap-1.5">
              <OptionButton value="half" label="Half Width" current={width} onSelect={setWidth} />
              <OptionButton value="full" label="Full Width" current={width} onSelect={setWidth} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-black font-medium"
            >
              {initial ? 'Save Changes' : 'Add Widget'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
