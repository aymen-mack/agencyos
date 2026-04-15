'use client'

import { useState } from 'react'
import { PIPELINE_STAGES } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Tag, X } from 'lucide-react'

interface BulkActionsBarProps {
  count: number
  allTags: string[]
  onBulkAction: (action: string, data?: Record<string, unknown>) => void
  onClear: () => void
}

export function BulkActionsBar({ count, allTags, onBulkAction, onClear }: BulkActionsBarProps) {
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/20 flex-shrink-0">
      <span className="text-xs font-medium text-primary">{count} selected</span>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Change status */}
      <Select onValueChange={(v) => onBulkAction('update_status', { status: v })}>
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue placeholder="Set stage..." />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_STAGES.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Add tag */}
      {showTagInput ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                onBulkAction('add_tag', { tag: tagInput.trim() })
                setTagInput('')
                setShowTagInput(false)
              }
              if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') }
            }}
            placeholder="Tag name..."
            list="bulk-tag-suggestions"
            className="h-7 px-2 text-xs rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40 w-32"
          />
          <datalist id="bulk-tag-suggestions">
            {allTags.map((t) => <option key={t} value={t} />)}
          </datalist>
          <Button
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => {
              if (tagInput.trim()) {
                onBulkAction('add_tag', { tag: tagInput.trim() })
                setTagInput('')
                setShowTagInput(false)
              }
            }}
          >
            Add
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => { setShowTagInput(false); setTagInput('') }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowTagInput(true)}>
          <Tag className="w-3.5 h-3.5" />
          Add Tag
        </Button>
      )}

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
        onClick={() => {
          if (confirm(`Delete ${count} leads?`)) onBulkAction('delete')
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </Button>

      <Button variant="ghost" size="sm" className="h-7 px-1.5 ml-auto" onClick={onClear}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
