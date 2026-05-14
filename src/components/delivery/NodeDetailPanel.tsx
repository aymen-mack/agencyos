'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Lock, Unlock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskList } from './TaskList'
import {
  type DeliveryNode,
  type DeliveryTask,
  type OrgMember,
  type NodeType,
  type NodeStatus,
  NODE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  NODE_TYPE_COLORS,
} from '@/types/delivery'

const NODE_TYPES: NodeType[] = ['strategy', 'copy', 'build', 'automation', 'design', 'review', 'custom']
const STATUSES: NodeStatus[] = ['locked', 'ready', 'in_progress', 'in_review', 'needs_changes', 'done']

interface NodeDetailPanelProps {
  node: DeliveryNode
  projectId: string
  members: OrgMember[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<DeliveryNode>) => void
  onDelete: (id: string) => void
  onTasksChange: (tasks: DeliveryTask[]) => void
}

function MemberAvatar({ member }: { member: OrgMember }) {
  const name = member.full_name || member.email
  return (
    <div className="flex items-center gap-2">
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={name} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
          <span className="text-[9px] text-zinc-300 font-medium">{name[0]?.toUpperCase()}</span>
        </div>
      )}
      <span className="text-sm text-zinc-200 truncate">{name}</span>
    </div>
  )
}

export function NodeDetailPanel({ node, projectId, members, onClose, onUpdate, onDelete, onTasksChange }: NodeDetailPanelProps) {
  const [name, setName] = useState(node.name)
  const [description, setDescription] = useState(node.description || '')
  const [tasks, setTasks] = useState<DeliveryTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const nameRef = useRef<HTMLInputElement>(null)

  // Fetch tasks when panel opens
  useEffect(() => {
    setTasksLoading(true)
    fetch(`/api/delivery/tasks?nodeId=${node.id}`)
      .then((r) => r.json())
      .then((j) => setTasks(j.tasks || []))
      .finally(() => setTasksLoading(false))
  }, [node.id])

  // Reset local state when node changes
  useEffect(() => {
    setName(node.name)
    setDescription(node.description || '')
  }, [node.id, node.name, node.description])

  const saveName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== node.name) {
      onUpdate(node.id, { name: trimmed })
    } else {
      setName(node.name)
    }
  }

  const saveDescription = () => {
    if (description !== (node.description || '')) {
      onUpdate(node.id, { description: description || null })
    }
  }

  const setStatus = (status: NodeStatus) => onUpdate(node.id, { status })
  const setNodeType = (node_type: NodeType) => onUpdate(node.id, { node_type })
  const setAssignee = (assignee_id: string | null) => onUpdate(node.id, { assignee_id })
  const toggleUnlock = () => onUpdate(node.id, { manual_unlock: !node.manual_unlock })

  const typeColor = NODE_TYPE_COLORS[node.node_type]
  const sc = STATUS_COLORS[node.status]

  const handleTasksChange = (updated: DeliveryTask[]) => {
    setTasks(updated)
    onTasksChange(updated)
  }

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] bg-[#111] border-l border-zinc-800 flex flex-col z-50 shadow-2xl">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => { if (e.key === 'Enter') { saveName(); nameRef.current?.blur() } }}
          className="flex-1 bg-transparent font-semibold text-white text-sm outline-none"
          placeholder="Node name"
        />
        <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Meta row: type + status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Type</p>
            <div className="relative">
              <select
                value={node.node_type}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
                className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 cursor-pointer pr-6"
              >
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Status</p>
            <div className="relative">
              <select
                value={node.status}
                onChange={(e) => setStatus(e.target.value as NodeStatus)}
                className={cn(
                  'w-full appearance-none border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-zinc-600 cursor-pointer pr-6',
                  sc.bg, sc.text, 'border-zinc-800 bg-zinc-900',
                )}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Assignee</p>
          <div className="relative">
            <select
              value={node.assignee_id || ''}
              onChange={(e) => setAssignee(e.target.value || null)}
              className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 cursor-pointer pr-6"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.clerk_user_id} value={m.clerk_user_id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
          {node.assignee_id && (() => {
            const m = members.find((m) => m.clerk_user_id === node.assignee_id)
            return m ? <div className="mt-2"><MemberAvatar member={m} /></div> : null
          })()}
        </div>

        {/* Manual unlock toggle */}
        <div className="flex items-center justify-between py-2 px-3 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2">
            {node.manual_unlock
              ? <Unlock className="w-3.5 h-3.5 text-amber-400" />
              : <Lock className="w-3.5 h-3.5 text-zinc-500" />}
            <div>
              <p className="text-xs font-medium text-zinc-200">Manual unlock</p>
              <p className="text-[10px] text-zinc-500">Bypass dependency lock</p>
            </div>
          </div>
          <button
            onClick={toggleUnlock}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              node.manual_unlock ? 'bg-amber-500' : 'bg-zinc-700'
            )}
          >
            <span className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow',
              node.manual_unlock ? 'translate-x-4.5' : 'translate-x-0.5'
            )} />
          </button>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add specs, requirements, reference links…"
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 resize-none"
          />
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Tasks</p>
            {tasks.length > 0 && (
              <span className="text-[10px] text-zinc-500">
                {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
              </span>
            )}
          </div>
          {tasksLoading ? (
            <div className="text-xs text-zinc-600 py-2">Loading…</div>
          ) : (
            <TaskList nodeId={node.id} projectId={projectId} tasks={tasks} onTasksChange={handleTasksChange} />
          )}
        </div>
      </div>

      {/* Footer: delete */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-800">
        <button
          onClick={() => onDelete(node.id)}
          className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
        >
          Delete node
        </button>
      </div>
    </div>
  )
}
