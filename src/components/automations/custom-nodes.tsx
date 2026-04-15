'use client'

import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Zap, Play, GitBranch, Clock, X } from 'lucide-react'
import type { AutomationNodeData } from './types'

interface NodeProps {
  data: AutomationNodeData
  selected?: boolean
  onDelete?: () => void
}

const nodeStyles: Record<string, { border: string; bg: string; icon: React.ReactNode; iconBg: string }> = {
  trigger: {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  action: {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    iconBg: 'bg-blue-500/20 text-blue-400',
    icon: <Play className="w-3.5 h-3.5" />,
  },
  condition: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    iconBg: 'bg-amber-500/20 text-amber-400',
    icon: <GitBranch className="w-3.5 h-3.5" />,
  },
  delay: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
    iconBg: 'bg-purple-500/20 text-purple-400',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
}

function BaseNode({
  data,
  selected,
  type,
}: {
  data: AutomationNodeData
  selected?: boolean
  type: string
}) {
  const style = nodeStyles[type] ?? nodeStyles.action
  const isTrigger = type === 'trigger'

  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-xl border shadow-lg transition-all',
        style.border,
        style.bg,
        'bg-card',
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
      )}
    >
      {/* Target handle — not on triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-border !border-2 !border-border hover:!border-primary transition-colors"
        />
      )}

      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className={cn('mt-0.5 p-1.5 rounded-lg flex-shrink-0', style.iconBg)}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight">{data.label}</p>
          {data.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{data.description}</p>
          )}
        </div>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-border !border-2 !border-border hover:!border-primary transition-colors"
      />
    </div>
  )
}

export function TriggerNode({ data, selected }: NodeProps) {
  return <BaseNode data={data} selected={selected} type="trigger" />
}

export function ActionNode({ data, selected }: NodeProps) {
  return <BaseNode data={data} selected={selected} type="action" />
}

export function ConditionNode({ data, selected }: NodeProps) {
  return <BaseNode data={data} selected={selected} type="condition" />
}

export function DelayNode({ data, selected }: NodeProps) {
  return <BaseNode data={data} selected={selected} type="delay" />
}

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
}
