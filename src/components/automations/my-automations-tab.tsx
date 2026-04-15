'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Automation } from './types'
import { GitBranch, Play, Pause, Trash2, Edit2, Clock, Zap } from 'lucide-react'

interface MyAutomationsTabProps {
  automations: Automation[]
  onOpen: (automation: Automation) => void
  onToggleStatus: (id: string, newStatus: 'active' | 'inactive') => Promise<void>
  onDelete: (id: string) => Promise<void>
  onNew: () => void
}

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  draft:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const TRIGGER_LABELS: Record<string, string> = {
  form_submission:    'Form Submission',
  webinar_registered: 'Webinar Registered',
  webinar_attended:   'Webinar Attended',
  lead_score_updated: 'Lead Score Updated',
  call_booked:        'Call Booked',
  call_showed:        'Call Showed',
  deal_closed:        'Deal Closed',
  payment_received:   'Payment Received',
  tag_added:          'Tag Added',
  manual:             'Manual',
}

export function MyAutomationsTab({
  automations,
  onOpen,
  onToggleStatus,
  onDelete,
  onNew,
}: MyAutomationsTabProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleToggle(a: Automation) {
    setTogglingId(a.id)
    const next = a.status === 'active' ? 'inactive' : 'active'
    await onToggleStatus(a.id, next)
    setTogglingId(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <GitBranch className="w-6 h-6 text-primary/60" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No automations yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Build your first automation from a template or start from scratch.
        </p>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Create Automation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{automations.length} automation{automations.length !== 1 ? 's' : ''}</p>
        <button
          onClick={onNew}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          + New Automation
        </button>
      </div>

      {automations.map((automation) => (
        <div
          key={automation.id}
          className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-4 h-4 text-primary/70" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onOpen(automation)}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {automation.name}
                </button>
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize',
                  STATUS_COLORS[automation.status]
                )}>
                  {automation.status}
                </span>
              </div>

              {automation.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{automation.description}</p>
              )}

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {automation.trigger_type && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    {TRIGGER_LABELS[automation.trigger_type] ?? automation.trigger_type}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <GitBranch className="w-3 h-3" />
                  {automation.nodes_json?.length ?? 0} nodes
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {automation.run_count} runs
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onOpen(automation)}
                title="Edit"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleToggle(automation)}
                disabled={togglingId === automation.id}
                title={automation.status === 'active' ? 'Pause' : 'Activate'}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  automation.status === 'active'
                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {automation.status === 'active'
                  ? <Pause className="w-3.5 h-3.5" />
                  : <Play className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={() => handleDelete(automation.id)}
                disabled={deletingId === automation.id}
                title="Delete"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
