'use client'

import { useEffect, useRef } from 'react'
import { StickyNote, Link2, FileText, Sparkles } from 'lucide-react'

const ITEMS = [
  { type: 'text_note',    label: 'Text Note',   icon: StickyNote, color: 'text-amber-400' },
  { type: 'url_resource', label: 'URL Resource', icon: Link2,      color: 'text-blue-400' },
  { type: 'file_upload',  label: 'File Upload',  icon: FileText,   color: 'text-emerald-400' },
  { type: 'ai_analysis',  label: 'AI Analysis',  icon: Sparkles,   color: 'text-violet-400' },
]

export function ContextMenu({ x, y, onAdd, onClose }: {
  x: number; y: number
  onAdd: (type: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Clamp to viewport
  const menuW = 180
  const menuH = ITEMS.length * 36 + 12
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 1000 }}
      className="w-44 bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1.5"
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1 mb-0.5">
        Add node
      </p>
      {ITEMS.map(({ type, label, icon: Icon, color }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
        >
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          {label}
        </button>
      ))}
    </div>
  )
}
