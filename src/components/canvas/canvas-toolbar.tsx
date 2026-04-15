'use client'

import { StickyNote, Link2, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NODES = [
  { type: 'text_note',    label: 'Text Note',    icon: StickyNote, color: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40' },
  { type: 'url_resource', label: 'URL',          icon: Link2,      color: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40' },
  { type: 'file_upload',  label: 'File',         icon: FileText,   color: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' },
  { type: 'ai_analysis',  label: 'AI Analysis',  icon: Sparkles,   color: 'text-violet-400 hover:bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40' },
]

export function CanvasToolbar({ onAddNode }: { onAddNode: (type: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-card/90 backdrop-blur border border-border shadow-xl">
      <span className="text-[10px] font-medium text-muted-foreground px-1.5 uppercase tracking-wider">Add</span>
      <div className="w-px h-4 bg-border" />
      {NODES.map(({ type, label, icon: Icon, color }) => (
        <button
          key={type}
          onClick={() => onAddNode(type)}
          title={`Add ${label}`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
            color
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
