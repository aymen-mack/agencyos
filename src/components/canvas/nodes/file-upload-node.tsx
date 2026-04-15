'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FileText, Upload, X } from 'lucide-react'

export type FileUploadData = {
  fileName?: string
  fileSize?: number
  content?: string
  onUpdate?: (id: string, patch: { content?: string; node_config?: Record<string, unknown> }) => void
}

export const FileUploadNode = memo(function FileUploadNode({ id, data }: NodeProps) {
  const d = data as FileUploadData
  const [fileName, setFileName] = useState(d.fileName || '')
  const [content, setContent] = useState(d.content || '')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setFileName(file.name)
    try {
      let text = ''
      if (file.type === 'application/pdf') {
        // Send to server for extraction
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/canvas/extract-file', { method: 'POST', body: form })
        const json = await res.json()
        text = json.text || `[PDF: ${file.name} — content extraction unavailable]`
      } else {
        // Read as text (works for .txt, .md, .csv, transcripts, etc.)
        text = await file.text()
      }
      setContent(text)
      d.onUpdate?.(id, {
        content: text,
        node_config: { fileName: file.name, fileSize: file.size, fileType: file.type },
      })
    } catch {
      setContent(`[Error reading ${file.name}]`)
    } finally {
      setLoading(false)
    }
  }, [id, d])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clear = useCallback(() => {
    setFileName('')
    setContent('')
    d.onUpdate?.(id, { content: undefined, node_config: { fileName: undefined } })
  }, [id, d])

  return (
    <div className="w-72 bg-emerald-950/30 border border-emerald-500/30 rounded-xl shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-emerald-400/60 !border-emerald-400 !w-3 !h-3" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/20 bg-emerald-500/10">
        <FileText className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-300">File Upload</span>
      </div>

      <div className="p-3">
        {!fileName ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-emerald-500/30 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors nodrag"
          >
            <Upload className="w-5 h-5 text-emerald-400/60 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">Drop a file or click to upload</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">.txt .md .pdf transcripts</p>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.pdf,.csv,.json,.js,.ts,.py,.html,.xml,.srt,.vtt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-medium text-emerald-300 truncate flex-1">{fileName}</span>
              <button onClick={clear} className="text-muted-foreground hover:text-foreground nodrag">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-2">Reading file...</p>
            ) : content ? (
              <div className="rounded-lg bg-secondary/30 p-2 max-h-28 overflow-y-auto nodrag">
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {content.slice(0, 500)}{content.length > 500 ? '…' : ''}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-emerald-400/60 !border-emerald-400 !w-3 !h-3" />
    </div>
  )
})
