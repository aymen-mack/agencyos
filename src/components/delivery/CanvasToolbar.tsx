'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, LayoutDashboard, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NodeType, OrgMember } from '@/types/delivery'
import { NODE_TYPE_LABELS } from '@/types/delivery'

const NODE_TYPES: NodeType[] = ['strategy', 'copy', 'build', 'automation', 'design', 'review', 'custom']

interface CanvasToolbarProps {
  members: OrgMember[]
  onAddNode: (name: string, nodeType: NodeType, assigneeId: string | null) => void
  onAutoLayout: () => void
  nodeCount: number
}

export function CanvasToolbar({ members, onAddNode, onAutoLayout, nodeCount }: CanvasToolbarProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [nodeType, setNodeType] = useState<NodeType>('custom')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 50)
  }, [open])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAddNode(trimmed, nodeType, assigneeId || null)
    setName('')
    setNodeType('custom')
    setAssigneeId('')
    setOpen(false)
  }

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
      {/* Add node button + popover */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8F55A] text-black text-xs font-semibold hover:bg-[#d4f96e] transition-colors shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Node
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-2 z-40 w-64 bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-300 mb-1">New Node</p>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Name</label>
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
                  placeholder="e.g. Funnel Copy"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Type</label>
                <div className="relative">
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as NodeType)}
                    className="w-full appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 outline-none cursor-pointer pr-6"
                  >
                    {NODE_TYPES.map((t) => (
                      <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {members.length > 0 && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Assignee</label>
                  <div className="relative">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 outline-none cursor-pointer pr-6"
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
                </div>
              )}

              <button
                onClick={submit}
                disabled={!name.trim()}
                className={cn(
                  'w-full py-2 rounded-lg text-xs font-semibold transition-colors',
                  name.trim()
                    ? 'bg-[#C8F55A] text-black hover:bg-[#d4f96e]'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                )}
              >
                Create Node
              </button>
            </div>
          </>
        )}
      </div>

      {/* Auto layout */}
      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors shadow"
        title="Auto-arrange nodes"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        Auto Layout
      </button>

      {/* Node count */}
      {nodeCount > 0 && (
        <span className="text-xs text-zinc-600 pl-1">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
