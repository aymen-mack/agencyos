'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Link2, Loader2, RefreshCw, ExternalLink } from 'lucide-react'

export type URLResourceData = {
  url?: string
  title?: string
  description?: string
  content?: string
  fetchStatus?: 'idle' | 'loading' | 'done' | 'error'
  errorMsg?: string
  onUpdate?: (id: string, patch: { content?: string; node_config?: Record<string, unknown> }) => void
}

export const URLResourceNode = memo(function URLResourceNode({ id, data }: NodeProps) {
  const d = data as URLResourceData
  const [url, setUrl] = useState(d.url || '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(d.fetchStatus || 'idle')
  const [title, setTitle] = useState(d.title || '')
  const [description, setDescription] = useState(d.description || '')
  const [errorMsg, setErrorMsg] = useState(d.errorMsg || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchUrl = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/canvas/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Fetch failed')
      setTitle(json.title || targetUrl)
      setDescription(json.description || '')
      setStatus('done')
      d.onUpdate?.(id, {
        content: json.content,
        node_config: { url: targetUrl, title: json.title, description: json.description, fetchStatus: 'done' },
      })
    } catch (e) {
      setStatus('error')
      setErrorMsg(String(e))
      d.onUpdate?.(id, { node_config: { url: targetUrl, fetchStatus: 'error', errorMsg: String(e) } })
    }
  }, [id, d])

  return (
    <div className="w-80 bg-blue-950/30 border border-blue-500/30 rounded-xl shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-blue-400/60 !border-blue-400 !w-3 !h-3" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/20 bg-blue-500/10">
        <Link2 className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-blue-300">URL Resource</span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUrl(url)}
            placeholder="https://example.com"
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/40 nodrag"
          />
          <button
            onClick={() => fetchUrl(url)}
            disabled={status === 'loading' || !url.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors disabled:opacity-40 nodrag"
          >
            {status === 'loading'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : status === 'done'
              ? <RefreshCw className="w-3.5 h-3.5" />
              : 'Fetch'}
          </button>
        </div>

        {status === 'done' && title && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 space-y-1">
            <div className="flex items-start gap-1.5">
              <a href={url} target="_blank" rel="noopener noreferrer" className="nodrag">
                <ExternalLink className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
              </a>
              <p className="text-xs font-medium text-blue-200 leading-tight">{title}</p>
            </div>
            {description && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60">Content fetched ✓</p>
          </div>
        )}

        {status === 'error' && (
          <p className="text-xs text-destructive">{errorMsg || 'Failed to fetch URL'}</p>
        )}

        {status === 'idle' && (
          <p className="text-[11px] text-muted-foreground/60">Paste a URL and click Fetch to extract content</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-blue-400/60 !border-blue-400 !w-3 !h-3" />
    </div>
  )
})
