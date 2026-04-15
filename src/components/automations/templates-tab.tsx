'use client'

import { AUTOMATION_TEMPLATES } from './templates-data'
import type { AutomationTemplate } from './types'
import { cn } from '@/lib/utils'
import { ArrowRight, Zap, Play, GitBranch, Clock } from 'lucide-react'

interface TemplatesTabProps {
  onUseTemplate: (template: AutomationTemplate) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Email:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CRM:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Leads:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Webinar: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Sales:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function nodeTypeSummary(template: AutomationTemplate) {
  const counts: Record<string, number> = {}
  for (const node of template.nodes) {
    counts[node.type ?? 'action'] = (counts[node.type ?? 'action'] || 0) + 1
  }
  return counts
}

const TYPE_ICONS = {
  trigger:   { icon: Zap,        color: 'text-emerald-400' },
  action:    { icon: Play,       color: 'text-blue-400' },
  condition: { icon: GitBranch,  color: 'text-amber-400' },
  delay:     { icon: Clock,      color: 'text-purple-400' },
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps) {
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground">Pre-built Templates</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Start with a template and customise the nodes to fit your workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AUTOMATION_TEMPLATES.map((template) => {
          const counts = nodeTypeSummary(template)
          return (
            <div
              key={template.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col hover:border-primary/40 transition-colors group"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl w-10 h-10 flex items-center justify-center flex-shrink-0 bg-secondary rounded-xl">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{template.name}</p>
                  <span className={cn(
                    'inline-flex items-center mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                    CATEGORY_COLORS[template.category] ?? 'bg-secondary text-muted-foreground border-border'
                  )}>
                    {template.category}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                {template.description}
              </p>

              {/* Node type breakdown */}
              <div className="flex items-center gap-2 mb-4">
                {Object.entries(counts).map(([type, count]) => {
                  const t = TYPE_ICONS[type as keyof typeof TYPE_ICONS]
                  if (!t) return null
                  const Icon = t.icon
                  return (
                    <div key={type} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Icon className={cn('w-3 h-3', t.color)} />
                      <span>{count}</span>
                    </div>
                  )
                })}
                <span className="text-[11px] text-muted-foreground ml-auto">{template.nodes.length} steps</span>
              </div>

              <button
                onClick={() => onUseTemplate(template)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors group-hover:border-primary/40"
              >
                Use Template
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
