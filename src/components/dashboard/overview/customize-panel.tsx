'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KPICardConfig, ChartWidgetConfig, DashboardConfig } from './types'
import { KPI_META } from './types'

interface Props {
  open: boolean
  onClose: () => void
  config: DashboardConfig
  onUpdate: (patch: Partial<DashboardConfig>) => void
}

function SortableKPIItem({ card, onToggle }: { card: KPICardConfig; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const meta = KPI_META[card.id]
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary/40 group">
      <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className={cn('flex-1 text-sm', card.visible ? 'text-foreground' : 'text-muted-foreground/60')}>{meta.label}</span>
      <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
        {card.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-40" />}
      </button>
    </div>
  )
}

function SortableWidgetItem({ widget, onToggle }: { widget: ChartWidgetConfig; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary/40">
      <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className={cn('flex-1 text-sm', widget.visible ? 'text-foreground' : 'text-muted-foreground/60')}>{widget.title}</span>
      <button
        onClick={onToggle}
        className={cn('w-8 h-4.5 rounded-full transition-colors relative flex-shrink-0', widget.visible ? 'bg-amber-500' : 'bg-secondary')}
        style={{ height: '18px', width: '32px' }}
      >
        <span className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform', widget.visible ? 'translate-x-[14px]' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

export function CustomizePanel({ open, onClose, config, onUpdate }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortedKPIs = [...config.kpiCards].sort((a, b) => a.order - b.order)
  const sortedWidgets = [...config.chartWidgets].sort((a, b) => a.order - b.order)
  const visibleKPICount = config.kpiCards.filter((c) => c.visible).length

  function handleKPIDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sortedKPIs.findIndex((k) => k.id === active.id)
    const newIdx = sortedKPIs.findIndex((k) => k.id === over.id)
    const reordered = arrayMove(sortedKPIs, oldIdx, newIdx).map((k, i) => ({ ...k, order: i }))
    onUpdate({ kpiCards: reordered })
  }

  function handleWidgetDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sortedWidgets.findIndex((w) => w.id === active.id)
    const newIdx = sortedWidgets.findIndex((w) => w.id === over.id)
    const reordered = arrayMove(sortedWidgets, oldIdx, newIdx).map((w, i) => ({ ...w, order: i }))
    onUpdate({ chartWidgets: reordered })
  }

  function toggleKPI(id: string) {
    const card = config.kpiCards.find((c) => c.id === id)
    if (!card) return
    if (!card.visible && visibleKPICount >= 6) return // max 6
    if (card.visible && visibleKPICount <= 1) return // min 1
    onUpdate({ kpiCards: config.kpiCards.map((c) => c.id === id ? { ...c, visible: !c.visible } : c) })
  }

  function toggleWidget(id: string) {
    onUpdate({ chartWidgets: config.chartWidgets.map((w) => w.id === id ? { ...w, visible: !w.visible } : w) })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-80 bg-card border-border flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm font-semibold">Customize Dashboard</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* KPI Cards */}
          <section>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">KPI Cards</p>
              <span className="text-[10px] text-muted-foreground">{visibleKPICount}/6 shown</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKPIDragEnd}>
              <SortableContext items={sortedKPIs.map((k) => k.id)} strategy={verticalListSortingStrategy}>
                {sortedKPIs.map((card) => (
                  <SortableKPIItem key={card.id} card={card} onToggle={() => toggleKPI(card.id)} />
                ))}
              </SortableContext>
            </DndContext>
          </section>

          {/* Chart Widgets */}
          <section>
            <div className="px-2 mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chart Widgets</p>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWidgetDragEnd}>
              <SortableContext items={sortedWidgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                {sortedWidgets.map((widget) => (
                  <SortableWidgetItem key={widget.id} widget={widget} onToggle={() => toggleWidget(widget.id)} />
                ))}
              </SortableContext>
            </DndContext>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
