'use client'

import { memo, useCallback, useRef } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { StickyNote } from 'lucide-react'

export type TextNoteData = {
  label?: string
  content?: string
  onUpdate?: (id: string, patch: { content?: string; node_config?: Record<string, unknown> }) => void
}

export const TextNoteNode = memo(function TextNoteNode({ id, data }: NodeProps) {
  const d = data as TextNoteData
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      d.onUpdate?.(id, { content: e.target.value })
    }, 600)
  }, [id, d])

  return (
    <div className="w-72 bg-amber-950/30 border border-amber-500/30 rounded-xl shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-amber-400/60 !border-amber-400 !w-3 !h-3" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20 bg-amber-500/10">
        <StickyNote className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-amber-300">Text Note</span>
      </div>

      <textarea
        defaultValue={d.content || ''}
        onChange={handleChange}
        placeholder="Type your note here..."
        rows={6}
        className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none nodrag"
      />

      <Handle type="source" position={Position.Right} className="!bg-amber-400/60 !border-amber-400 !w-3 !h-3" />
    </div>
  )
})
