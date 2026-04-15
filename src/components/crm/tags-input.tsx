'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagsInputProps {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
  className?: string
}

export function TagsInput({ tags, allTags, onChange, className }: TagsInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = input.trim()
    ? allTags.filter(
        (t) =>
          t.toLowerCase().includes(input.toLowerCase()) &&
          !tags.includes(t)
      )
    : []

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5 min-h-8 px-2 py-1.5 rounded-md border border-border bg-background cursor-text',
        focused && 'ring-1 ring-primary/40 border-primary/40',
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <div className="relative flex-1 min-w-[80px]">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setInput('') }}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground py-0.5"
        />

        {focused && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/50 transition-colors"
              >
                {s}
              </button>
            ))}
            {input.trim() && !allTags.includes(input.trim()) && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(input) }}
                className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-secondary/50 transition-colors border-t border-border"
              >
                Create &quot;{input.trim()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
