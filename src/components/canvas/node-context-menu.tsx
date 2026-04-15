'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2, ArrowRight, ArrowLeft, ChevronRight, StickyNote, Link2, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Node as FlowNode } from '@xyflow/react'

interface NodeContextMenuProps {
  x: number
  y: number
  node: FlowNode
  otherNodes: FlowNode[]
  onDelete: () => void
  onConnect: (sourceId: string, targetId: string) => void
  onClose: () => void
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  text_note: StickyNote,
  url_resource: Link2,
  file_upload: FileText,
  ai_analysis: Sparkles,
}

const TYPE_COLORS: Record<string, string> = {
  text_note: 'text-amber-400',
  url_resource: 'text-blue-400',
  file_upload: 'text-emerald-400',
  ai_analysis: 'text-violet-400',
}

function nodeLabel(n: FlowNode): string {
  const d = n.data as Record<string, unknown>
  if (d.label && typeof d.label === 'string') return d.label
  if (d.title && typeof d.title === 'string') return d.title
  if (d.fileName && typeof d.fileName === 'string') return d.fileName as string
  if (d.url && typeof d.url === 'string') return (d.url as string).replace(/^https?:\/\//, '').slice(0, 30)
  const typeLabel: Record<string, string> = {
    text_note: 'Text Note',
    url_resource: 'URL Resource',
    file_upload: 'File Upload',
    ai_analysis: 'AI Analysis',
  }
  return typeLabel[n.type ?? ''] ?? 'Node'
}

function Submenu({
  nodes,
  onSelect,
  label,
  icon: Icon,
  color,
}: {
  nodes: FlowNode[]
  onSelect: (id: string) => void
  label: string
  icon: React.ElementType
  color: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', color)} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && nodes.length > 0 && (
        <div className="absolute left-full top-0 ml-1 w-52 bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1.5 z-50">
          {nodes.map((n) => {
            const NodeIcon = TYPE_ICONS[n.type ?? ''] ?? StickyNote
            const nodeColor = TYPE_COLORS[n.type ?? ''] ?? 'text-muted-foreground'
            return (
              <button
                key={n.id}
                onMouseDown={(e) => { e.stopPropagation(); onSelect(n.id) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
              >
                <NodeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', nodeColor)} />
                <span className="truncate">{nodeLabel(n)}</span>
              </button>
            )
          })}
        </div>
      )}

      {open && nodes.length === 0 && (
        <div className="absolute left-full top-0 ml-1 w-44 bg-card border border-border rounded-xl shadow-2xl py-3 px-3 z-50">
          <p className="text-xs text-muted-foreground">No other nodes on canvas</p>
        </div>
      )}
    </div>
  )
}

export function NodeContextMenu({ x, y, node, otherNodes, onDelete, onConnect, onClose }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Element)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const menuW = 220
  const menuH = 140
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const NodeIcon = TYPE_ICONS[node.type ?? ''] ?? StickyNote
  const nodeColor = TYPE_COLORS[node.type ?? ''] ?? 'text-muted-foreground'

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 1000 }}
      className="w-56 bg-card border border-border rounded-xl shadow-2xl overflow-visible py-1.5"
    >
      {/* Node identity header */}
      <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5 border-b border-border">
        <NodeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', nodeColor)} />
        <span className="text-xs font-medium truncate text-muted-foreground">{nodeLabel(node)}</span>
      </div>

      {/* Connect output → another node */}
      <Submenu
        nodes={otherNodes}
        onSelect={(targetId) => { onConnect(node.id, targetId); onClose() }}
        label="Connect output to…"
        icon={ArrowRight}
        color="text-primary"
      />

      {/* Connect another node → this node */}
      <Submenu
        nodes={otherNodes}
        onSelect={(sourceId) => { onConnect(sourceId, node.id); onClose() }}
        label="Connect input from…"
        icon={ArrowLeft}
        color="text-primary"
      />

      <div className="my-1 border-t border-border" />

      {/* Delete */}
      <button
        onMouseDown={(e) => { e.stopPropagation(); onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
        Delete node
      </button>
    </div>
  )
}
