'use client'

import { Lead } from '@/types/database'
import { PIPELINE_STAGES, getStage } from '@/lib/pipeline'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface LeadsKanbanViewProps {
  leads: Lead[]
  onUpdateLead: (id: string, changes: Partial<Lead>) => void
  onOpenDetail: (lead: Lead) => void
}

function KanbanCard({ lead, onOpenDetail, isDragging }: { lead: Lead; onOpenDetail: (l: Lead) => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id })
  const stage = getStage(lead.status)

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none group',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{lead.full_name || lead.email}</p>
          {lead.full_name && (
            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail(lead) }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px]">{tag}</span>
          ))}
          {lead.tags.length > 3 && (
            <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', stage.color)}>
          {stage.label}
        </span>
        {(lead.score ?? 0) > 0 && (
          <span className={cn(
            'text-[10px] font-medium tabular-nums',
            (lead.score ?? 0) >= 100 ? 'text-emerald-400' : (lead.score ?? 0) >= 40 ? 'text-amber-400' : 'text-muted-foreground'
          )}>
            {lead.score}pts
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  stageId,
  label,
  color,
  leads,
  onOpenDetail,
  activeId,
}: {
  stageId: string
  label: string
  color: string
  leads: Lead[]
  onOpenDetail: (l: Lead) => void
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId })

  return (
    <div className="flex flex-col w-60 flex-shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={cn('w-2 h-2 rounded-full', color.split(' ')[0].replace('text-', 'bg-'))} />
        <span className="text-xs font-medium">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{leads.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[200px] rounded-xl p-2 transition-colors',
          isOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-secondary/20'
        )}
      >
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onOpenDetail={onOpenDetail}
            isDragging={activeId === lead.id}
          />
        ))}
      </div>
    </div>
  )
}

export function LeadsKanbanView({ leads, onUpdateLead, onOpenDetail }: LeadsKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const leadId = String(active.id)
    const newStatus = String(over.id)
    const lead = leads.find((l) => l.id === leadId)
    if (lead && lead.status !== newStatus) {
      onUpdateLead(leadId, { status: newStatus })
    }
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    // over could be a column droppable or a card
    const overId = String(over.id)
    const isColumn = PIPELINE_STAGES.some((s) => s.id === overId)
    if (!isColumn) return
    const leadId = String(active.id)
    const lead = leads.find((l) => l.id === leadId)
    if (lead && lead.status !== overId) {
      // visual-only during drag — optimistic update happens on drop
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            label={stage.label}
            color={stage.color}
            leads={leads.filter((l) => l.status === stage.id)}
            onOpenDetail={onOpenDetail}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="bg-card border border-primary/40 rounded-lg p-3 shadow-xl w-60 cursor-grabbing rotate-2">
            <p className="text-sm font-medium truncate">{activeLead.full_name || activeLead.email}</p>
            {activeLead.full_name && (
              <p className="text-xs text-muted-foreground truncate">{activeLead.email}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
