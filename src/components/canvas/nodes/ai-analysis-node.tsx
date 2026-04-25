'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { Sparkles, Play, Loader2, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CANVAS_SKILLS } from '@/lib/canvas-skills'
import { OutputPanel } from '../output-panel'
import type { TextNoteData } from './text-note-node'
import type { URLResourceData } from './url-resource-node'
import type { FileUploadData } from './file-upload-node'

export type AIAnalysisData = {
  label?: string
  instruction?: string
  skillId?: string
  output?: string
  lastRun?: string
  onUpdate?: (id: string, patch: { content?: string; node_config?: Record<string, unknown> }) => void
}

export const AIAnalysisNode = memo(function AIAnalysisNode({ id, data }: NodeProps) {
  const d = data as AIAnalysisData
  const { getNodes, getEdges } = useReactFlow()
  const [instruction, setInstruction] = useState(d.instruction || '')
  const [skillId, setSkillId] = useState(d.skillId || '')
  const [output, setOutput] = useState(d.output || '')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [outputOpen, setOutputOpen] = useState(!!d.output)
  const [panelOpen, setPanelOpen] = useState(false)
  const [label, setLabel] = useState(d.label || '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveInstruction = useCallback((val: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      d.onUpdate?.(id, { node_config: { instruction: val, skillId, label, lastRun: d.lastRun } })
    }, 600)
  }, [id, d, skillId, label])

  const saveLabel = useCallback((val: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      d.onUpdate?.(id, { node_config: { instruction, skillId, label: val, lastRun: d.lastRun } })
    }, 600)
  }, [id, d, instruction, skillId])

  const handleSkillChange = useCallback((val: string) => {
    setSkillId(val)
    d.onUpdate?.(id, { node_config: { instruction, skillId: val, label, lastRun: d.lastRun } })
  }, [id, d, instruction, label])

  const runAnalysis = useCallback(async (overrideInstruction?: string) => {
    const activeInstruction = overrideInstruction
      ? `${instruction.trim()}\n\nAdditional instruction: ${overrideInstruction}`
      : instruction
    if (!activeInstruction.trim()) { setError('Add an instruction first'); return }
    setRunning(true)
    setError('')

    // Collect content from all connected input nodes
    const edges = getEdges()
    const nodes = getNodes()
    const inputNodeIds = edges.filter((e) => e.target === id).map((e) => e.source)
    const inputNodes = nodes.filter((n) => inputNodeIds.includes(n.id))

    const inputs = inputNodes.map((node) => {
      const nodeData = node.data as TextNoteData & URLResourceData & FileUploadData & AIAnalysisData
      let content = ''
      if (node.type === 'text_note') content = nodeData.content || ''
      else if (node.type === 'url_resource') content = nodeData.content || nodeData.url || ''
      else if (node.type === 'file_upload') content = nodeData.content || ''
      else if (node.type === 'ai_analysis') content = nodeData.output || nodeData.content || ''
      return {
        type: node.type || 'unknown',
        label: (nodeData.label || nodeData.title || nodeData.fileName) as string | undefined,
        content,
      }
    })

    try {
      const res = await fetch(`/api/canvas/nodes/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: activeInstruction, inputs, skillId: skillId || null }),
      })
      let json: Record<string, string> = {}
      try { json = await res.json() } catch {
        throw new Error(res.status === 500
          ? 'Server error — make sure ANTHROPIC_API_KEY is set in Vercel environment variables'
          : `Server returned ${res.status}`)
      }
      if (!res.ok) throw new Error(json.error || 'Run failed')

      const now = new Date().toLocaleTimeString()
      setOutput(json.output)
      setOutputOpen(true)
      d.onUpdate?.(id, {
        content: json.output,
        node_config: { instruction, skillId, label, lastRun: now },
      })
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }, [id, instruction, skillId, label, d, getEdges, getNodes])

  return (
    <div className="w-96 bg-violet-950/30 border border-violet-500/30 rounded-xl shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-violet-400/60 !border-violet-400 !w-3 !h-3" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-500/20 bg-violet-500/10">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        <input
          value={label}
          onChange={(e) => { setLabel(e.target.value); saveLabel(e.target.value) }}
          placeholder="AI Analysis"
          className="flex-1 bg-transparent text-xs font-medium text-violet-300 placeholder:text-violet-400/50 outline-none nodrag"
        />
        <button
          onClick={() => runAnalysis()}
          disabled={running || !instruction.trim()}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all nodrag',
            running
              ? 'bg-violet-500/20 text-violet-400/60 cursor-not-allowed'
              : 'bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/30'
          )}
        >
          {running
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
            : <><Play className="w-3 h-3" /> Run</>}
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Skill selector */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
            Skill
          </label>
          <select
            value={skillId}
            onChange={(e) => handleSkillChange(e.target.value)}
            className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-violet-500/40 nodrag appearance-none cursor-pointer"
          >
            <option value="">Default (Marketing Strategist)</option>
            {CANVAS_SKILLS.map((skill) => (
              <option key={skill.id} value={skill.id}>{skill.name}</option>
            ))}
          </select>
          {skillId && (
            <p className="text-[10px] text-violet-400/60 mt-0.5 px-0.5">
              {CANVAS_SKILLS.find((s) => s.id === skillId)?.description}
            </p>
          )}
        </div>

        {/* Instruction */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
            Instruction
          </label>
          <textarea
            value={instruction}
            onChange={(e) => { setInstruction(e.target.value); saveInstruction(e.target.value) }}
            placeholder="e.g. Analyze the audience based on the connected resources and identify their top 3 pain points…"
            rows={3}
            className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-2 text-xs placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-1 focus:ring-violet-500/40 nodrag"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive px-1">{error}</p>
        )}

        {/* Output */}
        {output && (
          <div className="rounded-lg border border-violet-500/20 overflow-hidden">
            <div className="flex items-center bg-violet-500/10 border-b border-violet-500/10">
              <button
                onClick={() => setOutputOpen((v) => !v)}
                className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/10 transition-colors nodrag"
              >
                <Sparkles className="w-3 h-3" />
                Output {d.lastRun && <span className="text-violet-400/50 font-normal">· {d.lastRun}</span>}
                <span className="ml-auto">
                  {outputOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
              <button
                onClick={() => setPanelOpen(true)}
                title="Expand output"
                className="px-2 py-1.5 text-violet-400/60 hover:text-violet-300 hover:bg-violet-500/10 transition-colors nodrag border-l border-violet-500/10"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {outputOpen && (
              <div className="p-2.5 max-h-48 overflow-y-auto nowheel nodrag">
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{output}</p>
              </div>
            )}
          </div>
        )}

        {panelOpen && (
          <OutputPanel
            label={label || 'AI Analysis'}
            output={output}
            lastRun={d.lastRun}
            running={running}
            onClose={() => setPanelOpen(false)}
            onRefine={(additionalInstruction) => runAnalysis(additionalInstruction)}
          />
        )}

        {running && !output && (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            <span className="text-xs text-muted-foreground">Generating…</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-violet-400/60 !border-violet-400 !w-3 !h-3" />
    </div>
  )
})
