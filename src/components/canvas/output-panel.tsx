'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Sparkles, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OutputPanelProps {
  label: string
  output: string
  lastRun?: string
  running: boolean
  onClose: () => void
  onRefine: (additionalInstruction: string) => void
}

export function OutputPanel({ label, output, lastRun, running, onClose, onRefine }: OutputPanelProps) {
  const [copied, setCopied] = useState(false)
  const [moreInstruction, setMoreInstruction] = useState('')
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefine = () => {
    if (!moreInstruction.trim() || running) return
    onRefine(moreInstruction.trim())
    setMoreInstruction('')
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop (semi-transparent, left half) */}
      <div
        className="fixed inset-0 bg-black/20 z-[999]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-1/2 bg-card border-l border-border shadow-2xl z-[1000] flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{label || 'AI Analysis'}</h2>
            {lastRun && (
              <p className="text-xs text-muted-foreground">Last run at {lastRun}</p>
            )}
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              copied
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-secondary hover:bg-secondary/80 text-foreground'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Output scroll area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {running ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span className="text-sm text-muted-foreground">Generating…</span>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{output}</p>
          )}
        </div>

        {/* Refine section */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 space-y-2.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Add more instructions
          </label>
          <textarea
            ref={textareaRef}
            value={moreInstruction}
            onChange={(e) => setMoreInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRefine()
            }}
            placeholder="e.g. Make it shorter, focus on pain point #2, rewrite the headline section…"
            rows={3}
            className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-1 focus:ring-violet-500/40"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">⌘ Enter to run</p>
            <button
              onClick={handleRefine}
              disabled={running || !moreInstruction.trim()}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                running || !moreInstruction.trim()
                  ? 'bg-violet-500/20 text-violet-400/60 cursor-not-allowed'
                  : 'bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/30'
              )}
            >
              {running
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
                : <><Play className="w-3.5 h-3.5" /> Run</>}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
