'use client'

import { PIPELINE_STAGES, getStage } from '@/lib/pipeline'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface StatusCellProps {
  status: string
  onSave: (status: string) => void
}

export function StatusCell({ status, onSave }: StatusCellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const stage = getStage(status)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-colors',
          stage.color
        )}
      >
        {stage.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => { onSave(s.id); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-left',
                s.id === status && 'bg-secondary/30'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', s.color.split(' ')[0].replace('text-', 'bg-'))} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
