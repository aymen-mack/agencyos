'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface EditableCellProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  type?: 'text' | 'email' | 'tel'
  bold?: boolean
}

export function EditableCell({ value, onSave, placeholder = '—', className, type = 'text', bold }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        className={cn(
          'w-full bg-secondary border border-primary/40 rounded px-2 py-0.5 text-sm text-foreground outline-none',
          bold && 'font-medium',
          className
        )}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'block cursor-pointer px-2 py-0.5 rounded hover:bg-secondary/60 transition-colors text-sm',
        bold && 'font-medium',
        !value && 'text-muted-foreground',
        className
      )}
    >
      {value || placeholder}
    </span>
  )
}
