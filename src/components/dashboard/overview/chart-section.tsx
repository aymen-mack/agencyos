'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ChartWidget } from './chart-widget'
import { ChartConfigModal } from './chart-config-modal'
import type { ChartWidgetConfig, DashboardRawData } from './types'

interface Props {
  widgets: ChartWidgetConfig[]
  rawData: DashboardRawData | null
  onUpdate: (widgets: ChartWidgetConfig[]) => void
}

export function ChartSection({ widgets, rawData, onUpdate }: Props) {
  const [addOpen, setAddOpen] = useState(false)

  const visible = [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order)

  function updateWidget(id: string, updated: ChartWidgetConfig) {
    onUpdate(widgets.map((w) => w.id === id ? updated : w))
  }

  function removeWidget(id: string) {
    onUpdate(widgets.map((w) => w.id === id ? { ...w, visible: false } : w))
  }

  function addWidget(newConfig: Omit<ChartWidgetConfig, 'visible' | 'order'> & { id: string }) {
    const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1)
    onUpdate([...widgets, { ...newConfig, visible: true, order: maxOrder + 1 }])
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {visible.map((widget) => (
          <ChartWidget
            key={widget.id}
            config={widget}
            rawData={rawData}
            onUpdate={(updated) => updateWidget(widget.id, updated)}
            onRemove={() => removeWidget(widget.id)}
          />
        ))}
      </div>

      {/* Add widget */}
      <div className="mt-4">
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.1] hover:border-amber-500/30 text-muted-foreground hover:text-foreground text-sm transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </button>
      </div>

      <ChartConfigModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initial={null}
        onSave={addWidget}
      />
    </div>
  )
}
