'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type NodeType,
  type NodeStatus,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types/delivery'

export type DeliveryNodeData = {
  dbId: string
  name: string
  nodeType: NodeType
  status: NodeStatus
  assigneeName: string | null
  assigneeAvatar: string | null
  taskTotal: number
  taskDone: number
  manual_unlock: boolean
}

function DeliveryNodeComponent({ data, selected }: NodeProps) {
  const d = data as DeliveryNodeData
  const typeColor = NODE_TYPE_COLORS[d.nodeType] ?? '#666666'
  const sc = STATUS_COLORS[d.status]
  const isLocked = d.status === 'locked' && !d.manual_unlock
  const hasTasks = d.taskTotal > 0
  const taskPct = hasTasks ? Math.round((d.taskDone / d.taskTotal) * 100) : 0

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-[#111] shadow-lg transition-all duration-150',
        'w-[220px]',
        selected ? 'border-blue-500/80 shadow-blue-500/20 shadow-xl' : 'border-zinc-800',
        isLocked && 'opacity-50'
      )}
    >
      {/* Colored type bar */}
      <div
        className="h-1 w-full rounded-t-xl"
        style={{ background: typeColor }}
      />

      <div className="p-3 space-y-2">
        {/* Header row: name + lock icon */}
        <div className="flex items-start gap-1.5">
          <p className="flex-1 text-[13px] font-semibold leading-tight text-white line-clamp-2">
            {d.name}
          </p>
          {d.status === 'locked' && (
            <Lock className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-0.5" />
          )}
          {d.manual_unlock && d.status !== 'locked' && (
            <Unlock className="w-3 h-3 text-amber-400/60 flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Status + type badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', sc.bg, sc.text)}>
            {STATUS_LABELS[d.status]}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400">
            {NODE_TYPE_LABELS[d.nodeType]}
          </span>
        </div>

        {/* Assignee + task progress */}
        <div className="flex items-center justify-between gap-2">
          {d.assigneeName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              {d.assigneeAvatar ? (
                <img src={d.assigneeAvatar} alt={d.assigneeName} className="w-4 h-4 rounded-full flex-shrink-0 object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] text-zinc-300 font-medium">{d.assigneeName[0]?.toUpperCase()}</span>
                </div>
              )}
              <span className="text-[10px] text-zinc-400 truncate">{d.assigneeName.split(' ')[0]}</span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-600">Unassigned</span>
          )}

          {hasTasks && (
            <span className={cn('text-[10px] font-medium flex-shrink-0', taskPct === 100 ? 'text-emerald-400' : 'text-zinc-400')}>
              {d.taskDone}/{d.taskTotal}
            </span>
          )}
        </div>

        {/* Task progress bar */}
        {hasTasks && (
          <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${taskPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-zinc-600 !border-zinc-500 hover:!bg-blue-400 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-zinc-600 !border-zinc-500 hover:!bg-blue-400 transition-colors"
      />
    </div>
  )
}

export const DeliveryNodeComponent_ = memo(DeliveryNodeComponent)
